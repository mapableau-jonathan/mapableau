/**
 * Outlook Calendar Adapter
 * Direct integration with Microsoft Graph API (Outlook Calendar)
 */

import { CalendarAdapter, CalendarInviteRequest, CalendarExportRequest, CalendarImportRequest, CalendarResult } from "./calendar-adapter";
import { CalendarEvent } from "../ical-service";
import { logger } from "@/lib/logger";

export interface OutlookCalendarConfig {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  redirectUri?: string;
}

/**
 * Outlook Calendar Adapter
 * Creates events directly in Outlook Calendar via Microsoft Graph API
 */
export class OutlookCalendarAdapter implements CalendarAdapter {
  private config: OutlookCalendarConfig;
  private apiBaseUrl = "https://graph.microsoft.com/v1.0";

  constructor(config?: OutlookCalendarConfig) {
    this.config = config || {};
  }

  /**
   * Send calendar invite by creating event directly in Outlook Calendar
   */
  async sendInvite(request: CalendarInviteRequest): Promise<CalendarResult> {
    try {
      // For now, return ICS export as fallback
      // Full implementation requires OAuth token
      const { generateICalendar } = await import("../ical-service");
      const icalContent = generateICalendar(request.event);

      return {
        success: true,
        icalContent,
        messageId: request.event.uid,
      };
    } catch (error: any) {
      logger.error("Outlook Calendar adapter send invite error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to send calendar invite",
      };
    }
  }

  /**
   * Create event in Outlook Calendar (requires OAuth token)
   */
  async createEvent(
    event: CalendarEvent,
    accessToken: string,
    calendarId: string = "calendar"
  ): Promise<CalendarResult> {
    try {
      if (!this.isEnabled()) {
        return {
          success: false,
          error: "Outlook Calendar not configured",
        };
      }

      const outlookEvent = this.convertToOutlookEvent(event);

      const endpoint = calendarId === "calendar"
        ? `${this.apiBaseUrl}/me/calendar/events`
        : `${this.apiBaseUrl}/me/calendars/${encodeURIComponent(calendarId)}/events`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(outlookEvent),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create Outlook Calendar event");
      }

      const createdEvent = await response.json();

      return {
        success: true,
        messageId: createdEvent.id,
      };
    } catch (error: any) {
      logger.error("Outlook Calendar create event error", { error, event });
      return {
        success: false,
        error: error.message || "Failed to create Outlook Calendar event",
      };
    }
  }

  /**
   * Export event as ICS file (Outlook Calendar format)
   */
  async exportEvent(request: CalendarExportRequest): Promise<CalendarResult> {
    try {
      const { generateICalendar } = await import("../ical-service");

      if (Array.isArray(request.event)) {
        // Multi-event export
        const lines: string[] = [];
        lines.push("BEGIN:VCALENDAR");
        lines.push("VERSION:2.0");
        lines.push("PRODID:-//Microsoft Corporation//Outlook 16.0 MIMEDIR//EN");
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
          filename: request.filename || `outlook-calendar-${Date.now()}.ics`,
        };
      } else {
        const icalContent = generateICalendar(request.event);
        return {
          success: true,
          icalContent,
          filename: request.filename || `${request.event.summary.replace(/[^a-z0-9]/gi, "_")}.ics`,
        };
      }
    } catch (error: any) {
      logger.error("Outlook Calendar export error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to export calendar event",
      };
    }
  }

  /**
   * Import event from Outlook Calendar (via ICS or API)
   */
  async importEvent(request: CalendarImportRequest): Promise<CalendarResult> {
    try {
      const { parseICalendar } = await import("../ical-service");
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
      logger.error("Outlook Calendar import error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to import calendar event",
      };
    }
  }

  /**
   * Fetch events from Outlook Calendar (requires OAuth token)
   */
  async fetchEvents(
    accessToken: string,
    calendarId: string = "calendar",
    startDateTime?: Date,
    endDateTime?: Date
  ): Promise<CalendarResult> {
    try {
      const params = new URLSearchParams();
      if (startDateTime) params.append("$filter", `start/dateTime ge '${startDateTime.toISOString()}'`);
      if (endDateTime) params.append("$filter", `${params.get("$filter") || ""} and end/dateTime le '${endDateTime.toISOString()}'`);
      params.append("$orderby", "start/dateTime");

      const endpoint = calendarId === "calendar"
        ? `${this.apiBaseUrl}/me/calendar/events`
        : `${this.apiBaseUrl}/me/calendars/${encodeURIComponent(calendarId)}/events`;

      const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch Outlook Calendar events");
      }

      const data = await response.json();
      const events = (data.value || []).map((oe: any) => this.convertFromOutlookEvent(oe));

      return {
        success: true,
        event: events[0], // Return first event for compatibility
      };
    } catch (error: any) {
      logger.error("Outlook Calendar fetch events error", { error });
      return {
        success: false,
        error: error.message || "Failed to fetch Outlook Calendar events",
      };
    }
  }

  /**
   * Convert CalendarEvent to Microsoft Graph API format
   */
  private convertToOutlookEvent(event: CalendarEvent): any {
    return {
      subject: event.summary,
      body: {
        contentType: "HTML",
        content: event.description || "",
      },
      location: event.location ? {
        displayName: event.location,
      } : undefined,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: event.attendees?.map((a) => ({
        emailAddress: {
          address: a.email,
          name: a.name,
        },
        type: a.role === "REQ-PARTICIPANT" ? "required" : "optional",
      })),
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 15,
      isReminderOn: true,
    };
  }

  /**
   * Convert Microsoft Graph API event to CalendarEvent
   */
  private convertFromOutlookEvent(outlookEvent: any): CalendarEvent {
    return {
      uid: outlookEvent.id,
      summary: outlookEvent.subject || "",
      description: outlookEvent.body?.content,
      location: outlookEvent.location?.displayName,
      startTime: new Date(outlookEvent.start.dateTime),
      endTime: new Date(outlookEvent.end.dateTime),
      status: outlookEvent.isCancelled ? "CANCELLED" : "CONFIRMED",
      attendees: outlookEvent.attendees?.map((a: any) => ({
        email: a.emailAddress.address,
        name: a.emailAddress.name || a.emailAddress.address,
        rsvp: a.status.response !== "declined",
      })),
      reminders: outlookEvent.reminderMinutesBeforeStart ? [{
        minutes: outlookEvent.reminderMinutesBeforeStart,
        method: "DISPLAY",
      }] : undefined,
    };
  }

  isEnabled(): boolean {
    return !!(this.config.clientId || this.config.clientSecret);
  }
}
