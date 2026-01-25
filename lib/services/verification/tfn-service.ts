/**
 * TFN (Tax File Number) Verification Service
 * Verifies Australian Tax File Numbers
 * 
 * Note: TFN verification is sensitive and should only be done through
 * authorized ATO (Australian Taxation Office) channels in production.
 * This service provides format validation only.
 */

import { BaseVerificationService, VerificationRequest, VerificationResponse, VerificationStatusResponse } from "./base";
import { logger } from "@/lib/logger";
import { prisma } from "../../prisma";
import { VerificationType, VerificationStatus } from "@prisma/client";

/**
 * Validate TFN format
 * TFN format: 8-9 digits (no spaces, hyphens, or leading zeros)
 */
function validateTFNFormat(tfn: string): boolean {
  // Remove spaces and hyphens
  const cleaned = tfn.replace(/[\s-]/g, "");
  
  // Must be 8 or 9 digits, no leading zeros
  if (!/^[1-9]\d{7,8}$/.test(cleaned)) {
    return false;
  }
  
  // TFN checksum validation (Luhn algorithm variant)
  return validateTFNChecksum(cleaned);
}

/**
 * TFN checksum validation using weighted sum algorithm
 */
function validateTFNChecksum(tfn: string): boolean {
  const digits = tfn.split("").map(Number);
  const length = digits.length;
  
  // Different weights for 8 vs 9 digit TFNs
  const weights8 = [10, 7, 8, 4, 6, 3, 5, 1];
  const weights9 = [10, 7, 8, 4, 6, 3, 5, 2, 1];
  const weights = length === 8 ? weights8 : weights9;
  
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += digits[i] * weights[i];
  }
  
  return sum % 11 === 0;
}

/**
 * Clean TFN (remove spaces, hyphens)
 */
function cleanTFN(tfn: string): string {
  return tfn.replace(/[\s-]/g, "");
}

/**
 * TFN Verification Service
 */
export class TFNService extends BaseVerificationService {
  constructor() {
    super("ATO");
  }

  async verify(request: VerificationRequest): Promise<VerificationResponse> {
    this.validateRequest(request);

    try {
      const tfn = request.data.tfn as string;
      if (!tfn) {
        return this.createErrorResponse(new Error("TFN is required"));
      }

      const cleanedTFN = cleanTFN(tfn);

      // Format validation only (TFN verification requires ATO authorization)
      if (!validateTFNFormat(tfn)) {
        return this.createErrorResponse(
          new Error("Invalid TFN format. TFN must be 8-9 digits and pass checksum validation."),
          "FAILED"
        );
      }

      // Create verification record (format validated only)
      const verificationRecord = await prisma.verificationRecord.upsert({
        where: {
          workerId_verificationType: {
            workerId: request.workerId,
            verificationType: VerificationType.TFN,
          },
        },
        update: {
          status: VerificationStatus.VERIFIED,
          providerResponse: {
            tfn: cleanedTFN,
            formatValid: true,
            note: "Format validated only. Production requires ATO authorization for full verification.",
          } as any,
          metadata: {
            tfn: cleanedTFN,
            verifiedAt: new Date().toISOString(),
          } as any,
          verifiedAt: new Date(),
        },
        create: {
          workerId: request.workerId,
          verificationType: VerificationType.TFN,
          status: VerificationStatus.VERIFIED,
          provider: "ATO",
          providerRequestId: `tfn-${cleanedTFN}`,
          providerResponse: {
            tfn: cleanedTFN,
            formatValid: true,
            note: "Format validated only. Production requires ATO authorization for full verification.",
          } as any,
          metadata: {
            tfn: cleanedTFN,
          } as any,
          verifiedAt: new Date(),
        },
      });

      return this.createSuccessResponse(
        verificationRecord.providerRequestId || `tfn-${cleanedTFN}`,
        undefined,
        {
          tfn: cleanedTFN,
          formatValid: true,
        }
      );
    } catch (error) {
      logger.error("TFN verification error", { error, request });
      return this.createErrorResponse(error);
    }
  }

  async getStatus(providerRequestId: string): Promise<VerificationStatusResponse> {
    try {
      // Find verification record
      const record = await prisma.verificationRecord.findFirst({
        where: {
          providerRequestId,
          verificationType: VerificationType.TFN,
        },
      });

      if (!record) {
        return {
          status: "PENDING",
          providerRequestId,
          errorMessage: "Verification record not found",
        };
      }

      return {
        status: record.status,
        providerRequestId: record.providerRequestId || undefined,
        verifiedAt: record.verifiedAt || undefined,
        expiresAt: record.expiresAt || undefined,
        metadata: record.metadata as any,
        errorMessage: record.errorMessage || undefined,
      };
    } catch (error) {
      logger.error("TFN status check error", { error, providerRequestId });
      return {
        status: "FAILED",
        providerRequestId,
        errorMessage: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  async recheck(providerRequestId: string): Promise<VerificationResponse> {
    try {
      const record = await prisma.verificationRecord.findFirst({
        where: {
          providerRequestId,
          verificationType: VerificationType.TFN,
        },
      });

      if (!record) {
        return this.createErrorResponse(new Error("Verification record not found"));
      }

      const tfn = (record.metadata as any)?.tfn;
      if (!tfn) {
        return this.createErrorResponse(new Error("TFN not found in record"));
      }

      // Re-validate format
      if (!validateTFNFormat(tfn)) {
        await prisma.verificationRecord.update({
          where: { id: record.id },
          data: {
            status: VerificationStatus.FAILED,
            errorMessage: "TFN format validation failed on recheck",
          },
        });

        return this.createErrorResponse(
          new Error("TFN format validation failed"),
          "FAILED"
        );
      }

      // Update record
      await prisma.verificationRecord.update({
        where: { id: record.id },
        data: {
          status: VerificationStatus.VERIFIED,
          verifiedAt: new Date(),
          metadata: {
            ...(record.metadata as any),
            recheckedAt: new Date().toISOString(),
          } as any,
        },
      });

      return this.createSuccessResponse(
        providerRequestId,
        undefined,
        {
          tfn,
          recheckedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      logger.error("TFN recheck error", { error, providerRequestId });
      return this.createErrorResponse(error);
    }
  }
}
