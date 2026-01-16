/**
 * TOTP (Time-based One-Time Password) Service
 * Implements Google Authenticator compatible 2FA
 * 
 * Documentation: https://en.wikipedia.org/wiki/Time-based_one-time_password
 * 
 * Note: This service requires speakeasy to be installed:
 * npm install speakeasy qrcode
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface TOTPSecret {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string; // For manual entry if QR code can't be scanned
}

export interface TOTPVerificationResult {
  valid: boolean;
  error?: string;
}

export interface TOTPConfig {
  issuer?: string; // Service name (e.g., "AbilityPay Protocol")
  label?: string; // Account label (e.g., user email)
  algorithm?: "sha1" | "sha256" | "sha512";
  digits?: number; // 6 or 8
  period?: number; // Time step in seconds (default: 30)
}

export class TOTPService {
  private defaultIssuer: string;
  private defaultAlgorithm: "sha1" | "sha256" | "sha512";
  private defaultDigits: number;
  private defaultPeriod: number;

  constructor(config?: {
    issuer?: string;
    algorithm?: "sha1" | "sha256" | "sha512";
    digits?: number;
    period?: number;
  }) {
    this.defaultIssuer = config?.issuer || process.env.TOTP_ISSUER || "AbilityPay Protocol";
    this.defaultAlgorithm = config?.algorithm || "sha1"; // Google Authenticator uses SHA1
    this.defaultDigits = config?.digits || 6; // Google Authenticator uses 6 digits
    this.defaultPeriod = config?.period || 30; // 30 seconds per code
  }

  /**
   * Generate a new TOTP secret for a user
   */
  async generateSecret(
    userId: string,
    config?: TOTPConfig
  ): Promise<TOTPSecret> {
    try {
      const speakeasy = await import("speakeasy");
      const qrcode = await import("qrcode");

      const issuer = config?.issuer || this.defaultIssuer;
      const label = config?.label || userId;
      const algorithm = config?.algorithm || this.defaultAlgorithm;
      const digits = config?.digits || this.defaultDigits;
      const period = config?.period || this.defaultPeriod;

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${issuer}:${label}`,
        issuer: issuer,
        length: 32, // 256 bits
      });

      // Generate QR code URL
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: label,
        issuer: issuer,
        encoding: "base32",
        algorithm: algorithm,
        digits: digits,
        period: period,
      });

      // Generate QR code as data URL
      const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

      // Store secret in database (encrypted in production)
      await this.storeSecret(userId, secret.base32!, {
        algorithm,
        digits,
        period,
      });

      return {
        secret: secret.base32!,
        qrCodeUrl,
        manualEntryKey: secret.base32!, // For manual entry
      };
    } catch (error: any) {
      logger.error("Failed to generate TOTP secret", error);
      throw new Error(`TOTP secret generation failed: ${error.message}`);
    }
  }

  /**
   * Verify a TOTP token
   */
  async verifyToken(
    userId: string,
    token: string
  ): Promise<TOTPVerificationResult> {
    try {
      const speakeasy = await import("speakeasy");

      // Retrieve stored secret
      const storedSecret = await this.getStoredSecret(userId);
      if (!storedSecret) {
        return {
          valid: false,
          error: "2FA not enabled for this user",
        };
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: storedSecret.secret,
        encoding: "base32",
        token: token,
        algorithm: storedSecret.algorithm || this.defaultAlgorithm,
        digits: storedSecret.digits || this.defaultDigits,
        step: storedSecret.period || this.defaultPeriod,
        window: 2, // Allow 2 time steps (60 seconds) for clock skew
      });

      if (verified) {
        // Record successful verification (for security tracking)
        await this.recordVerification(userId, true);
        return { valid: true };
      } else {
        // Record failed verification
        await this.recordVerification(userId, false);
        return {
          valid: false,
          error: "Invalid verification code",
        };
      }
    } catch (error: any) {
      logger.error("Failed to verify TOTP token", error);
      return {
        valid: false,
        error: error.message || "Verification failed",
      };
    }
  }

  /**
   * Check if 2FA is enabled for a user
   */
  async isEnabled(userId: string): Promise<boolean> {
    try {
      const storedSecret = await this.getStoredSecret(userId);
      return !!storedSecret && storedSecret.enabled === true;
    } catch (error) {
      logger.error("Failed to check 2FA status", error);
      return false;
    }
  }

  /**
   * Enable 2FA for a user (after initial setup)
   */
  async enable2FA(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
        },
      });
    } catch (error: any) {
      logger.error("Failed to enable 2FA", error);
      throw new Error(`Failed to enable 2FA: ${error.message}`);
    }
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string, verificationToken?: string): Promise<void> {
    try {
      // If verification token provided, verify it first
      if (verificationToken) {
        const verification = await this.verifyToken(userId, verificationToken);
        if (!verification.valid) {
          throw new Error("Invalid verification code");
        }
      }

      // Remove secret and disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });

      // Clear any stored backup codes
      await this.clearBackupCodes(userId);
    } catch (error: any) {
      logger.error("Failed to disable 2FA", error);
      throw new Error(`Failed to disable 2FA: ${error.message}`);
    }
  }

  /**
   * Generate backup codes for 2FA
   */
  async generateBackupCodes(userId: string, count: number = 10): Promise<string[]> {
    try {
      const codes: string[] = [];
      for (let i = 0; i < count; i++) {
        // Generate 8-digit backup code
        const code = Math.floor(10000000 + Math.random() * 90000000).toString();
        codes.push(code);
      }

      // Store hashed backup codes
      const { createHash } = await import("crypto");
      const hashedCodes = codes.map(code => 
        createHash("sha256").update(code).digest("hex")
      );

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorBackupCodes: hashedCodes.join(","),
        },
      });

      // Return plain codes (only shown once)
      return codes;
    } catch (error: any) {
      logger.error("Failed to generate backup codes", error);
      throw new Error(`Failed to generate backup codes: ${error.message}`);
    }
  }

  /**
   * Verify a backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorBackupCodes: true },
      });

      if (!user?.twoFactorBackupCodes) {
        return false;
      }

      const { createHash } = await import("crypto");
      const hashedCode = createHash("sha256").update(code).digest("hex");
      const storedCodes = user.twoFactorBackupCodes.split(",");

      const codeIndex = storedCodes.indexOf(hashedCode);
      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      storedCodes.splice(codeIndex, 1);
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorBackupCodes: storedCodes.length > 0 ? storedCodes.join(",") : null,
        },
      });

      return true;
    } catch (error) {
      logger.error("Failed to verify backup code", error);
      return false;
    }
  }

  /**
   * Store TOTP secret in database
   */
  private async storeSecret(
    userId: string,
    secret: string,
    config: {
      algorithm: string;
      digits: number;
      period: number;
    }
  ): Promise<void> {
    try {
      // In production, encrypt the secret before storing
      // For now, store as-is (should be encrypted in production)
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: secret,
          twoFactorConfig: JSON.stringify(config),
        },
      });
    } catch (error: any) {
      logger.error("Failed to store TOTP secret", error);
      throw new Error(`Failed to store secret: ${error.message}`);
    }
  }

  /**
   * Get stored TOTP secret
   */
  private async getStoredSecret(userId: string): Promise<{
    secret: string;
    algorithm: string;
    digits: number;
    period: number;
    enabled: boolean;
  } | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorSecret: true,
          twoFactorConfig: true,
          twoFactorEnabled: true,
        },
      });

      if (!user?.twoFactorSecret) {
        return null;
      }

      const config = user.twoFactorConfig 
        ? JSON.parse(user.twoFactorConfig)
        : {
            algorithm: this.defaultAlgorithm,
            digits: this.defaultDigits,
            period: this.defaultPeriod,
          };

      return {
        secret: user.twoFactorSecret,
        algorithm: config.algorithm || this.defaultAlgorithm,
        digits: config.digits || this.defaultDigits,
        period: config.period || this.defaultPeriod,
        enabled: user.twoFactorEnabled || false,
      };
    } catch (error) {
      logger.error("Failed to get stored secret", error);
      return null;
    }
  }

  /**
   * Record verification attempt
   */
  private async recordVerification(
    userId: string,
    success: boolean
  ): Promise<void> {
    try {
      // In production, store this in a separate audit table
      // For now, just log it
      if (success) {
        logger.info(`TOTP verification successful for user ${userId}`);
      } else {
        logger.warn(`TOTP verification failed for user ${userId}`);
      }
    } catch (error) {
      // Don't throw - verification logging is not critical
      logger.error("Failed to record verification", error);
    }
  }

  /**
   * Clear backup codes
   */
  private async clearBackupCodes(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorBackupCodes: null,
        },
      });
    } catch (error) {
      logger.error("Failed to clear backup codes", error);
    }
  }

  /**
   * Get remaining time until next code rotation (in seconds)
   */
  getTimeRemaining(): number {
    const period = this.defaultPeriod;
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
  }
}
