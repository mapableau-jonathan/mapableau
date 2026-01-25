/**
 * iCalendar Adapter
 * Concrete implementation of CalendarAdapter using iCalendar format
 */

import { CalendarAdapter, CalendarInviteRequest, CalendarExportRequest, CalendarImportRequest, CalendarResult } from "./calendar-adapter";
import { generateICalendar, parseICalendar, CalendarEvent } from "../ical-service";
import { SendGridEmailAdapter } from "./sendgrid-email-adapter";
import { logger } from "@/lib/logger";

/**
 * iCalendar Adapter
 */
export class ICalendarAdapter implements CalendarAdapter {
  private emailAdapter: SendGridEmailAdapter;

  constructor() {
    this.emailAdapter = new SendGridEmailAdapter();
  }

  async sendInvite(request: CalendarInviteRequest): Promise<CalendarResult> {
    try {
      if (!this.emailAdapter.isEnabled()) {
        return {
          success: false,
          error: "Email service not configured",
        };
      }

      const icalContent = generateICalendar(request.event);

      const emailResult = await this.emailAdapter.sendEmail({
        to: request.recipientEmail,
        subject: request.subject || `Calendar Invite: ${request.event.summary}`,
        text: request.text || `You are invited to: ${request.event.summary}\n\nPlease see attached calendar invite.`,
        html: request.html || `<p>You are invited to: <strong>${request.event.summary}</strong></p><p>Please see attached calendar invite.</p>`,
        attachments: [
          {
            content: Buffer.from(icalContent).toString("base64"),
            filename: "invite.ics",
            type: "text/calendar",
          },
        ],
      });

      return {
        success: emailResult.success,
        messageId: emailResult.messageId,
        error: emailResult.error,
      };
    } catch (error: any) {
      logger.error("iCalendar adapter send invite error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to send calendar invite",
      };
    }
  }

  async exportEvent(request: CalendarExportRequest): Promise<CalendarResult> {
    try {
      if (Array.isArray(request.event)) {
        // Multiple events - generate multi-event iCal
        const lines: string[] = [];
        lines.push("BEGIN:VCALENDAR");
        lines.push("VERSION:2.0");
        lines.push("PRODID:-//MapAble//Calendar Export//EN");
        lines.push("CALSCALE:GREGORIAN");

        for (const event of request.event) {
          const eventIcal = generateICalendar(event);
          const eventLines = eventIcal.split("\r\n");
          const beginIndex = eventLines.indexOf("BEGIN:VEVENT");
          const endIndex = eventLines.lastIndexOf("END:VEVENT");
          if (beginIndex !== -1 && endIndex !== -1) {
            lines.push(...eventLines.slice(beginIndex, endIndex + 1));
          }
        }

        lines.push("END:VCALENDAR");
        const icalContent = lines.join("\r\n");

        return {
          success: true,
          icalContent,
          filename: request.filename || `calendar-${Date.now()}.ics`,
        };
      } else {
        // Single event
        const icalContent = generateICalendar(request.event);

        return {
          success: true,
          icalContent,
          filename: request.filename || `${request.event.summary.replace(/[^a-z0-9]/gi, "_")}.ics`,
        };
      }
    } catch (error: any) {
      logger.error("iCalendar adapter export error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to export calendar event",
      };
    }
  }

  async importEvent(request: CalendarImportRequest): Promise<CalendarResult> {
    try {
      const event = parseICalendar(request.icalContent);

      if (!event) {
        return {
          success: false,
          error: "Failed to parse calendar event",
        };
      }

      return {
        success: true,
        event,
      };
    } catch (error: any) {
      logger.error("iCalendar adapter import error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to import calendar event",
      };
    }
  }

  isEnabled(): boolean {
    return true; // iCalendar format is always available
  }
}
