/**
 * Payment Security Service
 * Multi-factor authentication for payment gateway
 * Requires TOTP + Biometric for high-value transactions
 */

import { TOTPService } from "@/lib/services/verification/totp-service";
import { WebAuthnService } from "@/lib/services/verification/webauthn-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface PaymentSecurityVerification {
  totpVerified: boolean;
  biometricVerified: boolean;
  requiresBiometric: boolean;
  requiresTOTP: boolean;
}

export interface PaymentSecurityConfig {
  highValueThreshold?: number; // Amount requiring biometric (default: $1000)
  requireBiometric?: boolean; // Always require biometric
  requireTOTP?: boolean; // Always require TOTP
  allowBiometricOnly?: boolean; // Allow biometric without TOTP for low-value
}

export class PaymentSecurityService {
  private totpService: TOTPService;
  private webauthnService: WebAuthnService;
  private config: PaymentSecurityConfig;

  constructor(config?: PaymentSecurityConfig) {
    this.totpService = new TOTPService();
    this.webauthnService = new WebAuthnService();
    this.config = {
      highValueThreshold: config?.highValueThreshold || 1000,
      requireBiometric: config?.requireBiometric || false,
      requireTOTP: config?.requireTOTP || false,
      allowBiometricOnly: config?.allowBiometricOnly || false,
    };
  }

  /**
   * Determine security requirements for a payment
   */
  async getSecurityRequirements(
    userId: string,
    amount: number
  ): Promise<{
    requiresTOTP: boolean;
    requiresBiometric: boolean;
    hasTOTP: boolean;
    hasBiometric: boolean;
  }> {
    const hasTOTP = await this.totpService.isEnabled(userId);
    const hasBiometric = await this.webauthnService.hasBiometricCredentials(userId);

    // High-value transactions require both
    const isHighValue = amount >= (this.config.highValueThreshold || 1000);

    // Determine requirements
    const requiresTOTP =
      this.config.requireTOTP ||
      (isHighValue && hasTOTP) ||
      (hasTOTP && !this.config.allowBiometricOnly);

    const requiresBiometric =
      this.config.requireBiometric ||
      (isHighValue && hasBiometric) ||
      (hasBiometric && !this.config.allowBiometricOnly);

    return {
      requiresTOTP,
      requiresBiometric,
      hasTOTP,
      hasBiometric,
    };
  }

  /**
   * Verify TOTP token for payment
   */
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    try {
      const result = await this.totpService.verifyToken(userId, token);
      return result.valid;
    } catch (error) {
      logger.error("TOTP verification failed for payment", error);
      return false;
    }
  }

  /**
   * Verify biometric authentication for payment
   */
  async verifyBiometric(
    userId: string,
    credential: {
      id: string;
      rawId: string;
      response: {
        authenticatorData: string;
        clientDataJSON: string;
        signature: string;
        userHandle?: string;
      };
      type: string;
    }
  ): Promise<boolean> {
    try {
      const result = await this.webauthnService.verifyAuthentication(
        userId,
        credential
      );
      return result.verified;
    } catch (error) {
      logger.error("Biometric verification failed for payment", error);
      return false;
    }
  }

  /**
   * Verify backup code for payment (fallback)
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      return await this.totpService.verifyBackupCode(userId, code);
    } catch (error) {
      logger.error("Backup code verification failed for payment", error);
      return false;
    }
  }

  /**
   * Complete payment security verification
   */
  async verifyPaymentSecurity(
    userId: string,
    amount: number,
    verification: {
      totpToken?: string;
      backupCode?: string;
      biometricCredential?: {
        id: string;
        rawId: string;
        response: {
          authenticatorData: string;
          clientDataJSON: string;
          signature: string;
          userHandle?: string;
        };
        type: string;
      };
    }
  ): Promise<PaymentSecurityVerification> {
    const requirements = await this.getSecurityRequirements(userId, amount);

    const result: PaymentSecurityVerification = {
      totpVerified: false,
      biometricVerified: false,
      requiresBiometric: requirements.requiresBiometric,
      requiresTOTP: requirements.requiresTOTP,
    };

    // Verify TOTP if required
    if (requirements.requiresTOTP) {
      if (verification.totpToken) {
        result.totpVerified = await this.verifyTOTP(userId, verification.totpToken);
      } else if (verification.backupCode) {
        result.totpVerified = await this.verifyBackupCode(userId, verification.backupCode);
      } else {
        throw new Error("TOTP verification required but not provided");
      }
    } else {
      // TOTP not required
      result.totpVerified = true;
    }

    // Verify biometric if required
    if (requirements.requiresBiometric) {
      if (!verification.biometricCredential) {
        throw new Error("Biometric verification required but not provided");
      }
      result.biometricVerified = await this.verifyBiometric(
        userId,
        verification.biometricCredential
      );
    } else {
      // Biometric not required
      result.biometricVerified = true;
    }

    // Check if all required verifications passed
    if (requirements.requiresTOTP && !result.totpVerified) {
      throw new Error("TOTP verification failed");
    }

    if (requirements.requiresBiometric && !result.biometricVerified) {
      throw new Error("Biometric verification failed");
    }

    return result;
  }

  /**
   * Generate authentication options for payment
   */
  async generatePaymentAuthOptions(
    userId: string,
    amount: number
  ): Promise<{
    requiresTOTP: boolean;
    requiresBiometric: boolean;
    biometricOptions?: {
      challenge: string;
      allowCredentials?: Array<{ id: string; type: string }>;
      timeout: number;
      userVerification: string;
      rpId: string;
    };
  }> {
    const requirements = await this.getSecurityRequirements(userId, amount);

    const result: any = {
      requiresTOTP: requirements.requiresTOTP,
      requiresBiometric: requirements.requiresBiometric,
    };

    // Generate biometric options if required
    if (requirements.requiresBiometric) {
      result.biometricOptions = await this.webauthnService.generateAuthenticationOptions({
        userId,
      });
    }

    return result;
  }

  /**
   * Check if user has required security methods enabled
   */
  async checkSecuritySetup(userId: string): Promise<{
    hasTOTP: boolean;
    hasBiometric: boolean;
    isFullySecured: boolean;
  }> {
    const hasTOTP = await this.totpService.isEnabled(userId);
    const hasBiometric = await this.webauthnService.hasBiometricCredentials(userId);

    return {
      hasTOTP,
      hasBiometric,
      isFullySecured: hasTOTP && hasBiometric,
    };
  }
}
