/**
 * SMS Adapter Interface
 * Abstraction for SMS notification providers
 */

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
  metadata?: Record<string, any>;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS Adapter Interface
 */
export interface SMSAdapter {
  /**
   * Send SMS message
   */
  sendMessage(message: SMSMessage): Promise<SMSResult>;

  /**
   * Check if adapter is enabled/configured
   */
  isEnabled(): boolean;
}
