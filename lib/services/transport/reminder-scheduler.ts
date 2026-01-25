/**
 * Transport Reminder Scheduler
 * Schedules and manages SMS reminders for transport bookings
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { transportSMSNotificationService } from "./sms-notification-service";
import { TransportBookingStatus } from "@prisma/client";

export interface ReminderSchedule {
  bookingId: string;
  reminderType: "24_HOURS" | "2_HOURS" | "30_MINUTES";
  scheduledTime: Date;
  sent: boolean;
  sentAt?: Date;
}

/**
 * Transport Reminder Scheduler
 */
export class ReminderScheduler {
  /**
   * Schedule reminders for a booking
   */
  async scheduleReminders(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.transportBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      const scheduledPickupTime = booking.scheduledPickupTime;
      const reminders: ReminderSchedule[] = [];

      // 24 hours before
      const reminder24h = new Date(scheduledPickupTime);
      reminder24h.setHours(reminder24h.getHours() - 24);
      if (reminder24h > new Date()) {
        reminders.push({
          bookingId,
          reminderType: "24_HOURS",
          scheduledTime: reminder24h,
          sent: false,
        });
      }

      // 2 hours before
      const reminder2h = new Date(scheduledPickupTime);
      reminder2h.setHours(reminder2h.getHours() - 2);
      if (reminder2h > new Date()) {
        reminders.push({
          bookingId,
          reminderType: "2_HOURS",
          scheduledTime: reminder2h,
          sent: false,
        });
      }

      // 30 minutes before
      const reminder30m = new Date(scheduledPickupTime);
      reminder30m.setMinutes(reminder30m.getMinutes() - 30);
      if (reminder30m > new Date()) {
        reminders.push({
          bookingId,
          reminderType: "30_MINUTES",
          scheduledTime: reminder30m,
          sent: false,
        });
      }

      // Store reminders in booking metadata
      const metadata = (booking.metadata as any) || {};
      metadata.reminders = reminders;

      await prisma.transportBooking.update({
        where: { id: bookingId },
        data: { metadata },
      });

      logger.info("Reminders scheduled", {
        bookingId,
        reminderCount: reminders.length,
      });
    } catch (error) {
      logger.error("Error scheduling reminders", { error, bookingId });
      throw error;
    }
  }

  /**
   * Process pending reminders (should be called by cron job)
   */
  async processPendingReminders(): Promise<{
    processed: number;
    sent: number;
    errors: number;
  }> {
    try {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

      // Get all bookings with scheduled reminders
      const bookings = await prisma.transportBooking.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          scheduledPickupTime: { gte: now },
        },
      });

      let processed = 0;
      let sent = 0;
      let errors = 0;

      for (const booking of bookings) {
        const metadata = (booking.metadata as any) || {};
        const reminders: ReminderSchedule[] = metadata.reminders || [];

        for (const reminder of reminders) {
          if (
            !reminder.sent &&
            reminder.scheduledTime <= cutoffTime &&
            reminder.scheduledTime <= now
          ) {
            processed++;

            try {
              const result = await transportSMSNotificationService.sendReminder(
                booking.id,
                reminder.reminderType
              );

              if (result.success) {
                reminder.sent = true;
                reminder.sentAt = new Date();
                sent++;

                // Update booking metadata
                await prisma.transportBooking.update({
                  where: { id: booking.id },
                  data: {
                    metadata: {
                      ...metadata,
                      reminders,
                    } as any,
                  },
                });
              } else {
                errors++;
                logger.warn("Failed to send reminder", {
                  bookingId: booking.id,
                  reminderType: reminder.reminderType,
                  error: result.error,
                });
              }
            } catch (error) {
              errors++;
              logger.error("Error processing reminder", {
                error,
                bookingId: booking.id,
                reminderType: reminder.reminderType,
              });
            }
          }
        }
      }

      logger.info("Processed pending reminders", {
        processed,
        sent,
        errors,
        totalBookings: bookings.length,
      });

      return { processed, sent, errors };
    } catch (error) {
      logger.error("Error processing pending reminders", { error });
      throw error;
    }
  }

  /**
   * Cancel reminders for a cancelled booking
   */
  async cancelReminders(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.transportBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return;
      }

      const metadata = (booking.metadata as any) || {};
      const reminders: ReminderSchedule[] = metadata.reminders || [];

      // Mark unsent reminders as cancelled
      const updatedReminders = reminders.map((r) => ({
        ...r,
        cancelled: !r.sent,
      }));

      await prisma.transportBooking.update({
        where: { id: bookingId },
        data: {
          metadata: {
            ...metadata,
            reminders: updatedReminders,
          } as any,
        },
      });

      logger.info("Reminders cancelled", { bookingId });
    } catch (error) {
      logger.error("Error cancelling reminders", { error, bookingId });
    }
  }

  /**
   * Get reminder status for a booking
   */
  async getReminderStatus(bookingId: string): Promise<{
    scheduled: ReminderSchedule[];
    sent: ReminderSchedule[];
    pending: ReminderSchedule[];
  }> {
    const booking = await prisma.transportBooking.findUnique({
      where: { id: bookingId },
      select: { metadata: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const metadata = (booking.metadata as any) || {};
    const reminders: ReminderSchedule[] = metadata.reminders || [];

    return {
      scheduled: reminders,
      sent: reminders.filter((r) => r.sent),
      pending: reminders.filter((r) => !r.sent && new Date(r.scheduledTime) > new Date()),
    };
  }
}

// Export singleton instance
export const reminderScheduler = new ReminderScheduler();
