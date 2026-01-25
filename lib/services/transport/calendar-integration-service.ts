/**
 * Transport Calendar Integration Service
 * Handles calendar integration for transport bookings
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { twilioEmailService } from "../communication/twilio-email-service";
import { generateTransportBookingCalendar, generateICalendar, CalendarEvent } from "../communication/ical-service";
import { TransportBookingService } from "./booking-service";

/**
 * Transport Calendar Integration Service
 */
export class TransportCalendarIntegrationService {
  private bookingService: TransportBookingService;

  constructor() {
    this.bookingService = new TransportBookingService();
  }

  /**
   * Send calendar invite for transport booking via email
   */
  async sendCalendarInvite(
    bookingId: string,
    recipientEmail?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking || !booking.participant) {
        throw new Error("Booking or participant not found");
      }

      const participantEmail = recipientEmail || booking.participant.email;
      if (!participantEmail) {
        return {
          success: false,
          error: "Participant email not found",
        };
      }

      // Generate calendar event
      const calendarEvent = generateTransportBookingCalendar({
        bookingNumber: booking.bookingNumber,
        participantName: booking.participant.name || "Participant",
        participantEmail,
        pickupLocation: booking.pickupLocation as any,
        dropoffLocation: booking.dropoffLocation as any,
        scheduledPickupTime: booking.scheduledPickupTime,
        scheduledDropoffTime: booking.scheduledDropoffTime || undefined,
        serviceType: booking.serviceType,
        accessibilityRequirements: booking.accessibilityRequirements,
        notes: booking.notes || undefined,
      }, process.env.TWILIO_SENDGRID_FROM_EMAIL);

      // Send email with calendar attachment
      const result = await twilioEmailService.sendCalendarInvite(
        participantEmail,
        calendarEvent,
        {
          subject: `Transport Booking Confirmation: ${booking.bookingNumber}`,
          text: `Your transport booking ${booking.bookingNumber} has been confirmed. Please see the attached calendar invite for details.`,
          html: `
            <h2>Transport Booking Confirmation</h2>
            <p>Your transport booking <strong>${booking.bookingNumber}</strong> has been confirmed.</p>
            <p><strong>Pickup:</strong> ${booking.scheduledPickupTime.toLocaleString("en-AU")}</p>
            <p><strong>From:</strong> ${(booking.pickupLocation as any).address}</p>
            <p><strong>To:</strong> ${(booking.dropoffLocation as any).address}</p>
            <p>Please see the attached calendar invite to add this to your calendar.</p>
          `,
        }
      );

      if (result.success) {
        logger.info("Calendar invite sent", {
          bookingId,
          participantEmail,
        });
      }

      return result;
    } catch (error: any) {
      logger.error("Error sending calendar invite", { error, bookingId });
      return {
        success: false,
        error: error.message || "Failed to send calendar invite",
      };
    }
  }

  /**
   * Export booking as iCalendar file (download)
   */
  async exportBookingAsICal(bookingId: string): Promise<{
    icalContent: string;
    filename: string;
  } | null> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking || !booking.participant) {
        return null;
      }

      const calendarEvent = generateTransportBookingCalendar({
        bookingNumber: booking.bookingNumber,
        participantName: booking.participant.name || "Participant",
        participantEmail: booking.participant.email,
        pickupLocation: booking.pickupLocation as any,
        dropoffLocation: booking.dropoffLocation as any,
        scheduledPickupTime: booking.scheduledPickupTime,
        scheduledDropoffTime: booking.scheduledDropoffTime || undefined,
        serviceType: booking.serviceType,
        accessibilityRequirements: booking.accessibilityRequirements,
        notes: booking.notes || undefined,
      });

      const icalContent = generateICalendar(calendarEvent);
      const filename = `transport-booking-${booking.bookingNumber}.ics`;

      return {
        icalContent,
        filename,
      };
    } catch (error) {
      logger.error("Error exporting booking as iCal", { error, bookingId });
      return null;
    }
  }

  /**
   * Bulk export multiple bookings as iCalendar
   */
  async exportMultipleBookingsAsICal(bookingIds: string[]): Promise<{
    icalContent: string;
    filename: string;
  } | null> {
    try {
      const events: CalendarEvent[] = [];

      for (const bookingId of bookingIds) {
        const booking = await this.bookingService.getBooking(bookingId);
        if (!booking || !booking.participant) {
          continue;
        }

        const calendarEvent = generateTransportBookingCalendar({
          bookingNumber: booking.bookingNumber,
          participantName: booking.participant.name || "Participant",
          participantEmail: booking.participant.email,
          pickupLocation: booking.pickupLocation as any,
          dropoffLocation: booking.dropoffLocation as any,
          scheduledPickupTime: booking.scheduledPickupTime,
          scheduledDropoffTime: booking.scheduledDropoffTime || undefined,
          serviceType: booking.serviceType,
          accessibilityRequirements: booking.accessibilityRequirements,
          notes: booking.notes || undefined,
        });

        events.push(calendarEvent);
      }

      if (events.length === 0) {
        return null;
      }

      // Generate multi-event iCalendar
      const lines: string[] = [];
      lines.push("BEGIN:VCALENDAR");
      lines.push("VERSION:2.0");
      lines.push("PRODID:-//MapAble//Transport Bookings//EN");
      lines.push("CALSCALE:GREGORIAN");

      for (const event of events) {
        const eventIcal = generateICalendar(event);
        // Extract VEVENT section from generated iCal
        const eventLines = eventIcal.split("\r\n");
        const beginIndex = eventLines.indexOf("BEGIN:VEVENT");
        const endIndex = eventLines.lastIndexOf("END:VEVENT");
        if (beginIndex !== -1 && endIndex !== -1) {
          lines.push(...eventLines.slice(beginIndex, endIndex + 1));
        }
      }

      lines.push("END:VCALENDAR");
      const icalContent = lines.join("\r\n");
      const filename = `transport-bookings-${Date.now()}.ics`;

      return {
        icalContent,
        filename,
      };
    } catch (error) {
      logger.error("Error exporting multiple bookings as iCal", { error, bookingIds });
      return null;
    }
  }

  /**
   * Import calendar event and create transport booking
   */
  async importCalendarEvent(
    icalContent: string,
    participantId: string
  ): Promise<{ bookingId?: string; error?: string }> {
    try {
      const { parseICalendar } = await import("../communication/ical-service");
      const event = parseICalendar(icalContent);

      if (!event) {
        return {
          error: "Failed to parse calendar event",
        };
      }

      // Extract location from event description or location field
      const description = event.description || "";
      const pickupMatch = description.match(/From:\s*(.+?)(?:\n|$)/);
      const dropoffMatch = description.match(/To:\s*(.+?)(?:\n|$)/);

      const pickupAddress = pickupMatch ? pickupMatch[1].trim() : event.location || "";
      const dropoffAddress = dropoffMatch ? dropoffMatch[1].trim() : "";

      if (!pickupAddress || !dropoffAddress) {
        return {
          error: "Could not extract pickup and dropoff locations from calendar event",
        };
      }

      // Parse accessibility requirements if mentioned
      const accessibilityMatch = description.match(/Accessibility Requirements:\s*(.+?)(?:\n|$)/);
      const accessibilityRequirements = accessibilityMatch
        ? accessibilityMatch[1].split(",").map((s) => s.trim())
        : [];

      // Create booking from calendar event
      const booking = await this.bookingService.createBooking({
        participantId,
        serviceType: "OTHER", // Default, could be parsed from description
        pickupLocation: {
          address: pickupAddress,
          latitude: 0, // Would need geocoding
          longitude: 0,
        },
        dropoffLocation: {
          address: dropoffAddress,
          latitude: 0,
          longitude: 0,
        },
        scheduledPickupTime: event.startTime,
        scheduledDropoffTime: event.endTime,
        accessibilityRequirements,
        notes: event.description,
        metadata: {
          importedFromCalendar: true,
          originalUID: event.uid,
        },
      });

      return {
        bookingId: booking.id,
      };
    } catch (error: any) {
      logger.error("Error importing calendar event", { error, participantId });
      return {
        error: error.message || "Failed to import calendar event",
      };
    }
  }
}

// Export singleton instance
export const transportCalendarIntegrationService = new TransportCalendarIntegrationService();
