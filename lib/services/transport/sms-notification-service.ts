/**
 * Transport SMS Notification Service
 * Sends SMS notifications for transport bookings including ETAs and reminders
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { TwilioSMSService } from "../verification/twilio-sms";
import { TransportBookingService } from "./booking-service";
import { deliveryTrackingService } from "./delivery-tracking-service";
import { TransportBookingStatus } from "@prisma/client";

export interface ETACalculation {
  estimatedMinutes: number;
  estimatedArrival: Date;
  confidence: "high" | "medium" | "low";
  factors: string[];
}

/**
 * Transport SMS Notification Service
 */
export class TransportSMSNotificationService {
  private smsService: TwilioSMSService;
  private bookingService: TransportBookingService;

  constructor() {
    this.smsService = new TwilioSMSService();
    this.bookingService = new TransportBookingService();
  }

  /**
   * Calculate ETA based on route and current location
   */
  async calculateETA(
    bookingId: string,
    currentLocation?: { latitude: number; longitude: number }
  ): Promise<ETACalculation> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      const tracking = await deliveryTrackingService.getTracking(bookingId);
      if (!tracking) {
        throw new Error("Tracking data not found");
      }

      const pickupLocation = booking.pickupLocation as any;
      const factors: string[] = [];

      // Base calculation from scheduled time
      let estimatedMinutes = 0;
      const now = new Date();
      
      if (booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS") {
        // Calculate from current location to pickup (if driver is en route)
        if (currentLocation && tracking.driverLocation) {
          const distanceToPickup = this.calculateDistance(
            currentLocation,
            pickupLocation
          );
          
          // Average speed: 50 km/h in urban areas
          estimatedMinutes = Math.round((distanceToPickup / 50) * 60);
          factors.push(`Distance: ${distanceToPickup.toFixed(1)} km`);
        } else if (tracking.driverLocation) {
          const distanceToPickup = this.calculateDistance(
            tracking.driverLocation,
            pickupLocation
          );
          estimatedMinutes = Math.round((distanceToPickup / 50) * 60);
          factors.push(`Distance: ${distanceToPickup.toFixed(1)} km`);
        } else {
          // Use scheduled pickup time
          const timeDiff = booking.scheduledPickupTime.getTime() - now.getTime();
          estimatedMinutes = Math.max(0, Math.round(timeDiff / (1000 * 60)));
          factors.push("Based on scheduled time");
        }
      } else {
        // Use scheduled time
        const timeDiff = booking.scheduledPickupTime.getTime() - now.getTime();
        estimatedMinutes = Math.max(0, Math.round(timeDiff / (1000 * 60)));
        factors.push("Based on scheduled time");
      }

      // Add buffer for accessibility requirements
      if (booking.accessibilityRequirements.length > 0) {
        estimatedMinutes += 5; // Extra 5 minutes for accessibility needs
        factors.push("Accessibility considerations");
      }

      // Determine confidence
      let confidence: "high" | "medium" | "low" = "medium";
      if (tracking.driverLocation && currentLocation) {
        confidence = "high";
      } else if (tracking.driverLocation || currentLocation) {
        confidence = "medium";
      } else {
        confidence = "low";
        factors.push("Limited location data");
      }

      const estimatedArrival = new Date(now.getTime() + estimatedMinutes * 60 * 1000);

      return {
        estimatedMinutes,
        estimatedArrival,
        confidence,
        factors,
      };
    } catch (error) {
      logger.error("Error calculating ETA", { error, bookingId });
      throw error;
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.latitude)) *
        Math.cos(this.toRad(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Send ETA notification to participant
   */
  async sendETANotification(
    bookingId: string,
    currentLocation?: { latitude: number; longitude: number }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking || !booking.participant) {
        throw new Error("Booking or participant not found");
      }

      // Get participant phone number from user profile
      const user = await prisma.user.findUnique({
        where: { id: booking.participantId },
        select: { name: true },
      });

      // For now, we'll need phone number in booking metadata or user profile
      // In production, store phone number in user profile or booking metadata
      const phoneNumber = (booking.metadata as any)?.participantPhoneNumber;
      if (!phoneNumber) {
        logger.warn("No phone number available for ETA notification", { bookingId });
        return { success: false, error: "Phone number not available" };
      }

      const eta = await this.calculateETA(bookingId, currentLocation);
      const message = this.formatETAMessage(booking, eta);

      const result = await this.smsService.sendMessage(phoneNumber, message);
      
      if (result.success) {
        logger.info("ETA notification sent", {
          bookingId,
          participantId: booking.participantId,
          estimatedMinutes: eta.estimatedMinutes,
        });
      }

      return result;
    } catch (error: any) {
      logger.error("Error sending ETA notification", { error, bookingId });
      return {
        success: false,
        error: error.message || "Failed to send ETA notification",
      };
    }
  }

  /**
   * Send booking reminder
   */
  async sendReminder(
    bookingId: string,
    reminderType: "24_HOURS" | "2_HOURS" | "30_MINUTES"
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking || !booking.participant) {
        throw new Error("Booking or participant not found");
      }

      const phoneNumber = (booking.metadata as any)?.participantPhoneNumber;
      if (!phoneNumber) {
        logger.warn("No phone number available for reminder", { bookingId });
        return { success: false, error: "Phone number not available" };
      }

      const message = this.formatReminderMessage(booking, reminderType);
      const result = await this.smsService.sendMessage(phoneNumber, message);

      if (result.success) {
        logger.info("Reminder sent", {
          bookingId,
          reminderType,
          participantId: booking.participantId,
        });

        // Store reminder sent in booking metadata
        const metadata = (booking.metadata as any) || {};
        metadata.remindersSent = metadata.remindersSent || [];
        metadata.remindersSent.push({
          type: reminderType,
          sentAt: new Date().toISOString(),
          messageId: result.messageId,
        });

        await prisma.transportBooking.update({
          where: { id: bookingId },
          data: { metadata },
        });
      }

      return result;
    } catch (error: any) {
      logger.error("Error sending reminder", { error, bookingId, reminderType });
      return {
        success: false,
        error: error.message || "Failed to send reminder",
      };
    }
  }

  /**
   * Format ETA message
   */
  private formatETAMessage(booking: any, eta: ETACalculation): string {
    const pickupLocation = booking.pickupLocation as any;
    const pickupAddress = pickupLocation.address || "your pickup location";
    const arrivalTime = eta.estimatedArrival.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (eta.estimatedMinutes <= 0) {
      return `Your transport for booking ${booking.bookingNumber} is arriving now at ${pickupAddress}. Please be ready.`;
    }

    if (eta.estimatedMinutes < 5) {
      return `Your transport is arriving in approximately ${eta.estimatedMinutes} minute${eta.estimatedMinutes > 1 ? "s" : ""} at ${pickupAddress}. Please be ready for booking ${booking.bookingNumber}.`;
    }

    return `Your transport for booking ${booking.bookingNumber} is estimated to arrive at ${arrivalTime} (in ${eta.estimatedMinutes} minutes) at ${pickupAddress}. Please be ready.`;
  }

  /**
   * Format reminder message
   */
  private formatReminderMessage(booking: any, reminderType: string): string {
    const pickupLocation = booking.pickupLocation as any;
    const pickupAddress = pickupLocation.address || "your pickup location";
    const pickupTime = booking.scheduledPickupTime.toLocaleString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const accessibilityNote =
      booking.accessibilityRequirements.length > 0
        ? ` Please note your accessibility requirements: ${booking.accessibilityRequirements.join(", ")}.`
        : "";

    switch (reminderType) {
      case "24_HOURS":
        return `Reminder: You have a transport booking ${booking.bookingNumber} scheduled for ${pickupTime} at ${pickupAddress}.${accessibilityNote}`;

      case "2_HOURS":
        return `Reminder: Your transport booking ${booking.bookingNumber} is scheduled in 2 hours at ${pickupTime} at ${pickupAddress}. Please be ready.${accessibilityNote}`;

      case "30_MINUTES":
        return `Your transport for booking ${booking.bookingNumber} will arrive in 30 minutes at ${pickupTime} at ${pickupAddress}. Please be ready now.${accessibilityNote}`;

      default:
        return `Reminder: Your transport booking ${booking.bookingNumber} is scheduled for ${pickupTime} at ${pickupAddress}.${accessibilityNote}`;
    }
  }

  /**
   * Send booking confirmation
   */
  async sendConfirmation(bookingId: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking || !booking.participant) {
        throw new Error("Booking or participant not found");
      }

      const phoneNumber = (booking.metadata as any)?.participantPhoneNumber;
      if (!phoneNumber) {
        return { success: false, error: "Phone number not available" };
      }

      const pickupLocation = booking.pickupLocation as any;
      const dropoffLocation = booking.dropoffLocation as any;
      const pickupTime = booking.scheduledPickupTime.toLocaleString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      const message = `Your transport booking ${booking.bookingNumber} has been confirmed!\n\nPickup: ${pickupTime}\nFrom: ${pickupLocation.address}\nTo: ${dropoffLocation.address}\n\nYou will receive reminder notifications before your trip.`;

      return await this.smsService.sendMessage(phoneNumber, message);
    } catch (error: any) {
      logger.error("Error sending confirmation", { error, bookingId });
      return {
        success: false,
        error: error.message || "Failed to send confirmation",
      };
    }
  }

  /**
   * Send booking status update
   */
  async sendStatusUpdate(
    bookingId: string,
    status: TransportBookingStatus
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking || !booking.participant) {
        throw new Error("Booking or participant not found");
      }

      const phoneNumber = (booking.metadata as any)?.participantPhoneNumber;
      if (!phoneNumber) {
        return { success: false, error: "Phone number not available" };
      }

      let message = "";
      switch (status) {
        case "CONFIRMED":
          message = `Your transport booking ${booking.bookingNumber} has been confirmed. Driver details will be sent shortly.`;
          break;
        case "IN_PROGRESS":
          message = `Your transport for booking ${booking.bookingNumber} is now in progress. The driver is on the way.`;
          break;
        case "COMPLETED":
          message = `Thank you! Your transport booking ${booking.bookingNumber} has been completed. We hope you had a safe journey.`;
          break;
        case "CANCELLED":
          message = `Your transport booking ${booking.bookingNumber} has been cancelled. If you need to reschedule, please contact us.`;
          break;
        default:
          return { success: false, error: "Status update not configured for this status" };
      }

      return await this.smsService.sendMessage(phoneNumber, message);
    } catch (error: any) {
      logger.error("Error sending status update", { error, bookingId, status });
      return {
        success: false,
        error: error.message || "Failed to send status update",
      };
    }
  }
}

// Export singleton instance
export const transportSMSNotificationService = new TransportSMSNotificationService();
