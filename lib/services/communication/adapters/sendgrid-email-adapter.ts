/**
 * SendGrid Email Adapter
 * Concrete implementation of EmailAdapter using Twilio SendGrid
 */

import { EmailAdapter, EmailMessage, EmailResult } from "./email-adapter";
import { TwilioEmailService } from "../twilio-email-service";
import { logger } from "@/lib/logger";

/**
 * SendGrid Email Adapter
 */
export class SendGridEmailAdapter implements EmailAdapter {
  private emailService: TwilioEmailService;

  constructor() {
    this.emailService = new TwilioEmailService();
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    try {
      const result = await this.emailService.sendEmail({
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        from: message.from,
        fromName: message.fromName,
        replyTo: message.replyTo,
        attachments: message.attachments,
        templateId: message.templateId,
        templateData: message.templateData,
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error: any) {
      logger.error("SendGrid email adapter error", { error, message });
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }
  }

  isEnabled(): boolean {
    return this.emailService.isServiceEnabled();
  }
}
