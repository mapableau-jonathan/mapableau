/**
 * Twilio SMS Adapter
 * Concrete implementation of SMSAdapter using Twilio
 */

import { SMSAdapter, SMSMessage, SMSResult } from "./sms-adapter";
import { TwilioSMSService } from "../../verification/twilio-sms";
import { logger } from "@/lib/logger";

/**
 * Twilio SMS Adapter
 */
export class TwilioSMSAdapter implements SMSAdapter {
  private twilioService: TwilioSMSService;

  constructor(config?: {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
    verifyServiceSid?: string;
  }) {
    this.twilioService = new TwilioSMSService(config);
  }

  async sendMessage(message: SMSMessage): Promise<SMSResult> {
    try {
      const result = await this.twilioService.sendMessage(
        message.to,
        message.body
      );

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error: any) {
      logger.error("Twilio SMS adapter error", { error, message });
      return {
        success: false,
        error: error.message || "Failed to send SMS",
      };
    }
  }

  isEnabled(): boolean {
    return this.twilioService.isServiceEnabled();
  }
}
