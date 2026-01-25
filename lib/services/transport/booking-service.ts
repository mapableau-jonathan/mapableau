/**
 * Transport Booking Service
 * Handles transportation bookings for people with disabilities and aged care
 */

import { prisma } from "@/lib/prisma";
import { transportBillingService } from "./transport-billing-service";
import { RouteOptimizerService } from "./route-optimizer";
import { reminderScheduler } from "./reminder-scheduler";
import { transportSMSNotificationService } from "./sms-notification-service";
import { logger } from "@/lib/logger";
import { TransportBookingStatus, TransportServiceType } from "@prisma/client";

export interface CreateTransportBookingData {
  participantId: string;
  serviceType: TransportServiceType;
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  dropoffLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  scheduledPickupTime: Date;
  scheduledDropoffTime?: Date;
  accessibilityRequirements: string[];
  passengerCount?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTransportBookingData {
  status?: TransportBookingStatus;
  driverId?: string;
  vehicleId?: string;
  actualPickupTime?: Date;
  actualDropoffTime?: Date;
  mileage?: number;
  duration?: number;
  notes?: string;
}

/**
 * Transport Booking Service
 */
export class TransportBookingService {
  private routeOptimizer: RouteOptimizerService;
  private billingService: typeof transportBillingService;

  constructor() {
    this.routeOptimizer = new RouteOptimizerService();
    this.billingService = transportBillingService;
  }

  /**
   * Create a new transport booking
   */
  async createBooking(data: CreateTransportBookingData) {
    try {
      // Generate booking number
      const bookingNumber = `TRANS-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      // Calculate estimated route and costs
      const route = await this.routeOptimizer.optimizeRoute(
        data.pickupLocation,
        data.dropoffLocation,
        [],
        {
          prioritizeAccessibility: data.accessibilityRequirements.length > 0,
          avoidTolls: true,
          avoidHighways: data.accessibilityRequirements.includes("NO_STAIRS"),
        }
      );

      // Calculate estimated cost
      const costBreakdown = await this.billingService.calculateBookingCost({
        serviceType: data.serviceType,
        mileage: route.distance,
        duration: route.duration,
        accessibilityRequirements: data.accessibilityRequirements,
      });

      // Create booking
      const booking = await prisma.transportBooking.create({
        data: {
          bookingNumber,
          participantId: data.participantId,
          serviceType: data.serviceType,
          pickupLocation: data.pickupLocation as any,
          dropoffLocation: data.dropoffLocation as any,
          scheduledPickupTime: data.scheduledPickupTime,
          scheduledDropoffTime: data.scheduledDropoffTime,
          status: "PENDING",
          accessibilityRequirements: data.accessibilityRequirements,
          passengerCount: data.passengerCount || 1,
          baseFare: costBreakdown.baseFare,
          mileageRate: parseFloat(process.env.TRANSPORT_MILEAGE_RATE || "2.50"),
          accessibilitySurcharge: costBreakdown.accessibilitySurcharge,
          totalCost: costBreakdown.totalCost,
          mileage: route.distance,
          duration: route.duration,
          notes: data.notes,
          metadata: {
            estimatedRoute: {
              distance: route.distance,
              duration: route.duration,
              accessibilityScore: route.accessibilityScore,
            },
            ...data.metadata,
          } as any,
        },
      });

      logger.info("Transport booking created", {
        bookingId: booking.id,
        bookingNumber,
        participantId: data.participantId,
        serviceType: data.serviceType,
      });

      // Schedule SMS reminders
      try {
        await reminderScheduler.scheduleReminders(booking.id);
      } catch (error) {
        logger.warn("Failed to schedule reminders for booking", { error, bookingId: booking.id });
      }

      // Send confirmation SMS if phone number available
      try {
        if ((data.metadata as any)?.participantPhoneNumber) {
          await transportSMSNotificationService.sendConfirmation(booking.id);
        }
      } catch (error) {
        logger.warn("Failed to send confirmation SMS", { error, bookingId: booking.id });
      }

      // Send calendar invite if participant email available
      try {
        const participant = await prisma.user.findUnique({
          where: { id: booking.participantId },
          select: { email: true },
        });
        if (participant?.email) {
          const { transportCalendarIntegrationService } = await import("./calendar-integration-service");
          await transportCalendarIntegrationService.sendCalendarInvite(booking.id, participant.email);
        }
      } catch (error) {
        logger.warn("Failed to send calendar invite", { error, bookingId: booking.id });
      }

      return booking;
    } catch (error) {
      logger.error("Error creating transport booking", { error, data });
      throw error;
    }
  }

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string) {
    return prisma.transportBooking.findUnique({
      where: { id: bookingId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get bookings for a participant
   */
  async getParticipantBookings(
    participantId: string,
    status?: TransportBookingStatus,
    limit = 50
  ) {
    const where: any = { participantId };
    if (status) {
      where.status = status;
    }

    return prisma.transportBooking.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledPickupTime: "desc" },
      take: limit,
    });
  }

  /**
   * Update booking
   */
  async updateBooking(bookingId: string, data: UpdateTransportBookingData) {
    try {
      const booking = await prisma.transportBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      // If completing booking, recalculate costs and finalize billing
      if (data.status === "COMPLETED" && booking.status !== "COMPLETED") {
        const updatedBooking = await prisma.transportBooking.update({
          where: { id: bookingId },
          data: {
            ...data,
            actualPickupTime: data.actualPickupTime || booking.actualPickupTime,
            actualDropoffTime: data.actualDropoffTime,
            mileage: data.mileage || booking.mileage,
            duration: data.duration || booking.duration,
          },
        });

        // Finalize billing with actual trip data
        await this.billingService.finalizeBookingBilling(bookingId);

        // Cancel any pending reminders
        try {
          await reminderScheduler.cancelReminders(bookingId);
        } catch (error) {
          logger.warn("Failed to cancel reminders", { error, bookingId });
        }

        // Send completion notification
        try {
          await transportSMSNotificationService.sendStatusUpdate(bookingId, "COMPLETED");
        } catch (error) {
          logger.warn("Failed to send completion notification", { error, bookingId });
        }

        return updatedBooking;
      }

      // Send status update notification for status changes
      if (data.status && data.status !== booking.status) {
        try {
          await transportSMSNotificationService.sendStatusUpdate(bookingId, data.status);
        } catch (error) {
          logger.warn("Failed to send status update", { error, bookingId, status: data.status });
        }
      }

      // Regular update
      return prisma.transportBooking.update({
        where: { id: bookingId },
        data,
      });
    } catch (error) {
      logger.error("Error updating transport booking", { error, bookingId, data });
      throw error;
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, reason?: string) {
    try {
      const booking = await prisma.transportBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status === "COMPLETED") {
        throw new Error("Cannot cancel completed booking");
      }

      const cancelledBooking = await prisma.transportBooking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });

      // Cancel reminders and send cancellation notification
      try {
        await reminderScheduler.cancelReminders(bookingId);
        await transportSMSNotificationService.sendStatusUpdate(bookingId, "CANCELLED");
      } catch (error) {
        logger.warn("Failed to cancel reminders or send notification", { error, bookingId });
      }

      return cancelledBooking;
    } catch (error) {
      logger.error("Error cancelling transport booking", { error, bookingId });
      throw error;
    }
  }

  /**
   * Complete booking with trip data
   */
  async completeBooking(
    bookingId: string,
    tripData: {
      actualPickupTime: Date;
      actualDropoffTime: Date;
      mileage: number;
      duration: number; // Minutes
    }
  ) {
    try {
      await this.updateBooking(bookingId, {
        status: "COMPLETED",
        ...tripData,
      });

      // Billing is finalized in updateBooking when status changes to COMPLETED
      const booking = await this.getBooking(bookingId);
      return booking;
    } catch (error) {
      logger.error("Error completing transport booking", { error, bookingId, tripData });
      throw error;
    }
  }

  /**
   * Get upcoming bookings for driver
   */
  async getDriverBookings(driverId: string, upcoming = true) {
    const where: any = { driverId };
    if (upcoming) {
      where.status = { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] };
      where.scheduledPickupTime = { gte: new Date() };
    }

    return prisma.transportBooking.findMany({
      where,
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledPickupTime: "asc" },
    });
  }

  /**
   * Assign driver to booking
   */
  async assignDriver(bookingId: string, driverId: string) {
    try {
      const booking = await this.getBooking(bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
        throw new Error("Cannot assign driver to booking in current status");
      }

      const updatedBooking = await prisma.transportBooking.update({
        where: { id: bookingId },
        data: {
          driverId,
          status: "CONFIRMED",
        },
      });

      // Send confirmation notification
      try {
        await transportSMSNotificationService.sendStatusUpdate(bookingId, "CONFIRMED");
      } catch (error) {
        logger.warn("Failed to send confirmation notification", { error, bookingId });
      }

      return updatedBooking;
    } catch (error) {
      logger.error("Error assigning driver", { error, bookingId, driverId });
      throw error;
    }
  }
}
