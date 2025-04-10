import { Request, Response, Router, Express, NextFunction } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
  camps,
  availabilitySlots,
  slotBookings,
  users,
  children
} from "@shared/tables";
import { Role, AvailabilityStatus, BookingStatus } from "@shared/types";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: Role;
    organizationId?: number;
  }
}

/**
 * Register availability slot routes
 */
export default function registerAvailabilityRoutes(app: Express) {
  // Create availability slot
  app.post("/api/camps/:id/availability-slots", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { slotDate, startTime, endTime, maxBookings, notes, bufferBefore, bufferAfter } = req.body;
      
      // Validate required fields
      if (!slotDate || !startTime || !endTime) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Ensure the user has permission to add a slot
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
        campId: parseInt(id, 10),
        creatorId: req.user.id,
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
      console.error("Error creating availability slot:", error);
      res.status(500).json({ message: "Failed to create availability slot" });
    }
  });
  
  // Get availability slots for a camp
  app.get("/api/camps/:id/availability-slots", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get availability slots for the camp
      const slots = await db.query.availabilitySlots.findMany({
        where: eq(availabilitySlots.campId, parseInt(id, 10)),
        orderBy: [
          asc(availabilitySlots.slotDate),
          asc(availabilitySlots.startTime)
        ]
      });
      
      res.json(slots);
    } catch (error) {
      console.error("Error fetching availability slots:", error);
      res.status(500).json({ message: "Failed to fetch availability slots" });
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
        // Update slot booking count and status
        await db.update(availabilitySlots)
          .set({
            currentBookings: booking.slot.currentBookings - 1,
            status: "available" as AvailabilityStatus
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
              firstName: true,
              lastName: true
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
      
      // Get all slots for this camp
      const slots = await db.query.availabilitySlots.findMany({
        where: eq(availabilitySlots.campId, parseInt(id, 10)),
        with: {
          bookings: {
            with: {
              child: {
                columns: {
                  id: true,
                  firstName: true,
                  lastName: true
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
          }
        },
        orderBy: [
          asc(availabilitySlots.slotDate),
          asc(availabilitySlots.startTime)
        ]
      });
      
      res.json(slots);
    } catch (error) {
      console.error("Error fetching camp bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
}