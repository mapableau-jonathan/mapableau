/**
 * Twilio SMS Verification Service
 * Handles SMS verification codes for two-factor authentication
 * 
 * Documentation: https://www.twilio.com/docs/sms
 * 
 * Note: This service requires twilio to be installed:
 * npm install twilio
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface SMSVerificationRequest {
  phoneNumber: string;
  userId?: string;
  purpose?: string; // "payment", "login", "verification", etc.
}

export interface SMSVerificationResult {
  success: boolean;
  verificationId?: string;
  expiresAt?: Date;
  error?: string;
}

export interface VerifyCodeRequest {
  phoneNumber: string;
  code: string;
  verificationId?: string;
}

export interface VerifyCodeResult {
  valid: boolean;
  error?: string;
  verifiedAt?: Date;
}

export class TwilioSMSService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private verifyServiceSid?: string; // For Twilio Verify service
  private client: any; // Twilio client
  private isEnabled: boolean;

  constructor(config?: {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
    verifyServiceSid?: string;
  }) {
    this.accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber = config?.fromNumber || process.env.TWILIO_PHONE_NUMBER || "";
    this.verifyServiceSid = config?.verifyServiceSid || process.env.TWILIO_VERIFY_SERVICE_SID;
    this.isEnabled = !!(this.accountSid && this.authToken);

    if (this.isEnabled) {
      this.initializeClient();
    } else {
      logger.warn("Twilio SMS service not configured - SMS verification will be disabled");
    }
  }

  /**
   * Initialize Twilio client
   */
  private async initializeClient() {
    try {
      const twilio = await import("twilio");
      this.client = twilio(this.accountSid, this.authToken);
    } catch (error) {
      logger.error("Failed to initialize Twilio client", error);
      this.isEnabled = false;
    }
  }

  /**
   * Generate a random verification code
   */
  private generateVerificationCode(length = 6): string {
    const digits = "0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  }

  /**
   * Format phone number for Twilio (E.164 format)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // If it starts with 0, replace with country code (Australia: +61)
    if (cleaned.startsWith("0")) {
      cleaned = "61" + cleaned.substring(1);
    }

    // If it doesn't start with +, add it
    if (!phoneNumber.startsWith("+")) {
      cleaned = "+" + cleaned;
    } else {
      cleaned = phoneNumber;
    }

    return cleaned;
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(
    request: SMSVerificationRequest
  ): Promise<SMSVerificationResult> {
    if (!this.isEnabled || !this.client) {
      // In development, return mock success
      if (process.env.NODE_ENV === "development") {
        logger.info("SMS verification mock mode", { phoneNumber: request.phoneNumber });
        const code = this.generateVerificationCode();
        const verificationId = `mock_${Date.now()}`;
        
        // Store in database for verification
        await this.storeVerificationCode(
          request.phoneNumber,
          code,
          verificationId,
          request.userId
        );

        return {
          success: true,
          verificationId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        };
      }
      
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber);
      const code = this.generateVerificationCode();
      const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Use Twilio Verify service if available (recommended)
      if (this.verifyServiceSid) {
        const verification = await this.client.verify.v2
          .services(this.verifyServiceSid)
          .verifications.create({
            to: formattedPhone,
            channel: "sms",
          });

        // Store verification ID for later verification
        await this.storeVerificationCode(
          request.phoneNumber,
          code, // Note: With Verify service, code is managed by Twilio
          verification.sid,
          request.userId
        );

        return {
          success: true,
          verificationId: verification.sid,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        };
      } else {
        // Fallback: Send SMS directly with code
        const message = `Your verification code is: ${code}. Valid for 10 minutes.`;
        
        await this.client.messages.create({
          body: message,
          from: this.fromNumber,
          to: formattedPhone,
        });

        // Store verification code in database
        await this.storeVerificationCode(
          request.phoneNumber,
          code,
          verificationId,
          request.userId
        );

        logger.info("SMS verification code sent", {
          phoneNumber: request.phoneNumber,
          verificationId,
        });

        return {
          success: true,
          verificationId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        };
      }
    } catch (error: any) {
      logger.error("Failed to send SMS verification code", error, {
        phoneNumber: request.phoneNumber,
      });
      
      return {
        success: false,
        error: error.message || "Failed to send verification code",
      };
    }
  }

  /**
   * Verify SMS code
   */
  async verifyCode(request: VerifyCodeRequest): Promise<VerifyCodeResult> {
    if (!this.isEnabled || !this.client) {
      // In development, allow mock verification
      if (process.env.NODE_ENV === "development") {
        const isValid = await this.checkStoredVerificationCode(
          request.phoneNumber,
          request.code,
          request.verificationId
        );
        
        if (isValid) {
          return {
            valid: true,
            verifiedAt: new Date(),
          };
        }
      }
      
      return {
        valid: false,
        error: "SMS service not configured",
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber);

      // Use Twilio Verify service if available
      if (this.verifyServiceSid && request.verificationId) {
        const verificationCheck = await this.client.verify.v2
          .services(this.verifyServiceSid)
          .verificationChecks.create({
            to: formattedPhone,
            code: request.code,
          });

        if (verificationCheck.status === "approved") {
          // Mark as verified in database
          await this.markVerificationAsUsed(request.verificationId);

          return {
            valid: true,
            verifiedAt: new Date(),
          };
        } else {
          return {
            valid: false,
            error: "Invalid verification code",
          };
        }
      } else {
        // Fallback: Check stored code
        const isValid = await this.checkStoredVerificationCode(
          request.phoneNumber,
          request.code,
          request.verificationId
        );

        if (isValid) {
          if (request.verificationId) {
            await this.markVerificationAsUsed(request.verificationId);
          }

          return {
            valid: true,
            verifiedAt: new Date(),
          };
        } else {
          return {
            valid: false,
            error: "Invalid or expired verification code",
          };
        }
      }
    } catch (error: any) {
      logger.error("Failed to verify SMS code", error, {
        phoneNumber: request.phoneNumber,
      });
      
      return {
        valid: false,
        error: error.message || "Verification failed",
      };
    }
  }

  /**
   * Store verification code in database
   * Note: In production, use a dedicated SMS verification table
   */
  private async storeVerificationCode(
    phoneNumber: string,
    code: string,
    verificationId: string,
    userId?: string
  ): Promise<void> {
    try {
      // Store in a simple key-value format
      // In production, create a dedicated SMSVerification model
      const key = `sms_verification:${verificationId}`;
      const { redisClient } = await import("@/lib/cache/redis-client");
      
      await redisClient.set(
        key,
        JSON.stringify({
          phoneNumber,
          code,
          verificationId,
          userId,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
        { ttl: 600 } // 10 minutes
      );
    } catch (error) {
      logger.error("Failed to store verification code", error);
      // Continue even if storage fails
    }
  }

  /**
   * Check stored verification code
   */
  private async checkStoredVerificationCode(
    phoneNumber: string,
    code: string,
    verificationId?: string
  ): Promise<boolean> {
    try {
      if (!verificationId) {
        return false;
      }

      const key = `sms_verification:${verificationId}`;
      const { redisClient } = await import("@/lib/cache/redis-client");
      
      const stored = await redisClient.get(key);
      if (!stored) {
        return false;
      }

      const data = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(data.expiresAt);

      if (expiresAt < now) {
        return false; // Expired
      }

      if (data.phoneNumber !== phoneNumber) {
        return false; // Phone number mismatch
      }

      if (data.code !== code) {
        return false; // Code mismatch
      }

      if (data.used) {
        return false; // Already used
      }

      return true;
    } catch (error) {
      logger.error("Failed to check verification code", error);
      return false;
    }
  }

  /**
   * Mark verification as used
   */
  private async markVerificationAsUsed(verificationId: string): Promise<void> {
    try {
      const key = `sms_verification:${verificationId}`;
      const { redisClient } = await import("@/lib/cache/redis-client");
      
      const stored = await redisClient.get(key);
      if (stored) {
        const data = JSON.parse(stored);
        data.used = true;
        data.usedAt = new Date().toISOString();
        await redisClient.set(key, JSON.stringify(data), { ttl: 600 });
      }
    } catch (error) {
      logger.error("Failed to mark verification as used", error);
    }
  }

  /**
   * Send custom SMS message
   */
  async sendMessage(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isEnabled || !this.client) {
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      logger.error("Failed to send SMS message", error, { phoneNumber });
      return {
        success: false,
        error: error.message || "Failed to send message",
      };
    }
  }

  /**
   * Check if SMS service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}
