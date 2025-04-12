import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender email (should be a verified domain in your Resend account)
const DEFAULT_FROM_EMAIL = 'notifications@sportsassist.io';

/**
 * Email notification types for tracking and management
 */
export enum NotificationType {
  REGISTRATION_CONFIRMATION = 'registration_confirmation',
  CAMP_UPDATE = 'camp_update',
  SLOT_BOOKING_CONFIRMATION = 'slot_booking_confirmation',
  SLOT_CANCELLATION = 'slot_cancellation',
  SLOT_CHANGE = 'slot_change',
  WAITLIST_NOTIFICATION = 'waitlist_notification',
  REMINDER = 'reminder'
}

/**
 * Template data interface for registration confirmation emails
 */
interface RegistrationConfirmationData {
  parentName: string;
  childName: string;
  campName: string;
  campStartDate: string;
  campEndDate: string;
  campLocation: string;
  slots?: {
    date: string;
    startTime: string;
    endTime: string;
  }[];
}

/**
 * Template data interface for camp update emails
 */
interface CampUpdateData {
  parentName: string;
  childName: string;
  campName: string;
  updateType: 'cancellation' | 'date_change' | 'location_change' | 'general_update';
  updateDetails: string;
  originalDetails?: string;
  newDetails?: string;
}

/**
 * Template data interface for slot-related emails
 */
interface SlotNotificationData {
  parentName: string;
  childName: string;
  campName: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  action?: 'booked' | 'cancelled' | 'changed' | 'reminder';
  newSlotDate?: string;
  newSlotStartTime?: string;
  newSlotEndTime?: string;
}

/**
 * Template data interface for waitlist notifications
 */
interface WaitlistNotificationData {
  parentName: string;
  childName: string;
  campName: string;
  status: 'added' | 'spot_available';
  expirationTime?: string; // Time the spot will expire if not claimed
}

// Union type for all notification data types
type NotificationData = 
  | RegistrationConfirmationData 
  | CampUpdateData 
  | SlotNotificationData 
  | WaitlistNotificationData;

/**
 * Formats a date for display in emails
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric', 
    year: 'numeric'
  });
}

/**
 * Formats a time for display in emails
 */
function formatTime(timeString: string): string {
  // Convert "HH:MM:SS" format to "h:MM AM/PM"
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${formattedHour}:${minutes} ${ampm}`;
}

/**
 * Generates HTML content for registration confirmation emails
 */
function generateRegistrationConfirmationEmail(data: RegistrationConfirmationData): string {
  const { parentName, childName, campName, campStartDate, campEndDate, campLocation, slots } = data;
  
  let slotsHtml = '';
  if (slots && slots.length > 0) {
    slotsHtml = `
      <h3 style="margin-top: 20px; color: #333;">Registered Time Slots</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Time</th>
        </tr>
        ${slots.map(slot => `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${slot.date}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${slot.startTime} - ${slot.endTime}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Registration Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f7f7f7; padding: 20px; border-radius: 5px; border-top: 4px solid #4a76a8;">
        <h1 style="color: #4a76a8; margin-top: 0;">Registration Confirmed!</h1>
        <p>Hello ${parentName},</p>
        <p>Thank you for registering ${childName} for <strong>${campName}</strong>. The registration has been confirmed!</p>
        
        <h3 style="margin-top: 20px; color: #333;">Camp Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 120px;">Camp Name:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${campName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Dates:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${campStartDate} to ${campEndDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Location:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${campLocation}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Participant:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${childName}</td>
          </tr>
        </table>
        
        ${slotsHtml}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>You can view your registration details and make changes by logging into your parent dashboard on SportsAssist.io.</p>
          <p>If you have any questions, please contact the camp organizer or reply to this email.</p>
        </div>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>This is an automated message from SportsAssist.io. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates HTML content for camp update emails
 */
function generateCampUpdateEmail(data: CampUpdateData): string {
  const { parentName, childName, campName, updateType, updateDetails, originalDetails, newDetails } = data;
  
  let updateTypeText = 'Update';
  let updateColor = '#4a76a8';
  
  switch (updateType) {
    case 'cancellation':
      updateTypeText = 'Cancellation';
      updateColor = '#e74c3c';
      break;
    case 'date_change':
      updateTypeText = 'Date Change';
      updateColor = '#f39c12';
      break;
    case 'location_change':
      updateTypeText = 'Location Change';
      updateColor = '#f39c12';
      break;
    case 'general_update':
      updateTypeText = 'Important Update';
      updateColor = '#4a76a8';
      break;
  }
  
  let changeDetails = '';
  if (originalDetails && newDetails) {
    changeDetails = `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Original:</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${originalDetails}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">New:</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${newDetails}</td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Camp Update - ${updateTypeText}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f7f7f7; padding: 20px; border-radius: 5px; border-top: 4px solid ${updateColor};">
        <h1 style="color: ${updateColor}; margin-top: 0;">Camp ${updateTypeText}</h1>
        <p>Hello ${parentName},</p>
        <p>There has been an important update regarding <strong>${campName}</strong> that ${childName} is registered for.</p>
        
        <h3 style="margin-top: 20px; color: #333;">Update Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 120px;">Camp Name:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${campName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Update Type:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${updateTypeText}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Details:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${updateDetails}</td>
          </tr>
          ${changeDetails}
        </table>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>You can view more details by logging into your parent dashboard on SportsAssist.io.</p>
          <p>If you have any questions, please contact the camp organizer.</p>
        </div>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>This is an automated message from SportsAssist.io. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates HTML content for slot notification emails
 */
function generateSlotNotificationEmail(data: SlotNotificationData): string {
  const { parentName, childName, campName, slotDate, slotStartTime, slotEndTime, 
    action, newSlotDate, newSlotStartTime, newSlotEndTime } = data;
  
  let titleText = 'Time Slot Update';
  let actionText = '';
  let titleColor = '#4a76a8';
  
  switch (action) {
    case 'booked':
      titleText = 'Time Slot Booking Confirmation';
      actionText = 'booked';
      titleColor = '#27ae60';
      break;
    case 'cancelled':
      titleText = 'Time Slot Cancellation';
      actionText = 'cancelled';
      titleColor = '#e74c3c';
      break;
    case 'changed':
      titleText = 'Time Slot Change';
      actionText = 'changed';
      titleColor = '#f39c12';
      break;
    case 'reminder':
      titleText = 'Time Slot Reminder';
      actionText = 'upcoming';
      titleColor = '#3498db';
      break;
  }
  
  let changeDetails = '';
  if (action === 'changed' && newSlotDate && newSlotStartTime && newSlotEndTime) {
    changeDetails = `
      <h3 style="margin-top: 20px; color: #333;">New Time Slot Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 120px;">Date:</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${newSlotDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Time:</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${newSlotStartTime} - ${newSlotEndTime}</td>
        </tr>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${titleText}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f7f7f7; padding: 20px; border-radius: 5px; border-top: 4px solid ${titleColor};">
        <h1 style="color: ${titleColor}; margin-top: 0;">${titleText}</h1>
        <p>Hello ${parentName},</p>
        <p>This is a notification about an ${actionText} time slot for ${childName} at <strong>${campName}</strong>.</p>
        
        <h3 style="margin-top: 20px; color: #333;">Time Slot Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 120px;">Camp Name:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${campName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Participant:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${childName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Date:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${slotDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Time:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${slotStartTime} - ${slotEndTime}</td>
          </tr>
        </table>
        
        ${changeDetails}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>You can view all your scheduled time slots by logging into your parent dashboard on SportsAssist.io.</p>
          <p>If you have any questions, please contact the camp organizer.</p>
        </div>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>This is an automated message from SportsAssist.io. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates HTML content for waitlist notification emails
 */
function generateWaitlistNotificationEmail(data: WaitlistNotificationData): string {
  const { parentName, childName, campName, status, expirationTime } = data;
  
  let titleText = 'Waitlist Update';
  let statusText = '';
  let titleColor = '#4a76a8';
  let actionSection = '';
  
  switch (status) {
    case 'added':
      titleText = 'Added to Waitlist';
      statusText = 'has been added to the waitlist';
      titleColor = '#3498db';
      actionSection = `
        <p>We'll notify you as soon as a spot becomes available. No further action is required at this time.</p>
      `;
      break;
    case 'spot_available':
      titleText = 'Spot Available - Action Required';
      statusText = 'can now be registered';
      titleColor = '#27ae60';
      actionSection = `
        <div style="background-color: #e8f4fc; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #3498db;">
          <h3 style="margin-top: 0; color: #3498db;">Action Required</h3>
          <p>A spot is now available for ${childName}. Please log in to your account and complete the registration to secure this spot.</p>
          ${expirationTime ? `<p><strong>Important:</strong> This spot will be offered to the next person on the waitlist if not claimed by ${expirationTime}.</p>` : ''}
          <p style="margin-top: 15px;">
            <a href="https://sportsassist.io/login" style="background-color: #3498db; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Log In Now</a>
          </p>
        </div>
      `;
      break;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${titleText} - ${campName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f7f7f7; padding: 20px; border-radius: 5px; border-top: 4px solid ${titleColor};">
        <h1 style="color: ${titleColor}; margin-top: 0;">${titleText}</h1>
        <p>Hello ${parentName},</p>
        <p>${childName} ${statusText} for <strong>${campName}</strong>.</p>
        
        <h3 style="margin-top: 20px; color: #333;">Camp Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 120px;">Camp Name:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${campName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Participant:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${childName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Status:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${status === 'added' ? 'On Waitlist' : 'Spot Available'}</td>
          </tr>
        </table>
        
        ${actionSection}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>You can view your waitlist status by logging into your parent dashboard on SportsAssist.io.</p>
          <p>If you have any questions, please contact the camp organizer.</p>
        </div>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>This is an automated message from SportsAssist.io. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends an email notification based on the notification type
 */
export async function sendNotification(
  email: string,
  notificationType: NotificationType,
  data: NotificationData
): Promise<{ success: boolean, id?: string, error?: any }> {
  try {
    let subject = '';
    let htmlContent = '';
    
    // Generate appropriate email content based on notification type
    switch (notificationType) {
      case NotificationType.REGISTRATION_CONFIRMATION:
        subject = `Registration Confirmed: ${(data as RegistrationConfirmationData).campName}`;
        htmlContent = generateRegistrationConfirmationEmail(data as RegistrationConfirmationData);
        break;
        
      case NotificationType.CAMP_UPDATE:
        const updateData = data as CampUpdateData;
        const updateTypeText = updateData.updateType === 'cancellation' 
          ? 'Cancellation' 
          : updateData.updateType === 'date_change' 
            ? 'Date Change'
            : updateData.updateType === 'location_change'
              ? 'Location Change'
              : 'Important Update';
        subject = `Camp ${updateTypeText}: ${updateData.campName}`;
        htmlContent = generateCampUpdateEmail(updateData);
        break;
        
      case NotificationType.SLOT_BOOKING_CONFIRMATION:
        subject = `Time Slot Confirmed: ${(data as SlotNotificationData).campName}`;
        htmlContent = generateSlotNotificationEmail({ ...(data as SlotNotificationData), action: 'booked' });
        break;
        
      case NotificationType.SLOT_CANCELLATION:
        subject = `Time Slot Cancelled: ${(data as SlotNotificationData).campName}`;
        htmlContent = generateSlotNotificationEmail({ ...(data as SlotNotificationData), action: 'cancelled' });
        break;
        
      case NotificationType.SLOT_CHANGE:
        subject = `Time Slot Changed: ${(data as SlotNotificationData).campName}`;
        htmlContent = generateSlotNotificationEmail({ ...(data as SlotNotificationData), action: 'changed' });
        break;
        
      case NotificationType.REMINDER:
        subject = `Reminder: Upcoming Session at ${(data as SlotNotificationData).campName}`;
        htmlContent = generateSlotNotificationEmail({ ...(data as SlotNotificationData), action: 'reminder' });
        break;
        
      case NotificationType.WAITLIST_NOTIFICATION:
        const waitlistData = data as WaitlistNotificationData;
        subject = waitlistData.status === 'added' 
          ? `Added to Waitlist: ${waitlistData.campName}`
          : `Spot Available at ${waitlistData.campName} - Action Required`;
        htmlContent = generateWaitlistNotificationEmail(waitlistData);
        break;
        
      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }
    
    // Send the email using Resend
    const { data: response, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: email,
      subject: subject,
      html: htmlContent
    });
    
    if (error) {
      console.error('Failed to send email notification:', error);
      return { success: false, error };
    }
    
    console.log(`Email notification sent: ${notificationType} to ${email}`);
    return { success: true, id: response.id };
    
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error };
  }
}

/**
 * Helper function to send registration confirmation emails
 */
export async function sendRegistrationConfirmationEmail(
  parentEmail: string,
  parentName: string,
  childName: string,
  campDetails: {
    name: string;
    startDate: string;
    endDate: string;
    location: string;
    slots?: {
      date: string;
      startTime: string;
      endTime: string;
    }[];
  }
): Promise<{ success: boolean, id?: string, error?: any }> {
  const data: RegistrationConfirmationData = {
    parentName,
    childName,
    campName: campDetails.name,
    campStartDate: formatDate(campDetails.startDate),
    campEndDate: formatDate(campDetails.endDate),
    campLocation: campDetails.location,
    slots: campDetails.slots?.map(slot => ({
      date: formatDate(slot.date),
      startTime: formatTime(slot.startTime),
      endTime: formatTime(slot.endTime)
    }))
  };
  
  return sendNotification(parentEmail, NotificationType.REGISTRATION_CONFIRMATION, data);
}

/**
 * Helper function to send slot booking confirmation emails
 */
export async function sendSlotBookingConfirmationEmail(
  parentEmail: string,
  parentName: string,
  childName: string,
  campName: string,
  slotDate: string,
  slotStartTime: string,
  slotEndTime: string
): Promise<{ success: boolean, id?: string, error?: any }> {
  const data: SlotNotificationData = {
    parentName,
    childName,
    campName,
    slotDate: formatDate(slotDate),
    slotStartTime: formatTime(slotStartTime),
    slotEndTime: formatTime(slotEndTime)
  };
  
  return sendNotification(parentEmail, NotificationType.SLOT_BOOKING_CONFIRMATION, data);
}

/**
 * Helper function to send slot cancellation emails
 */
export async function sendSlotCancellationEmail(
  parentEmail: string,
  parentName: string,
  childName: string,
  campName: string,
  slotDate: string,
  slotStartTime: string,
  slotEndTime: string
): Promise<{ success: boolean, id?: string, error?: any }> {
  const data: SlotNotificationData = {
    parentName,
    childName,
    campName,
    slotDate: formatDate(slotDate),
    slotStartTime: formatTime(slotStartTime),
    slotEndTime: formatTime(slotEndTime)
  };
  
  return sendNotification(parentEmail, NotificationType.SLOT_CANCELLATION, data);
}

/**
 * Helper function to send camp update emails
 */
export async function sendCampUpdateEmail(
  parentEmail: string,
  parentName: string,
  childName: string,
  campName: string,
  updateType: 'cancellation' | 'date_change' | 'location_change' | 'general_update',
  updateDetails: string,
  originalDetails?: string,
  newDetails?: string
): Promise<{ success: boolean, id?: string, error?: any }> {
  const data: CampUpdateData = {
    parentName,
    childName,
    campName,
    updateType,
    updateDetails,
    originalDetails,
    newDetails
  };
  
  return sendNotification(parentEmail, NotificationType.CAMP_UPDATE, data);
}

/**
 * Helper function to send waitlist notification emails
 */
export async function sendWaitlistNotificationEmail(
  parentEmail: string,
  parentName: string,
  childName: string,
  campName: string,
  status: 'added' | 'spot_available',
  expirationTime?: string
): Promise<{ success: boolean, id?: string, error?: any }> {
  const data: WaitlistNotificationData = {
    parentName,
    childName,
    campName,
    status,
    expirationTime
  };
  
  return sendNotification(parentEmail, NotificationType.WAITLIST_NOTIFICATION, data);
}