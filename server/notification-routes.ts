import { Express, Request, Response } from 'express';
import { pool } from './db';
import { 
  sendRegistrationConfirmationEmail, 
  sendSlotBookingConfirmationEmail,
  sendSlotCancellationEmail,
  sendCampUpdateEmail,
  sendWaitlistNotificationEmail
} from './email-service';

// Define interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    organizationId?: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Utility function to check if user has permission to manage camp
 */
async function userCanManageCamp(userId: number, campId: number): Promise<boolean> {
  try {
    // Check if user is camp creator or admin
    const query = `
      SELECT c.id
      FROM camps c
      WHERE c.id = $1 AND (c.creator_id = $2 OR EXISTS (
        SELECT 1 FROM camp_staff cs 
        WHERE cs.camp_id = c.id AND cs.user_id = $2 AND cs.role IN ('admin', 'coach')
      ))
    `;
    
    const result = await pool.query(query, [campId, userId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error checking camp management permission:', error);
    return false;
  }
}

/**
 * Register notification related routes
 */
export default function registerNotificationRoutes(app: Express) {
  
  // Get parent's email by parentId
  async function getParentEmail(parentId: number): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT email FROM users WHERE id = $1',
        [parentId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].email;
    } catch (error) {
      console.error('Error fetching parent email:', error);
      return null;
    }
  }
  
  // Get parent's name by parentId
  async function getParentName(parentId: number): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [parentId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const { first_name, last_name } = result.rows[0];
      return `${first_name || ''} ${last_name || ''}`.trim();
    } catch (error) {
      console.error('Error fetching parent name:', error);
      return null;
    }
  }
  
  // Get child's name by childId
  async function getChildName(childId: number): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT full_name FROM children WHERE id = $1',
        [childId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].full_name;
    } catch (error) {
      console.error('Error fetching child name:', error);
      return null;
    }
  }
  
  // Get camp details by campId
  async function getCampDetails(campId: number): Promise<any | null> {
    try {
      const result = await pool.query(
        `SELECT 
          c.id, c.name, c.start_date, c.end_date, c.description,
          c.is_virtual, c.street_address, c.city, c.state, c.zip_code
        FROM camps c
        WHERE c.id = $1`,
        [campId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching camp details:', error);
      return null;
    }
  }
  
  // Get availability slot details
  async function getSlotDetails(slotId: number): Promise<any | null> {
    try {
      const result = await pool.query(
        `SELECT 
          s.id, s.camp_id, s.slot_date, s.start_time, s.end_time, 
          s.max_bookings, s.current_bookings, s.status,
          c.name as camp_name
        FROM availability_slots s
        JOIN camps c ON s.camp_id = c.id
        WHERE s.id = $1`,
        [slotId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching slot details:', error);
      return null;
    }
  }
  
  /**
   * Send registration confirmation notification
   * POST /api/notifications/send-registration-confirmation
   */
  app.post('/api/notifications/send-registration-confirmation', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { registrationId } = req.body;
      
      if (!registrationId) {
        return res.status(400).json({ error: 'Registration ID is required' });
      }
      
      // Only camp creators, admins, and the parent of the registered child can send this
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get registration details
      const regResult = await pool.query(
        `SELECT r.id, r.camp_id, r.child_id, r.parent_id, r.status, c.name as camp_name, 
         c.start_date, c.end_date, c.is_virtual, c.city, c.state, c.street_address
         FROM registrations r
         JOIN camps c ON r.camp_id = c.id
         WHERE r.id = $1`,
        [registrationId]
      );
      
      if (regResult.rows.length === 0) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      
      const registration = regResult.rows[0];
      
      // Check permission - only parent or camp admin/creator can send
      const isParent = req.user.id === registration.parent_id;
      const canManageCamp = await userCanManageCamp(req.user.id, registration.camp_id);
      
      if (!isParent && !canManageCamp && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Get parent email
      const parentEmail = await getParentEmail(registration.parent_id);
      if (!parentEmail) {
        return res.status(404).json({ error: 'Parent email not found' });
      }
      
      // Get parent and child names
      const parentName = await getParentName(registration.parent_id) || 'Parent';
      const childName = await getChildName(registration.child_id) || 'Child';
      
      // Create location string
      let location = registration.is_virtual ? 'Virtual Camp' : '';
      if (!registration.is_virtual && registration.street_address) {
        location = `${registration.street_address}, ${registration.city}, ${registration.state}`;
      } else if (!registration.is_virtual) {
        location = `${registration.city}, ${registration.state}`;
      }
      
      // Check if this is an availability-based camp and get slots
      const campDetails = await getCampDetails(registration.camp_id);
      let slots = [];
      
      if (campDetails && campDetails.scheduling_type === 'availability') {
        // Get booked slots for this registration
        const slotsResult = await pool.query(
          `SELECT 
            s.id, s.slot_date, s.start_time, s.end_time
           FROM slot_bookings sb
           JOIN availability_slots s ON sb.slot_id = s.id
           WHERE sb.child_id = $1 AND s.camp_id = $2`,
          [registration.child_id, registration.camp_id]
        );
        
        slots = slotsResult.rows.map(slot => ({
          date: slot.slot_date,
          startTime: slot.start_time,
          endTime: slot.end_time
        }));
      }
      
      // Send the email
      const emailResult = await sendRegistrationConfirmationEmail(
        parentEmail,
        parentName,
        childName,
        {
          name: registration.camp_name,
          startDate: registration.start_date,
          endDate: registration.end_date,
          location: location,
          slots: slots.length > 0 ? slots : undefined
        }
      );
      
      if (!emailResult.success) {
        console.error('Failed to send registration confirmation email:', emailResult.error);
        return res.status(500).json({ 
          error: 'Failed to send notification', 
          details: emailResult.error 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Registration confirmation sent', 
        emailId: emailResult.id 
      });
      
    } catch (error) {
      console.error('Error sending registration confirmation notification:', error);
      return res.status(500).json({ error: 'Server error', details: error });
    }
  });
  
  /**
   * Send slot booking confirmation notification
   * POST /api/notifications/send-slot-booking-confirmation
   */
  app.post('/api/notifications/send-slot-booking-confirmation', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bookingId } = req.body;
      
      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }
      
      // Only camp creators, admins, and the parent of the registered child can send this
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get booking details
      const bookingResult = await pool.query(
        `SELECT sb.id, sb.slot_id, sb.child_id, sb.parent_id, sb.status,
                s.camp_id, s.slot_date, s.start_time, s.end_time,
                c.name as camp_name
         FROM slot_bookings sb
         JOIN availability_slots s ON sb.slot_id = s.id
         JOIN camps c ON s.camp_id = c.id
         WHERE sb.id = $1`,
        [bookingId]
      );
      
      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      const booking = bookingResult.rows[0];
      
      // Check permission - only parent or camp admin/creator can send
      const isParent = req.user.id === booking.parent_id;
      const canManageCamp = await userCanManageCamp(req.user.id, booking.camp_id);
      
      if (!isParent && !canManageCamp && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Get parent email
      const parentEmail = await getParentEmail(booking.parent_id);
      if (!parentEmail) {
        return res.status(404).json({ error: 'Parent email not found' });
      }
      
      // Get parent and child names
      const parentName = await getParentName(booking.parent_id) || 'Parent';
      const childName = await getChildName(booking.child_id) || 'Child';
      
      // Send the email
      const emailResult = await sendSlotBookingConfirmationEmail(
        parentEmail,
        parentName,
        childName,
        booking.camp_name,
        booking.slot_date,
        booking.start_time,
        booking.end_time
      );
      
      if (!emailResult.success) {
        console.error('Failed to send slot booking confirmation email:', emailResult.error);
        return res.status(500).json({ 
          error: 'Failed to send notification', 
          details: emailResult.error 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Slot booking confirmation sent', 
        emailId: emailResult.id 
      });
      
    } catch (error) {
      console.error('Error sending slot booking confirmation notification:', error);
      return res.status(500).json({ error: 'Server error', details: error });
    }
  });
  
  /**
   * Send camp update notification to all registered participants
   * POST /api/notifications/send-camp-update
   */
  app.post('/api/notifications/send-camp-update', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        campId, 
        updateType,
        updateDetails,
        originalDetails,
        newDetails
      } = req.body;
      
      if (!campId || !updateType || !updateDetails) {
        return res.status(400).json({ 
          error: 'Camp ID, update type, and update details are required' 
        });
      }
      
      // Only camp creators and admins can send updates
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const canManageCamp = await userCanManageCamp(req.user.id, campId);
      if (!canManageCamp && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Get camp details
      const campDetails = await getCampDetails(campId);
      if (!campDetails) {
        return res.status(404).json({ error: 'Camp not found' });
      }
      
      // Get all registrations for this camp
      const registrationsResult = await pool.query(
        `SELECT r.id, r.child_id, r.parent_id
         FROM registrations r
         WHERE r.camp_id = $1 AND r.status != 'cancelled'`,
        [campId]
      );
      
      if (registrationsResult.rows.length === 0) {
        return res.status(404).json({ error: 'No active registrations found for this camp' });
      }
      
      // Send emails to all registered parents
      const results = [];
      const errors = [];
      
      for (const registration of registrationsResult.rows) {
        // Get parent email
        const parentEmail = await getParentEmail(registration.parent_id);
        if (!parentEmail) {
          errors.push({
            registrationId: registration.id,
            error: 'Parent email not found'
          });
          continue;
        }
        
        // Get parent and child names
        const parentName = await getParentName(registration.parent_id) || 'Parent';
        const childName = await getChildName(registration.child_id) || 'Child';
        
        // Send the email
        const emailResult = await sendCampUpdateEmail(
          parentEmail,
          parentName,
          childName,
          campDetails.name,
          updateType,
          updateDetails,
          originalDetails,
          newDetails
        );
        
        if (emailResult.success) {
          results.push({
            registrationId: registration.id,
            emailId: emailResult.id
          });
        } else {
          errors.push({
            registrationId: registration.id,
            error: emailResult.error
          });
        }
      }
      
      return res.status(200).json({ 
        success: true, 
        message: `Camp update sent to ${results.length} recipients`, 
        successful: results, 
        failed: errors
      });
      
    } catch (error) {
      console.error('Error sending camp update notification:', error);
      return res.status(500).json({ error: 'Server error', details: error });
    }
  });
  
  /**
   * Send waitlist notification
   * POST /api/notifications/send-waitlist-notification
   */
  app.post('/api/notifications/send-waitlist-notification', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        registrationId, 
        status,
        expirationTime
      } = req.body;
      
      if (!registrationId || !status) {
        return res.status(400).json({ 
          error: 'Registration ID and status are required' 
        });
      }
      
      if (!['added', 'spot_available'].includes(status)) {
        return res.status(400).json({ 
          error: 'Status must be either "added" or "spot_available"' 
        });
      }
      
      // Only camp creators and admins can send waitlist notifications
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get registration details
      const regResult = await pool.query(
        `SELECT r.id, r.camp_id, r.child_id, r.parent_id, r.status, c.name as camp_name
         FROM registrations r
         JOIN camps c ON r.camp_id = c.id
         WHERE r.id = $1`,
        [registrationId]
      );
      
      if (regResult.rows.length === 0) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      
      const registration = regResult.rows[0];
      
      // Check permission
      const canManageCamp = await userCanManageCamp(req.user.id, registration.camp_id);
      if (!canManageCamp && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Get parent email
      const parentEmail = await getParentEmail(registration.parent_id);
      if (!parentEmail) {
        return res.status(404).json({ error: 'Parent email not found' });
      }
      
      // Get parent and child names
      const parentName = await getParentName(registration.parent_id) || 'Parent';
      const childName = await getChildName(registration.child_id) || 'Child';
      
      // Send the email
      const emailResult = await sendWaitlistNotificationEmail(
        parentEmail,
        parentName,
        childName,
        registration.camp_name,
        status,
        expirationTime
      );
      
      if (!emailResult.success) {
        console.error('Failed to send waitlist notification email:', emailResult.error);
        return res.status(500).json({ 
          error: 'Failed to send notification', 
          details: emailResult.error 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Waitlist notification sent', 
        emailId: emailResult.id 
      });
      
    } catch (error) {
      console.error('Error sending waitlist notification:', error);
      return res.status(500).json({ error: 'Server error', details: error });
    }
  });
  
  /**
   * Send slot cancellation notification
   * POST /api/notifications/send-slot-cancellation
   */
  app.post('/api/notifications/send-slot-cancellation', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bookingId } = req.body;
      
      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }
      
      // Only camp creators, admins, and the parent of the registered child can send this
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get booking details
      const bookingResult = await pool.query(
        `SELECT sb.id, sb.slot_id, sb.child_id, sb.parent_id, sb.status,
                s.camp_id, s.slot_date, s.start_time, s.end_time,
                c.name as camp_name
         FROM slot_bookings sb
         JOIN availability_slots s ON sb.slot_id = s.id
         JOIN camps c ON s.camp_id = c.id
         WHERE sb.id = $1`,
        [bookingId]
      );
      
      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      const booking = bookingResult.rows[0];
      
      // Check permission - only parent or camp admin/creator can send
      const isParent = req.user.id === booking.parent_id;
      const canManageCamp = await userCanManageCamp(req.user.id, booking.camp_id);
      
      if (!isParent && !canManageCamp && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Get parent email
      const parentEmail = await getParentEmail(booking.parent_id);
      if (!parentEmail) {
        return res.status(404).json({ error: 'Parent email not found' });
      }
      
      // Get parent and child names
      const parentName = await getParentName(booking.parent_id) || 'Parent';
      const childName = await getChildName(booking.child_id) || 'Child';
      
      // Send the email
      const emailResult = await sendSlotCancellationEmail(
        parentEmail,
        parentName,
        childName,
        booking.camp_name,
        booking.slot_date,
        booking.start_time,
        booking.end_time
      );
      
      if (!emailResult.success) {
        console.error('Failed to send slot cancellation email:', emailResult.error);
        return res.status(500).json({ 
          error: 'Failed to send notification', 
          details: emailResult.error 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Slot cancellation notification sent', 
        emailId: emailResult.id 
      });
      
    } catch (error) {
      console.error('Error sending slot cancellation notification:', error);
      return res.status(500).json({ error: 'Server error', details: error });
    }
  });
  
  console.log('[express] Notification routes registered');
}