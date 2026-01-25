/**
 * Transport Billing Service
 * Handles billing for transportation services with integration to usage tracking
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serviceHoursTracker } from "../usage/service-hours-tracker";
import { usageBillingService } from "../billing/usage-billing-service";
import { TransportBookingStatus, TransportServiceType } from "@prisma/client";

export interface TransportBillingConfig {
  baseFare: number; // Base fare per trip
  mileageRate: number; // Per kilometer
  hourlyRate: number; // Per hour (for time-based billing)
  accessibilitySurcharge: number; // Surcharge for accessibility requirements
  serviceTypeRates: Record<TransportServiceType, {
    baseFare?: number;
    mileageRate?: number;
    hourlyRate?: number;
  }>;
}

/**
 * Transport Billing Service
 */
export class TransportBillingService {
  private config: TransportBillingConfig;

  constructor() {
    this.config = {
      baseFare: parseFloat(process.env.TRANSPORT_BASE_FARE || "25.00"),
      mileageRate: parseFloat(process.env.TRANSPORT_MILEAGE_RATE || "2.50"),
      hourlyRate: parseFloat(process.env.HOURLY_RATE_SERVICE_TRANSPORT || "30.00"),
      accessibilitySurcharge: parseFloat(process.env.TRANSPORT_ACCESSIBILITY_SURCHARGE || "10.00"),
      serviceTypeRates: {
        MEDICAL_APPOINTMENT: { baseFare: 30.00 },
        SOCIAL_ACTIVITY: { baseFare: 25.00 },
        SHOPPING: { baseFare: 25.00 },
        WORK: { baseFare: 35.00 },
        EDUCATION: { baseFare: 25.00 },
        AGED_CARE_SERVICE: { baseFare: 30.00 },
        OTHER: {},
      },
    };
  }

  /**
   * Calculate transport booking cost
   */
  async calculateBookingCost(booking: {
    serviceType: TransportServiceType;
    mileage?: number | null;
    duration?: number | null; // Minutes
    accessibilityRequirements: string[];
  }): Promise<{
    baseFare: number;
    mileageCharge: number;
    timeCharge: number;
    accessibilitySurcharge: number;
    totalCost: number;
  }> {
    const serviceRates = this.config.serviceTypeRates[booking.serviceType] || {};

    const baseFare = serviceRates.baseFare || this.config.baseFare;
    const mileageRate = serviceRates.mileageRate || this.config.mileageRate;
    const hourlyRate = serviceRates.hourlyRate || this.config.hourlyRate;

    // Calculate mileage charge
    const mileage = booking.mileage ? Number(booking.mileage) : 0;
    const mileageCharge = mileage * mileageRate;

    // Calculate time charge (convert minutes to hours)
    const durationHours = booking.duration ? booking.duration / 60 : 0;
    const timeCharge = durationHours * hourlyRate;

    // Calculate accessibility surcharge (per requirement, max 3x)
    const accessibilityCount = Math.min(booking.accessibilityRequirements.length, 3);
    const accessibilitySurcharge = accessibilityCount * this.config.accessibilitySurcharge;

    const totalCost = baseFare + mileageCharge + timeCharge + accessibilitySurcharge;

    return {
      baseFare,
      mileageCharge,
      timeCharge,
      accessibilitySurcharge,
      totalCost,
    };
  }

  /**
   * Finalize booking billing when trip is completed
   */
  async finalizeBookingBilling(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.transportBooking.findUnique({
        where: { id: bookingId },
        include: {
          participant: true,
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status !== "COMPLETED") {
        throw new Error("Booking must be completed before billing");
      }

      // Calculate actual costs based on completed trip
      const mileage = booking.mileage ? Number(booking.mileage) : 0;
      const duration = booking.duration || 0;

      // Calculate actual pickup to dropoff duration if times are available
      if (booking.actualPickupTime && booking.actualDropoffTime) {
        const actualDuration = Math.round(
          (booking.actualDropoffTime.getTime() - booking.actualPickupTime.getTime()) / (1000 * 60)
        );
        duration = actualDuration;
      }

      const costBreakdown = await this.calculateBookingCost({
        serviceType: booking.serviceType,
        mileage: mileage > 0 ? mileage : undefined,
        duration: duration > 0 ? duration : undefined,
        accessibilityRequirements: booking.accessibilityRequirements,
      });

      // Update booking with final costs
      await prisma.transportBooking.update({
        where: { id: bookingId },
        data: {
          baseFare: costBreakdown.baseFare,
          mileageRate: this.config.mileageRate,
          accessibilitySurcharge: costBreakdown.accessibilitySurcharge,
          totalCost: costBreakdown.totalCost,
          mileage: mileage > 0 ? mileage : undefined,
          duration: duration > 0 ? duration : undefined,
        },
      });

      // Track service hours for usage billing
      if (duration > 0 && booking.driverId) {
        const driver = await prisma.worker.findUnique({
          where: { id: booking.driverId },
          select: { userId: true },
        });

        if (driver) {
          await serviceHoursTracker.trackServiceHours({
            workerId: booking.driverId,
            participantId: booking.participantId,
            serviceType: "transport",
            startTime: booking.actualPickupTime || booking.scheduledPickupTime,
            endTime: booking.actualDropoffTime || booking.scheduledDropoffTime || new Date(),
            notes: `Transport booking ${booking.bookingNumber}`,
            metadata: {
              bookingId,
              bookingNumber: booking.bookingNumber,
              serviceType: booking.serviceType,
              mileage,
              accessibilityRequirements: booking.accessibilityRequirements,
            },
          });
        }
      }

      // Get or create current billing period for participant
      const period = await usageBillingService.getOrCreateCurrentPeriod(booking.participantId);

      // Link booking to billing period
      await prisma.transportBooking.update({
        where: { id: bookingId },
        data: { billingPeriodId: period.id },
      });

      logger.info("Transport booking billing finalized", {
        bookingId,
        totalCost: costBreakdown.totalCost,
        billingPeriodId: period.id,
      });
    } catch (error) {
      logger.error("Error finalizing transport booking billing", { error, bookingId });
      throw error;
    }
  }

  /**
   * Generate invoice for transport bookings in billing period
   */
  async generateTransportInvoice(billingPeriodId: string): Promise<any> {
    try {
      const period = await prisma.usageBillingPeriod.findUnique({
        where: { id: billingPeriodId },
        include: {
          transportBookings: {
            where: { status: "COMPLETED" },
          },
        },
      });

      if (!period) {
        throw new Error("Billing period not found");
      }

      if (period.transportBookings.length === 0) {
        return null; // No bookings to invoice
      }

      const totalTransportCost = period.transportBookings.reduce(
        (sum, booking) => sum + Number(booking.totalCost),
        0
      );

      // Create invoice line items for transport services
      const lineItems = period.transportBookings.map((booking) => ({
        description: `Transport ${booking.bookingNumber} - ${booking.serviceType}`,
        quantity: 1,
        unitPrice: Number(booking.totalCost),
        total: Number(booking.totalCost),
        serviceType: "transport",
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          serviceType: booking.serviceType,
          mileage: booking.mileage,
          duration: booking.duration,
        },
      }));

      // Generate invoice using billing service
      const invoice = await usageBillingService.generateInvoiceFromPeriod(billingPeriodId);

      // Update transport bookings with invoice ID
      await prisma.transportBooking.updateMany({
        where: {
          id: { in: period.transportBookings.map((b) => b.id) },
        },
        data: { invoiceId: invoice.id },
      });

      logger.info("Transport invoice generated", {
        billingPeriodId,
        invoiceId: invoice.id,
        bookingCount: period.transportBookings.length,
        totalCost: totalTransportCost,
      });

      return invoice;
    } catch (error) {
      logger.error("Error generating transport invoice", { error, billingPeriodId });
      throw error;
    }
  }

  /**
   * Get billing summary for participant's transport services
   */
  async getTransportBillingSummary(
    participantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalBookings: number;
    completedBookings: number;
    totalCost: number;
    averageCostPerBooking: number;
    byServiceType: Record<string, { count: number; totalCost: number }>;
  }> {
    const where: any = { participantId };
    if (startDate || endDate) {
      where.scheduledPickupTime = {};
      if (startDate) where.scheduledPickupTime.gte = startDate;
      if (endDate) where.scheduledPickupTime.lte = endDate;
    }

    const bookings = await prisma.transportBooking.findMany({
      where,
      select: {
        serviceType: true,
        status: true,
        totalCost: true,
      },
    });

    const completed = bookings.filter((b) => b.status === "COMPLETED");
    const totalCost = completed.reduce((sum, b) => sum + Number(b.totalCost), 0);

    const byServiceType: Record<string, { count: number; totalCost: number }> = {};
    for (const booking of completed) {
      const type = booking.serviceType;
      if (!byServiceType[type]) {
        byServiceType[type] = { count: 0, totalCost: 0 };
      }
      byServiceType[type].count++;
      byServiceType[type].totalCost += Number(booking.totalCost);
    }

    return {
      totalBookings: bookings.length,
      completedBookings: completed.length,
      totalCost,
      averageCostPerBooking: completed.length > 0 ? totalCost / completed.length : 0,
      byServiceType,
    };
  }
}

// Export singleton instance
export const transportBillingService = new TransportBillingService();
