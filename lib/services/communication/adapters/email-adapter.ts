/**
 * Email Adapter Interface
 * Abstraction for email notification providers
 */

export interface EmailMessage {
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
  metadata?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Adapter Interface
 */
export interface EmailAdapter {
  /**
   * Send email message
   */
  sendEmail(message: EmailMessage): Promise<EmailResult>;

  /**
   * Check if adapter is enabled/configured
   */
  isEnabled(): boolean;
}
