/**
 * Communication Service
 * Unified service for SMS, email, and calendar communications
 * Uses adapter pattern to support multiple providers
 */

import { SMSAdapter, SMSMessage, SMSResult } from "./adapters/sms-adapter";
import { EmailAdapter, EmailMessage, EmailResult } from "./adapters/email-adapter";
import { CalendarAdapter, CalendarInviteRequest, CalendarExportRequest, CalendarImportRequest, CalendarResult } from "./adapters/calendar-adapter";
import { TwilioSMSAdapter } from "./adapters/twilio-sms-adapter";
import { SendGridEmailAdapter } from "./adapters/sendgrid-email-adapter";
import { ICalendarAdapter } from "./adapters/icalendar-adapter";
import { GoogleCalendarAdapter } from "./adapters/google-calendar-adapter";
import { OutlookCalendarAdapter } from "./adapters/outlook-calendar-adapter";
import { logger } from "@/lib/logger";

export interface CommunicationConfig {
  sms?: {
    provider: "twilio" | "mock";
    config?: any;
  };
  email?: {
    provider: "sendgrid" | "mock";
    config?: any;
  };
  calendar?: {
    provider: "icalendar" | "google" | "outlook";
    config?: any;
  };
}

/**
 * Communication Service
 * Unified interface for all communication channels
 */
export class CommunicationService {
  private smsAdapter?: SMSAdapter;
  private emailAdapter?: EmailAdapter;
  private calendarAdapter?: CalendarAdapter;

  constructor(config?: CommunicationConfig) {
    // Initialize SMS adapter
    if (config?.sms?.provider === "twilio") {
      this.smsAdapter = new TwilioSMSAdapter(config.sms.config);
    }

    // Initialize email adapter
    if (config?.email?.provider === "sendgrid" || !config?.email) {
      this.emailAdapter = new SendGridEmailAdapter();
    }

    // Initialize calendar adapter
    const calendarProvider = config?.calendar?.provider || "icalendar";
    if (calendarProvider === "google") {
      this.calendarAdapter = new GoogleCalendarAdapter(config.calendar.config);
    } else if (calendarProvider === "outlook") {
      this.calendarAdapter = new OutlookCalendarAdapter(config.calendar.config);
    } else {
      // Default to iCalendar adapter
      this.calendarAdapter = new ICalendarAdapter();
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    if (!this.smsAdapter) {
      return {
        success: false,
        error: "SMS adapter not configured",
      };
    }

    if (!this.smsAdapter.isEnabled()) {
      return {
        success: false,
        error: "SMS service not enabled",
      };
    }

    return this.smsAdapter.sendMessage(message);
  }

  /**
   * Send email message
   */
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!this.emailAdapter) {
      return {
        success: false,
        error: "Email adapter not configured",
      };
    }

    if (!this.emailAdapter.isEnabled()) {
      return {
        success: false,
        error: "Email service not enabled",
      };
    }

    return this.emailAdapter.sendEmail(message);
  }

  /**
   * Send calendar invite via email
   */
  async sendCalendarInvite(request: CalendarInviteRequest): Promise<CalendarResult> {
    if (!this.calendarAdapter) {
      return {
        success: false,
        error: "Calendar adapter not configured",
      };
    }

    return this.calendarAdapter.sendInvite(request);
  }

  /**
   * Export calendar event(s) as iCal file
   */
  async exportCalendar(request: CalendarExportRequest): Promise<CalendarResult> {
    if (!this.calendarAdapter) {
      return {
        success: false,
        error: "Calendar adapter not configured",
      };
    }

    return this.calendarAdapter.exportEvent(request);
  }

  /**
   * Import calendar event from iCal content
   */
  async importCalendar(request: CalendarImportRequest): Promise<CalendarResult> {
    if (!this.calendarAdapter) {
      return {
        success: false,
        error: "Calendar adapter not configured",
      };
    }

    return this.calendarAdapter.importEvent(request);
  }

  /**
   * Check communication service availability
   */
  getServiceStatus(): {
    sms: { enabled: boolean; provider?: string };
    email: { enabled: boolean; provider?: string };
    calendar: { enabled: boolean; provider?: string };
  } {
    return {
      sms: {
        enabled: this.smsAdapter?.isEnabled() || false,
        provider: this.smsAdapter ? "twilio" : undefined,
      },
      email: {
        enabled: this.emailAdapter?.isEnabled() || false,
        provider: this.emailAdapter ? "sendgrid" : undefined,
      },
      calendar: {
        enabled: this.calendarAdapter?.isEnabled() || false,
        provider: this.calendarAdapter ? "icalendar" : undefined,
      },
    };
  }
}

// Export default instance
export const communicationService = new CommunicationService();
