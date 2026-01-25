/**
 * Calendar Adapter Interface
 * Abstraction for calendar integration providers
 */

import { CalendarEvent } from "../ical-service";

export interface CalendarInviteRequest {
  event: CalendarEvent;
  recipientEmail: string | string[];
  subject?: string;
  text?: string;
  html?: string;
}

export interface CalendarExportRequest {
  event: CalendarEvent | CalendarEvent[];
  filename?: string;
}

export interface CalendarImportRequest {
  icalContent: string;
}

export interface CalendarResult {
  success: boolean;
  messageId?: string;
  icalContent?: string;
  filename?: string;
  event?: CalendarEvent;
  error?: string;
}

/**
 * Calendar Adapter Interface
 */
export interface CalendarAdapter {
  /**
   * Send calendar invite via email
   */
  sendInvite(request: CalendarInviteRequest): Promise<CalendarResult>;

  /**
   * Export calendar event as iCal file
   */
  exportEvent(request: CalendarExportRequest): Promise<CalendarResult>;

  /**
   * Import calendar event from iCal content
   */
  importEvent(request: CalendarImportRequest): Promise<CalendarResult>;

  /**
   * Check if adapter is enabled/configured
   */
  isEnabled(): boolean;
}
