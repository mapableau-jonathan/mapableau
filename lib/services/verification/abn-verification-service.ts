import { prisma } from "@/lib/prisma";
import { VerificationType, VerificationStatus } from "@prisma/client";

/**
 * ABN Verification Service
 * 
 * Verifies Australian Business Numbers (ABN) using the Australian Business Register (ABR) API.
 * ABN format: 11 digits (with optional spaces)
 */

export interface ABNVerificationRequest {
  abn: string;
  userId?: string;
  workerId?: string;
}

export interface ABNVerificationResult {
  valid: boolean;
  abn: string;
  entityName?: string;
  entityType?: string;
  status?: string;
  activeFrom?: Date;
  activeTo?: Date;
  gstRegistered?: boolean;
  mainBusinessLocation?: {
    stateCode?: string;
    postcode?: string;
  };
  message?: string;
}

export class ABNVerificationService {
  /**
   * Validate ABN format (11 digits, optional spaces)
   */
  static validateABNFormat(abn: string): boolean {
    // Remove spaces and hyphens
    const cleaned = abn.replace(/[\s-]/g, "");
    
    // Must be exactly 11 digits
    if (!/^\d{11}$/.test(cleaned)) {
      return false;
    }
    
    // Validate ABN checksum algorithm
    return this.validateABNChecksum(cleaned);
  }

  /**
   * ABN checksum validation algorithm
   * ABN = 11 digits where: (sum of (digit * weight)) mod 89 === 10
   */
  private static validateABNChecksum(abn: string): boolean {
    const digits = abn.split("").map(Number);
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += digits[i] * weights[i];
    }
    
    return sum % 89 === 10;
  }

  /**
   * Clean ABN (remove spaces, hyphens, format as 11 digits)
   */
  static cleanABN(abn: string): string {
    return abn.replace(/[\s-]/g, "");
  }

  /**
   * Format ABN for display (adds spaces: XX XXX XXX XXX)
   */
  static formatABN(abn: string): string {
    const cleaned = this.cleanABN(abn);
    if (cleaned.length !== 11) return abn;
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 11)}`;
  }

  /**
   * Verify ABN against Australian Business Register API
   * 
   * Note: This is a placeholder implementation. In production, integrate with ABR Lookup API:
   * https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx
   * 
   * For sandbox/testing, use format validation only.
   */
  static async verifyABN(request: ABNVerificationRequest): Promise<ABNVerificationResult> {
    const cleanedABN = this.cleanABN(request.abn);

    // Format validation
    if (!this.validateABNFormat(request.abn)) {
      return {
        valid: false,
        abn: cleanedABN,
        message: "Invalid ABN format. ABN must be 11 digits and pass checksum validation.",
      };
    }

    // TODO: In production, integrate with ABR API
    // Example ABR API call:
    // const response = await fetch(`https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByABN?searchString=${cleanedABN}&includeHistoricalDetails=N`);
    
    // For now, return format-validated result
    // In production, parse ABR XML/JSON response and extract entity details
    
    return {
      valid: true,
      abn: cleanedABN,
      message: "ABN format is valid. Production implementation will verify with ABR API.",
    };
  }

  /**
   * Create or update ABN verification record for a worker
   */
  static async createABNVerificationRecord(
    workerId: string,
    abn: string,
    result: ABNVerificationResult
  ) {
    const cleanedABN = this.cleanABN(abn);

    return await prisma.verificationRecord.upsert({
      where: {
        workerId_verificationType: {
          workerId,
          verificationType: VerificationType.ABN,
        },
      },
      update: {
        status: result.valid ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
        providerResponse: result as any,
        metadata: {
          abn: cleanedABN,
          formattedABN: this.formatABN(abn),
          verifiedAt: new Date().toISOString(),
        },
        verifiedAt: result.valid ? new Date() : null,
        errorMessage: result.valid ? null : result.message,
      },
      create: {
        workerId,
        verificationType: VerificationType.ABN,
        status: result.valid ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
        provider: "ABR",
        providerResponse: result as any,
        metadata: {
          abn: cleanedABN,
          formattedABN: this.formatABN(abn),
        },
        verifiedAt: result.valid ? new Date() : null,
        errorMessage: result.valid ? null : result.message,
      },
    });
  }

  /**
   * Verify ABN for a provider registration
   */
  static async verifyProviderABN(userId: string, abn: string): Promise<ABNVerificationResult> {
    const result = await this.verifyABN({ abn, userId });

    if (result.valid) {
      // Update provider registration with verified ABN
      await prisma.providerRegistration.update({
        where: { userId },
        data: {
          abn: this.cleanABN(abn),
          abnVerified: true,
          abnVerifiedAt: new Date(),
        },
      });
    }

    return result;
  }
}
