/**
 * Transport Delivery Tracking Service
 * Tracks delivery status and provides real-time updates for transportation services
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { transportSMSNotificationService } from "./sms-notification-service";
import { TransportBookingStatus } from "@prisma/client";

export interface DeliveryStatusUpdate {
  bookingId: string;
  status: TransportBookingStatus;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: Date;
  notes?: string;
}

export interface DeliveryTracking {
  bookingId: string;
  bookingNumber: string;
  currentStatus: TransportBookingStatus;
  estimatedPickupTime?: Date;
  estimatedDropoffTime?: Date;
  actualPickupTime?: Date;
  actualDropoffTime?: Date;
  driverLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  routeProgress?: {
    completedDistance: number;
    totalDistance: number;
    percentage: number;
  };
  statusHistory: Array<{
    status: TransportBookingStatus;
    timestamp: Date;
    notes?: string;
  }>;
}

/**
 * Transport Delivery Tracking Service
 */
export class DeliveryTrackingService {
  /**
   * Update delivery status
   */
  async updateStatus(update: DeliveryStatusUpdate): Promise<void> {
    try {
      const booking = await prisma.transportBooking.findUnique({
        where: { id: update.bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      // Update booking status
      const updateData: any = {
        status: update.status,
      };

      // Update times based on status
      if (update.status === "IN_PROGRESS" && !booking.actualPickupTime) {
        updateData.actualPickupTime = update.timestamp;
      } else if (update.status === "COMPLETED" && !booking.actualDropoffTime) {
        updateData.actualDropoffTime = update.timestamp;
      }

      // Store location in metadata if provided
      if (update.location) {
        const metadata = (booking.metadata as any) || {};
        metadata.locationUpdates = metadata.locationUpdates || [];
        metadata.locationUpdates.push({
          location: update.location,
          timestamp: update.timestamp,
          status: update.status,
        });
        updateData.metadata = metadata;
      }

      // Store status history
      const metadata = (booking.metadata as any) || {};
      metadata.statusHistory = metadata.statusHistory || [];
      metadata.statusHistory.push({
        status: update.status,
        timestamp: update.timestamp,
        notes: update.notes,
      });
      updateData.metadata = metadata;

      await prisma.transportBooking.update({
        where: { id: update.bookingId },
        data: updateData,
      });

      // Send ETA notification when driver starts trip (IN_PROGRESS status)
      if (update.status === "IN_PROGRESS" && update.location) {
        try {
          await transportSMSNotificationService.sendETANotification(
            update.bookingId,
            update.location
          );
        } catch (error) {
          logger.warn("Failed to send ETA notification", { error, bookingId: update.bookingId });
        }
      }

      logger.info("Delivery status updated", {
        bookingId: update.bookingId,
        status: update.status,
      });
    } catch (error) {
      logger.error("Error updating delivery status", { error, update });
      throw error;
    }
  }

  /**
   * Get delivery tracking information
   */
  async getTracking(bookingId: string): Promise<DeliveryTracking | null> {
    try {
      const booking = await prisma.transportBooking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          scheduledPickupTime: true,
          scheduledDropoffTime: true,
          actualPickupTime: true,
          actualDropoffTime: true,
          mileage: true,
          metadata: true,
        },
      });

      if (!booking) {
        return null;
      }

      const metadata = (booking.metadata as any) || {};
      const locationUpdates = metadata.locationUpdates || [];
      const statusHistory = metadata.statusHistory || [];

      // Get latest location update
      const latestLocation = locationUpdates.length > 0
        ? locationUpdates[locationUpdates.length - 1]
        : null;

      // Calculate route progress if mileage is available
      let routeProgress = undefined;
      if (booking.mileage) {
        const completedDistance = latestLocation ? 0 : 0; // Would need actual tracking data
        routeProgress = {
          completedDistance,
          totalDistance: Number(booking.mileage),
          percentage: latestLocation ? 50 : 0, // Simplified
        };
      }

      return {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        currentStatus: booking.status,
        estimatedPickupTime: booking.scheduledPickupTime,
        estimatedDropoffTime: booking.scheduledDropoffTime || undefined,
        actualPickupTime: booking.actualPickupTime || undefined,
        actualDropoffTime: booking.actualDropoffTime || undefined,
        driverLocation: latestLocation
          ? {
              latitude: latestLocation.location.latitude,
              longitude: latestLocation.location.longitude,
              timestamp: new Date(latestLocation.timestamp),
            }
          : undefined,
        routeProgress,
        statusHistory: statusHistory.map((item: any) => ({
          status: item.status,
          timestamp: new Date(item.timestamp),
          notes: item.notes,
        })),
      };
    } catch (error) {
      logger.error("Error getting delivery tracking", { error, bookingId });
      throw error;
    }
  }

  /**
   * Update driver location (for real-time tracking)
   */
  async updateDriverLocation(
    bookingId: string,
    location: { latitude: number; longitude: number; address?: string }
  ): Promise<void> {
    try {
      const booking = await prisma.transportBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status !== "IN_PROGRESS") {
        // Only track location for in-progress bookings
        return;
      }

      const metadata = (booking.metadata as any) || {};
      metadata.locationUpdates = metadata.locationUpdates || [];
      metadata.locationUpdates.push({
        location,
        timestamp: new Date(),
      });

      await prisma.transportBooking.update({
        where: { id: bookingId },
        data: { metadata },
      });
    } catch (error) {
      logger.error("Error updating driver location", { error, bookingId, location });
      throw error;
    }
  }

  /**
   * Get delivery status notifications for participant
   */
  async getStatusNotifications(participantId: string): Promise<Array<{
    bookingId: string;
    bookingNumber: string;
    status: TransportBookingStatus;
    message: string;
    timestamp: Date;
  }>> {
    const bookings = await prisma.transportBooking.findMany({
      where: {
        participantId,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        scheduledPickupTime: true,
        metadata: true,
      },
      orderBy: { scheduledPickupTime: "asc" },
      take: 10,
    });

    return bookings.map((booking) => {
      let message = "";
      switch (booking.status) {
        case "CONFIRMED":
          message = `Your transport booking ${booking.bookingNumber} is confirmed. Driver will arrive at ${booking.scheduledPickupTime.toLocaleTimeString()}`;
          break;
        case "IN_PROGRESS":
          message = `Driver is on the way for booking ${booking.bookingNumber}`;
          break;
        default:
          message = `Booking ${booking.bookingNumber} status: ${booking.status}`;
      }

      return {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        message,
        timestamp: booking.scheduledPickupTime,
      };
    });
  }
}

// Export singleton instance
export const deliveryTrackingService = new DeliveryTrackingService();
