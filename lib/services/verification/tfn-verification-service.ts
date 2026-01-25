import { prisma } from "@/lib/prisma";
import { VerificationType, VerificationStatus } from "@prisma/client";

/**
 * TFN Verification Service
 * 
 * Validates Tax File Number (TFN) format.
 * 
 * IMPORTANT: Actual TFN verification requires ATO (Australian Taxation Office) access
 * which is restricted and requires special authorization. This service only validates
 * TFN format, not whether the TFN is valid or belongs to the individual.
 * 
 * TFN format: 8-9 digits (no spaces or formatting)
 */

export interface TFNVerificationRequest {
  tfn: string;
  userId?: string;
  workerId?: string;
  dateOfBirth?: string; // For additional validation context
  fullName?: string; // For additional validation context
}

export interface TFNVerificationResult {
  valid: boolean;
  tfn?: string; // Never store full TFN in plain text
  tfnLast4?: string; // Only store last 4 digits for display
  message?: string;
  verifiedAt?: Date;
}

export class TFNVerificationService {
  /**
   * Validate TFN format
   * TFN must be 8-9 digits, no spaces or formatting
   */
  static validateTFNFormat(tfn: string): boolean {
    // Remove any spaces, hyphens, or formatting
    const cleaned = tfn.replace(/[\s-]/g, "");

    // Must be 8 or 9 digits
    if (!/^\d{8,9}$/.test(cleaned)) {
      return false;
    }

    // Basic checksum validation (weighted sum algorithm)
    return this.validateTFNChecksum(cleaned);
  }

  /**
   * TFN checksum validation algorithm
   * Uses weighted sum modulo 11 algorithm
   */
  private static validateTFNChecksum(tfn: string): boolean {
    const digits = tfn.split("").map(Number);
    const length = digits.length;

    // Different weight sequences for 8 vs 9 digit TFNs
    let weights: number[];
    if (length === 8) {
      weights = [10, 7, 8, 4, 6, 3, 5, 1];
    } else {
      // 9 digit TFN
      weights = [10, 7, 8, 4, 6, 3, 5, 2, 1];
    }

    let sum = 0;
    for (let i = 0; i < length - 1; i++) {
      sum += digits[i] * weights[i];
    }

    const remainder = sum % 11;
    const checkDigit = digits[length - 1];

    return remainder === 0 ? checkDigit === 0 : remainder === checkDigit;
  }

  /**
   * Clean TFN (remove spaces, hyphens)
   */
  static cleanTFN(tfn: string): string {
    return tfn.replace(/[\s-]/g, "");
  }

  /**
   * Mask TFN for display (show only last 4 digits: XXX XXX XX)
   * Never display full TFN
   */
  static maskTFN(tfn: string): string {
    const cleaned = this.cleanTFN(tfn);
    if (cleaned.length < 4) return "XXXX";
    const last4 = cleaned.slice(-4);
    return `XXX XXX ${last4}`;
  }

  /**
   * Get last 4 digits of TFN for storage/display
   */
  static getTFNLast4(tfn: string): string {
    const cleaned = this.cleanTFN(tfn);
    return cleaned.length >= 4 ? cleaned.slice(-4) : "";
  }

  /**
   * Hash TFN for secure storage (one-way hash)
   * Use this if you need to verify if a TFN was previously submitted
   * without storing the actual TFN
   */
  static async hashTFN(tfn: string): Promise<string> {
    const cleaned = this.cleanTFN(tfn);
    const encoder = new TextEncoder();
    const data = encoder.encode(cleaned);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Verify TFN format (NOT actual TFN validation - requires ATO access)
   * 
   * SECURITY WARNING:
   * - Never store full TFN in plain text
   * - Only store hashed TFN or last 4 digits
   * - Actual TFN verification requires ATO integration (restricted access)
   */
  static async verifyTFN(request: TFNVerificationRequest): Promise<TFNVerificationResult> {
    const cleanedTFN = this.cleanTFN(request.tfn);

    // Format validation
    if (!this.validateTFNFormat(request.tfn)) {
      return {
        valid: false,
        message: "Invalid TFN format. TFN must be 8-9 digits and pass checksum validation.",
      };
    }

    // TODO: In production with ATO access, verify TFN against ATO systems
    // This requires special ATO registration and secure API integration
    // 
    // Example (NOT IMPLEMENTED):
    // const atoResult = await ATOAPI.verifyTFN({
    //   tfn: cleanedTFN,
    //   dateOfBirth: request.dateOfBirth,
    //   fullName: request.fullName
    // });

    // For now, return format-validated result
    return {
      valid: true,
      tfnLast4: this.getTFNLast4(cleanedTFN),
      message: "TFN format is valid. Actual verification requires ATO integration.",
      verifiedAt: new Date(),
    };
  }

  /**
   * Create or update TFN verification record for a worker
   * Stores only hashed TFN and last 4 digits - never full TFN
   */
  static async createTFNVerificationRecord(
    workerId: string,
    tfn: string,
    result: TFNVerificationResult
  ) {
    const cleanedTFN = this.cleanTFN(tfn);
    const tfnHash = await this.hashTFN(cleanedTFN);
    const tfnLast4 = this.getTFNLast4(cleanedTFN);

    return await prisma.verificationRecord.upsert({
      where: {
        workerId_verificationType: {
          workerId,
          verificationType: VerificationType.TFN,
        },
      },
      update: {
        status: result.valid ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
        providerResponse: {
          ...result,
          tfnHash, // Store hash for verification of duplicates
          tfnLast4,
          // Never store full TFN
        } as any,
        metadata: {
          tfnHash,
          tfnLast4,
          maskedTFN: this.maskTFN(cleanedTFN),
          verifiedAt: new Date().toISOString(),
        },
        verifiedAt: result.valid ? new Date() : null,
        errorMessage: result.valid ? null : result.message,
      },
      create: {
        workerId,
        verificationType: VerificationType.TFN,
        status: result.valid ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
        provider: "ATO_FORMAT_VALIDATION", // Not actual ATO verification
        providerResponse: {
          ...result,
          tfnHash,
          tfnLast4,
        } as any,
        metadata: {
          tfnHash,
          tfnLast4,
          maskedTFN: this.maskTFN(cleanedTFN),
        },
        verifiedAt: result.valid ? new Date() : null,
        errorMessage: result.valid ? null : result.message,
      },
    });
  }

  /**
   * Check if TFN hash already exists (to prevent duplicate submissions)
   */
  static async checkTFNDuplicate(workerId: string, tfn: string): Promise<boolean> {
    const tfnHash = await this.hashTFN(tfn);

    const existing = await prisma.verificationRecord.findFirst({
      where: {
        verificationType: VerificationType.TFN,
        providerResponse: {
          path: ["tfnHash"],
          equals: tfnHash,
        },
        workerId: {
          not: workerId, // Different worker
        },
      },
    });

    return !!existing;
  }
}
