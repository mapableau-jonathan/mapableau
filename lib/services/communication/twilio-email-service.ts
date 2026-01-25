/**
 * Twilio Email Service (SendGrid)
 * Handles email notifications using Twilio SendGrid
 */

import { logger } from "@/lib/logger";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string; // Base64 encoded
    filename: string;
    type?: string;
  }>;
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Twilio Email Service (SendGrid)
 */
export class TwilioEmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private isEnabled: boolean;

  constructor() {
    this.apiKey = process.env.TWILIO_SENDGRID_API_KEY || process.env.SENDGRID_API_KEY || "";
    this.fromEmail = process.env.TWILIO_SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || "noreply@mapable.com";
    this.fromName = process.env.TWILIO_SENDGRID_FROM_NAME || process.env.FROM_NAME || "MapAble";
    this.isEnabled = !!this.apiKey;
  }

  /**
   * Send email via SendGrid API
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.isEnabled) {
      if (process.env.NODE_ENV === "development") {
        logger.info("Email service mock mode", { to: options.to, subject: options.subject });
        return {
          success: true,
          messageId: `mock_${Date.now()}`,
        };
      }
      return {
        success: false,
        error: "Email service not configured",
      };
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const emailData = {
        personalizations: recipients.map((email) => ({
          to: [{ email }],
          ...(options.templateData && { dynamic_template_data: options.templateData }),
        })),
        from: {
          email: options.from || this.fromEmail,
          name: options.fromName || this.fromName,
        },
        ...(options.replyTo && { reply_to: { email: options.replyTo } }),
        subject: options.subject,
        ...(options.templateId
          ? {
              template_id: options.templateId,
            }
          : {
              content: [
                ...(options.text ? [{ type: "text/plain", value: options.text }] : []),
                ...(options.html ? [{ type: "text/html", value: options.html }] : []),
              ],
            }),
        ...(options.attachments && {
          attachments: options.attachments.map((att) => ({
            content: att.content,
            filename: att.filename,
            type: att.type || "application/octet-stream",
          })),
        }),
      };

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid API error: ${response.status} ${errorText}`);
      }

      const messageId = response.headers.get("x-message-id") || `sg_${Date.now()}`;

      logger.info("Email sent via SendGrid", {
        to: recipients,
        subject: options.subject,
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      logger.error("Failed to send email", { error, options });
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }
  }

  /**
   * Send email with calendar attachment (iCal)
   */
  async sendCalendarInvite(
    to: string | string[],
    event: {
      summary: string;
      description?: string;
      location?: string;
      startTime: Date;
      endTime: Date;
      organizer?: { name: string; email: string };
      attendees?: Array<{ name: string; email: string }>;
      uid?: string;
    },
    options?: {
      subject?: string;
      text?: string;
      html?: string;
    }
  ): Promise<EmailResult> {
    const { generateICalendar } = await import("./ical-service");
    const icalContent = generateICalendar(event);

    return this.sendEmail({
      to,
      subject: options?.subject || `Calendar Invite: ${event.summary}`,
      text: options?.text || `You are invited to: ${event.summary}\n\nPlease see attached calendar invite.`,
      html: options?.html || `<p>You are invited to: <strong>${event.summary}</strong></p><p>Please see attached calendar invite.</p>`,
      attachments: [
        {
          content: Buffer.from(icalContent).toString("base64"),
          filename: "invite.ics",
          type: "text/calendar",
        },
      ],
    });
  }

  /**
   * Check if email service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const twilioEmailService = new TwilioEmailService();
