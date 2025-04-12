import { Request, Response, Router, Express, NextFunction } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import {
  camps,
  availabilitySlots,
  slotBookings,
  users,
  children
} from "@shared/tables";
import { Role, AvailabilityStatus, BookingStatus } from "@shared/types";

// Define a more precise user type for authenticated requests
type AuthUser = {
  id: number;
  role: Role;
  organizationId?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Register availability slot routes
 */
export default function registerAvailabilityRoutes(app: Express) {
  // Create availability slot
  app.post("/api/camps/:id/availability-slots", async (req: AuthenticatedRequest, res: Response) => {
    // Store id in local variable for error handler
    const campId = req.params.id;
    
    try {
      console.log("==========================================");
      console.log("Received availability slot creation request for camp", campId);
      console.log("Request body:", JSON.stringify(req.body));
      console.log("Authenticated user:", req.user ? `ID: ${req.user.id}, Role: ${req.user.role}` : "No authenticated user");
      console.log("==========================================");
      
      const { slotDate, startTime, endTime, maxBookings, notes, bufferBefore, bufferAfter, creatorId } = req.body;
      
      // Validate required fields
      if (!slotDate || !startTime || !endTime) {
        console.log("Missing required fields in availability slot request");
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Ensure the user has permission to add a slot
      const camp = await db.query.camps.findFirst({
        where: eq(camps.id, parseInt(campId, 10))
      });
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user is organization admin or camp creator
      if (!req.user || 
          (req.user.role !== "platform_admin" && 
           req.user.organizationId !== camp.organizationId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Calculate duration in minutes
      const startTimeParts = startTime.split(':').map((part: string) => parseInt(part, 10));
      const endTimeParts = endTime.split(':').map((part: string) => parseInt(part, 10));
      
      const startMinutes = startTimeParts[0] * 60 + startTimeParts[1];
      const endMinutes = endTimeParts[0] * 60 + endTimeParts[1];
      
      const durationMinutes = endMinutes - startMinutes;
      
      if (durationMinutes <= 0) {
        return res.status(400).json({ message: "End time must be after start time" });
      }
      
      // Create the availability slot
      const slot = await db.insert(availabilitySlots).values({
        campId: parseInt(campId, 10),
        creatorId: creatorId || req.user.id, // Use provided creatorId if available, otherwise use authenticated user
        slotDate: new Date(slotDate),
        startTime,
        endTime,
        durationMinutes,
        maxBookings: maxBookings || 1,
        notes,
        bufferBefore: bufferBefore || 0,
        bufferAfter: bufferAfter || 0,
        status: "available" as AvailabilityStatus
      }).returning();
      
      if (slot && slot.length > 0) {
        res.status(201).json(slot[0]);
      } else {
        throw new Error("Failed to create availability slot");
      }
    } catch (error) {
      console.error("==========================================");
      console.error("Error creating availability slot:", error);
      console.error("Camp ID from params:", campId);
      console.error("Request user:", req.user);
      console.error("Request body:", req.body);
      
      // Try to provide more specific error information
      let errorMessage = "Failed to create availability slot";
      let errorStatus = 500;
      
      if (error instanceof Error) {
        if (error.message.includes("foreign key constraint")) {
          errorMessage = "Invalid camp ID or creator ID provided";
          errorStatus = 400;
        } else if (error.message.includes("duplicate key")) {
          errorMessage = "A slot with these details already exists";
          errorStatus = 409;
        } else if (error.message.includes("violates check constraint")) {
          errorMessage = "Invalid slot data - check time format or duration";
          errorStatus = 400;
        } else {
          // Include the actual error message for better debugging
          errorMessage = `${errorMessage}: ${error.message}`;
        }
      }
      
      console.error("Responding with error:", errorMessage);
      console.error("==========================================");
      
      res.status(errorStatus).json({ 
        message: errorMessage, 
        error: String(error),
        campId: campId, // Echo back the campId for debugging
        requestTime: new Date().toISOString()
      });
    }
  });
  
  // Get availability slots for a camp
  app.get("/api/camps/:id/availability-slots", async (req: Request, res: Response) => {
    const campId = req.params.id;
    try {
      console.log(`Fetching availability slots for camp ${campId}`);
      
      // Verify the camp exists first
      const camp = await db.query.camps.findFirst({
        where: eq(camps.id, parseInt(campId, 10))
      });
      
      if (!camp) {
        console.error(`Camp not found with ID: ${campId}`);
        return res.status(404).json({ 
          message: "Camp not found", 
          campId: campId,
          requestTime: new Date().toISOString()
        });
      }
      
      // Get availability slots for the camp
      const slots = await db.query.availabilitySlots.findMany({
        where: eq(availabilitySlots.campId, parseInt(campId, 10)),
        orderBy: [
          asc(availabilitySlots.slotDate),
          asc(availabilitySlots.startTime)
        ]
      });
      
      // For each slot, get the actual count of confirmed bookings
      const slotsWithCounts = await Promise.all(
        slots.map(async (slot) => {
          // Count confirmed bookings for this slot
          const confirmedBookings = await db.query.slotBookings.findMany({
            where: and(
              eq(slotBookings.slotId, slot.id),
              eq(slotBookings.status, "confirmed")
            )
          });
          
          const confirmedCount = confirmedBookings.length;
          
          // If the count doesn't match what's in the database, update it silently
          if (confirmedCount !== slot.currentBookings) {
            const correctStatus = confirmedCount >= slot.maxBookings ? "booked" : "available";
            
            // Update asynchronously without waiting
            db.update(availabilitySlots)
              .set({
                currentBookings: confirmedCount,
                status: correctStatus as AvailabilityStatus
              })
              .where(eq(availabilitySlots.id, slot.id))
              .execute()
              .catch(err => console.error(`Error updating slot ${slot.id} count:`, err));
              
            // Return the corrected slot data
            return {
              ...slot,
              currentBookings: confirmedCount,
              status: correctStatus
            };
          }
          
          // Otherwise return the slot as is
          return slot;
        })
      );
      
      console.log(`Found ${slotsWithCounts.length} availability slots for camp ${campId}`);
      res.json(slotsWithCounts);
    } catch (error) {
      console.error(`Error fetching availability slots for camp ${campId}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch availability slots", 
        error: String(error),
        campId: campId,
        requestTime: new Date().toISOString()
      });
    }
  });
  
  // Update an availability slot
  app.patch("/api/camps/:id/availability-slots/:slotId", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, slotId } = req.params;
      const { startTime, endTime, maxBookings, notes, status, bufferBefore, bufferAfter } = req.body;
      
      // Ensure the user has permission
      const camp = await db.query.camps.findFirst({
        where: eq(camps.id, parseInt(id, 10))
      });
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user is organization admin or camp creator
      if (!req.user || 
          (req.user.role !== "platform_admin" && 
           req.user.organizationId !== camp.organizationId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get the slot
      const existingSlot = await db.query.availabilitySlots.findFirst({
        where: and(
          eq(availabilitySlots.id, parseInt(slotId, 10)),
          eq(availabilitySlots.campId, parseInt(id, 10))
        )
      });
      
      if (!existingSlot) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      // Calculate duration in minutes if times are provided
      let durationMinutes = existingSlot.durationMinutes;
      if (startTime && endTime) {
        const startTimeParts = startTime.split(':').map((part: string) => parseInt(part, 10));
        const endTimeParts = endTime.split(':').map((part: string) => parseInt(part, 10));
        
        const startMinutes = startTimeParts[0] * 60 + startTimeParts[1];
        const endMinutes = endTimeParts[0] * 60 + endTimeParts[1];
        
        durationMinutes = endMinutes - startMinutes;
        
        if (durationMinutes <= 0) {
          return res.status(400).json({ message: "End time must be after start time" });
        }
      }
      
      // Update the slot
      const updatedSlot = await db.update(availabilitySlots)
        .set({
          startTime: startTime || existingSlot.startTime,
          endTime: endTime || existingSlot.endTime,
          durationMinutes,
          maxBookings: maxBookings !== undefined ? maxBookings : existingSlot.maxBookings,
          notes: notes !== undefined ? notes : existingSlot.notes,
          status: (status as AvailabilityStatus) || existingSlot.status,
          bufferBefore: bufferBefore !== undefined ? bufferBefore : existingSlot.bufferBefore,
          bufferAfter: bufferAfter !== undefined ? bufferAfter : existingSlot.bufferAfter,
          updatedAt: new Date()
        })
        .where(and(
          eq(availabilitySlots.id, parseInt(slotId, 10)),
          eq(availabilitySlots.campId, parseInt(id, 10))
        ))
        .returning();
      
      if (updatedSlot && updatedSlot.length > 0) {
        res.json(updatedSlot[0]);
      } else {
        throw new Error("Failed to update availability slot");
      }
    } catch (error) {
      console.error("Error updating availability slot:", error);
      res.status(500).json({ message: "Failed to update availability slot" });
    }
  });
  
  // Delete an availability slot
  app.delete("/api/camps/:id/availability-slots/:slotId", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, slotId } = req.params;
      
      // Ensure the user has permission
      const camp = await db.query.camps.findFirst({
        where: eq(camps.id, parseInt(id, 10))
      });
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user is organization admin or camp creator
      if (!req.user || 
          (req.user.role !== "platform_admin" && 
           req.user.organizationId !== camp.organizationId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get the slot to check if it has bookings
      const slot = await db.query.availabilitySlots.findFirst({
        where: and(
          eq(availabilitySlots.id, parseInt(slotId, 10)),
          eq(availabilitySlots.campId, parseInt(id, 10))
        )
      });
      
      if (!slot) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      // Check if the slot has any bookings
      if (slot.currentBookings > 0) {
        return res.status(400).json({ 
          message: "Cannot delete a slot with existing bookings. Cancel the bookings first." 
        });
      }
      
      // Delete the slot
      await db.delete(availabilitySlots)
        .where(and(
          eq(availabilitySlots.id, parseInt(slotId, 10)),
          eq(availabilitySlots.campId, parseInt(id, 10))
        ));
      
      res.json({ message: "Availability slot deleted successfully" });
    } catch (error) {
      console.error("Error deleting availability slot:", error);
      res.status(500).json({ message: "Failed to delete availability slot" });
    }
  });
  
  // Book an availability slot
  app.post("/api/camps/:id/availability-slots/:slotId/book", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, slotId } = req.params;
      const { childId, notes } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!childId) {
        return res.status(400).json({ message: "Child ID is required" });
      }
      
      // Get the slot
      const slot = await db.query.availabilitySlots.findFirst({
        where: and(
          eq(availabilitySlots.id, parseInt(slotId, 10)),
          eq(availabilitySlots.campId, parseInt(id, 10))
        )
      });
      
      if (!slot) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      
      // Check if slot is available
      if (slot.status !== "available") {
        return res.status(400).json({ message: "Slot is not available for booking" });
      }
      
      // Check if slot is full
      if (slot.currentBookings >= slot.maxBookings) {
        return res.status(400).json({ message: "Slot is already fully booked" });
      }
      
      // Check if child is already registered for this specific slot
      const existingBooking = await db.query.slotBookings.findFirst({
        where: and(
          eq(slotBookings.slotId, parseInt(slotId, 10)),
          eq(slotBookings.childId, parseInt(childId, 10)),
          eq(slotBookings.status, "confirmed")
        )
      });
      
      if (existingBooking) {
        return res.status(400).json({ 
          message: "Child is already registered for this time slot",
          existingBooking
        });
      }
      
      // Create booking
      const booking = await db.insert(slotBookings).values({
        slotId: parseInt(slotId, 10),
        childId: parseInt(childId, 10),
        parentId: req.user.id,
        notes,
        status: "confirmed" as BookingStatus,
        bookingDate: new Date()
      }).returning();
      
      if (booking && booking.length > 0) {
        // Update slot booking count
        await db.update(availabilitySlots)
          .set({
            currentBookings: slot.currentBookings + 1,
            status: slot.currentBookings + 1 >= slot.maxBookings ? "booked" as AvailabilityStatus : "available" as AvailabilityStatus
          })
          .where(eq(availabilitySlots.id, parseInt(slotId, 10)));
        
        res.status(201).json(booking[0]);
      } else {
        throw new Error("Failed to create booking");
      }
    } catch (error) {
      console.error("Error booking slot:", error);
      res.status(500).json({ message: "Failed to book slot" });
    }
  });
  
  // Cancel a booking
  app.post("/api/slot-bookings/:bookingId/cancel", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { cancelReason } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get the booking
      const booking = await db.query.slotBookings.findFirst({
        where: eq(slotBookings.id, parseInt(bookingId, 10)),
        with: {
          slot: true
        }
      });
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user is the parent who made the booking or an admin
      if (req.user.id !== booking.parentId && req.user.role !== "platform_admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Check if booking is already cancelled
      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "Booking is already cancelled" });
      }
      
      // Update booking
      const updatedBooking = await db.update(slotBookings)
        .set({
          status: "cancelled" as BookingStatus,
          cancelledAt: new Date(),
          cancelReason
        })
        .where(eq(slotBookings.id, parseInt(bookingId, 10)))
        .returning();
      
      if (updatedBooking && updatedBooking.length > 0) {
        // Get the new count of confirmed bookings for this slot
        const confirmedBookings = await db.query.slotBookings.findMany({
          where: and(
            eq(slotBookings.slotId, booking.slotId),
            eq(slotBookings.status, "confirmed")
          )
        });
        
        const newBookingCount = confirmedBookings.length;
        
        // Update slot booking count and status based on actual booking count
        await db.update(availabilitySlots)
          .set({
            currentBookings: newBookingCount,
            // Only mark as available if there's space available
            status: newBookingCount < booking.slot.maxBookings ? "available" : "booked" as AvailabilityStatus
          })
          .where(eq(availabilitySlots.id, booking.slotId));
        
        res.json(updatedBooking[0]);
      } else {
        throw new Error("Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });
  
  // Get all bookings for a parent
  app.get("/api/parent/bookings", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== "parent") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const bookings = await db.query.slotBookings.findMany({
        where: eq(slotBookings.parentId, req.user.id),
        with: {
          slot: {
            with: {
              camp: {
                columns: {
                  id: true,
                  name: true,
                  organizationId: true
                }
              }
            }
          },
          child: {
            columns: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: [
          desc(slotBookings.bookingDate)
        ]
      });
      
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching parent bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
  
  // Get all bookings for a camp
  app.get("/api/camps/:id/bookings", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      // Ensure the user has permission
      const camp = await db.query.camps.findFirst({
        where: eq(camps.id, parseInt(id, 10))
      });
      
      if (!camp) {
        return res.status(404).json({ message: "Camp not found" });
      }
      
      // Check if user is organization admin or camp creator
      if (!req.user || 
          (req.user.role !== "platform_admin" && 
           req.user.organizationId !== camp.organizationId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log(`Fetching booking data for camp ID ${id}`);
      
      // Get all slots for this camp
      const slots = await db.query.availabilitySlots.findMany({
        where: eq(availabilitySlots.campId, parseInt(id, 10)),
        orderBy: [
          asc(availabilitySlots.slotDate),
          asc(availabilitySlots.startTime)
        ]
      });
      
      console.log(`Found ${slots.length} slots for camp ID ${id}`);
      
      // For each slot, get the bookings separately
      const slotsWithBookings = await Promise.all(slots.map(async (slot) => {
        try {
          // Get the bookings for this slot
          const bookings = await db.query.slotBookings.findMany({
            where: eq(slotBookings.slotId, slot.id),
            with: {
              child: {
                columns: {
                  id: true,
                  fullName: true
                }
              },
              parent: {
                columns: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true
                }
              }
            }
          });
          
          console.log(`Slot ID ${slot.id} has ${bookings.length} bookings`);
          
          // Return the slot with its bookings
          return {
            ...slot,
            bookings
          };
        } catch (error) {
          console.error(`Error fetching bookings for slot ${slot.id}:`, error);
          // Return the slot with empty bookings array if something went wrong
          return {
            ...slot,
            bookings: []
          };
        }
      }));
      
      // Log the result for debugging
      console.log(`Returning ${slotsWithBookings.length} slots with booking data`);
      
      res.json(slotsWithBookings);
    } catch (error) {
      console.error("Error fetching camp bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
}