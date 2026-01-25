/**
 * Google Calendar Adapter
 * Direct integration with Google Calendar API
 */

import { CalendarAdapter, CalendarInviteRequest, CalendarExportRequest, CalendarImportRequest, CalendarResult } from "./calendar-adapter";
import { CalendarEvent } from "../ical-service";
import { logger } from "@/lib/logger";

export interface GoogleCalendarConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  apiKey?: string;
}

/**
 * Google Calendar Adapter
 * Creates events directly in Google Calendar via API
 */
export class GoogleCalendarAdapter implements CalendarAdapter {
  private config: GoogleCalendarConfig;
  private apiBaseUrl = "https://www.googleapis.com/calendar/v3";

  constructor(config?: GoogleCalendarConfig) {
    this.config = config || {};
  }

  /**
   * Send calendar invite by creating event directly in Google Calendar
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
      logger.error("Google Calendar adapter send invite error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to send calendar invite",
      };
    }
  }

  /**
   * Create event in Google Calendar (requires OAuth token)
   */
  async createEvent(
    event: CalendarEvent,
    accessToken: string,
    calendarId: string = "primary"
  ): Promise<CalendarResult> {
    try {
      if (!this.isEnabled()) {
        return {
          success: false,
          error: "Google Calendar not configured",
        };
      }

      const googleEvent = this.convertToGoogleEvent(event);

      const response = await fetch(
        `${this.apiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create Google Calendar event");
      }

      const createdEvent = await response.json();

      return {
        success: true,
        messageId: createdEvent.id,
      };
    } catch (error: any) {
      logger.error("Google Calendar create event error", { error, event });
      return {
        success: false,
        error: error.message || "Failed to create Google Calendar event",
      };
    }
  }

  /**
   * Export event as ICS file (Google Calendar format)
   */
  async exportEvent(request: CalendarExportRequest): Promise<CalendarResult> {
    try {
      const { generateICalendar } = await import("../ical-service");

      if (Array.isArray(request.event)) {
        // Multi-event export
        const lines: string[] = [];
        lines.push("BEGIN:VCALENDAR");
        lines.push("VERSION:2.0");
        lines.push("PRODID:-//Google Inc//Google Calendar 70.9054//EN");
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
          filename: request.filename || `google-calendar-${Date.now()}.ics`,
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
      logger.error("Google Calendar export error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to export calendar event",
      };
    }
  }

  /**
   * Import event from Google Calendar (via ICS or API)
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
      logger.error("Google Calendar import error", { error, request });
      return {
        success: false,
        error: error.message || "Failed to import calendar event",
      };
    }
  }

  /**
   * Fetch events from Google Calendar (requires OAuth token)
   */
  async fetchEvents(
    accessToken: string,
    calendarId: string = "primary",
    timeMin?: Date,
    timeMax?: Date
  ): Promise<CalendarResult> {
    try {
      const params = new URLSearchParams();
      if (timeMin) params.append("timeMin", timeMin.toISOString());
      if (timeMax) params.append("timeMax", timeMax.toISOString());
      params.append("singleEvents", "true");
      params.append("orderBy", "startTime");

      const response = await fetch(
        `${this.apiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to fetch Google Calendar events");
      }

      const data = await response.json();
      const events = (data.items || []).map((ge: any) => this.convertFromGoogleEvent(ge));

      return {
        success: true,
        event: events[0], // Return first event for compatibility
      };
    } catch (error: any) {
      logger.error("Google Calendar fetch events error", { error });
      return {
        success: false,
        error: error.message || "Failed to fetch Google Calendar events",
      };
    }
  }

  /**
   * Convert CalendarEvent to Google Calendar API format
   */
  private convertToGoogleEvent(event: CalendarEvent): any {
    return {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: event.attendees?.map((a) => ({
        email: a.email,
        displayName: a.name,
        responseStatus: "needsAction",
      })),
      reminders: {
        useDefault: false,
        overrides: event.reminders?.map((r) => ({
          method: r.method === "EMAIL" ? "email" : "popup",
          minutes: r.minutes,
        })) || [
          { method: "popup", minutes: 15 },
        ],
      },
    };
  }

  /**
   * Convert Google Calendar API event to CalendarEvent
   */
  private convertFromGoogleEvent(googleEvent: any): CalendarEvent {
    return {
      uid: googleEvent.id,
      summary: googleEvent.summary || "",
      description: googleEvent.description,
      location: googleEvent.location,
      startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
      endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
      status: googleEvent.status?.toUpperCase() as any,
      attendees: googleEvent.attendees?.map((a: any) => ({
        email: a.email,
        name: a.displayName || a.email,
        rsvp: a.responseStatus !== "declined",
      })),
      reminders: googleEvent.reminders?.overrides?.map((r: any) => ({
        minutes: r.minutes,
        method: r.method === "email" ? "EMAIL" : "DISPLAY",
      })),
    };
  }

  isEnabled(): boolean {
    return !!(this.config.clientId || this.config.apiKey);
  }
}
