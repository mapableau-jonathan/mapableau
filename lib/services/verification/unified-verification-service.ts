import { ABNVerificationService, ABNVerificationRequest, ABNVerificationResult } from "./abn-verification-service";
import { TFNVerificationService, TFNVerificationRequest, TFNVerificationResult } from "./tfn-verification-service";
import { NDISWorkerCheckService, NDISWorkerCheckRequest, NDISWorkerCheckResult } from "./ndis-worker-check-service";
import { VerificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Unified Verification Service
 * 
 * Orchestrates ABN, TFN, and NDIS Worker Check verifications
 * Provides a single interface for all verification operations
 */

export interface UnifiedVerificationRequest {
  type: "ABN" | "TFN" | "NDIS_WORKER_CHECK";
  workerId?: string;
  userId?: string;
  // ABN-specific
  abn?: string;
  // TFN-specific
  tfn?: string;
  dateOfBirth?: string;
  fullName?: string;
  // NDIS Worker Check specific
  firstName?: string;
  lastName?: string;
  email?: string;
}

export type UnifiedVerificationResult =
  | { type: "ABN"; result: ABNVerificationResult }
  | { type: "TFN"; result: TFNVerificationResult }
  | { type: "NDIS_WORKER_CHECK"; result: NDISWorkerCheckResult };

export class UnifiedVerificationService {
  /**
   * Verify ABN, TFN, or NDIS Worker Check based on request type
   */
  static async verify(request: UnifiedVerificationRequest): Promise<UnifiedVerificationResult> {
    switch (request.type) {
      case "ABN":
        if (!request.abn) {
          throw new Error("ABN is required for ABN verification");
        }
        const abnResult = await ABNVerificationService.verifyABN({
          abn: request.abn,
          userId: request.userId,
          workerId: request.workerId,
        });
        
        // Save verification record if workerId provided
        if (request.workerId) {
          await ABNVerificationService.createABNVerificationRecord(
            request.workerId,
            request.abn,
            abnResult
          );
        }
        
        return { type: "ABN", result: abnResult };

      case "TFN":
        if (!request.tfn) {
          throw new Error("TFN is required for TFN verification");
        }
        
        // Check for duplicate TFN
        if (request.workerId) {
          const isDuplicate = await TFNVerificationService.checkTFNDuplicate(
            request.workerId,
            request.tfn
          );
          if (isDuplicate) {
            return {
              type: "TFN",
              result: {
                valid: false,
                message: "This TFN has already been registered with another worker.",
              },
            };
          }
        }
        
        const tfnResult = await TFNVerificationService.verifyTFN({
          tfn: request.tfn,
          userId: request.userId,
          workerId: request.workerId,
          dateOfBirth: request.dateOfBirth,
          fullName: request.fullName,
        });
        
        // Save verification record if workerId provided
        if (request.workerId) {
          await TFNVerificationService.createTFNVerificationRecord(
            request.workerId,
            request.tfn,
            tfnResult
          );
        }
        
        return { type: "TFN", result: tfnResult };

      case "NDIS_WORKER_CHECK":
        if (!request.workerId) {
          throw new Error("workerId is required for NDIS Worker Check verification");
        }
        
        const ndisResult = await NDISWorkerCheckService.verifyNDISWorkerCheck({
          workerId: request.workerId,
          userId: request.userId,
          firstName: request.firstName,
          lastName: request.lastName,
          dateOfBirth: request.dateOfBirth,
          email: request.email,
        });
        
        // Save verification record
        await NDISWorkerCheckService.createNDISWorkerCheckRecord(
          request.workerId,
          ndisResult
        );
        
        return { type: "NDIS_WORKER_CHECK", result: ndisResult };

      default:
        throw new Error(`Unsupported verification type: ${(request as any).type}`);
    }
  }

  /**
   * Batch verify multiple verification types for a worker
   */
  static async batchVerifyWorker(
    workerId: string,
    verifications: {
      abn?: string;
      tfn?: string;
      dateOfBirth?: string;
      fullName?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    }
  ): Promise<{
    abn?: ABNVerificationResult;
    tfn?: TFNVerificationResult;
    ndisWorkerCheck?: NDISWorkerCheckResult;
  }> {
    const results: {
      abn?: ABNVerificationResult;
      tfn?: TFNVerificationResult;
      ndisWorkerCheck?: NDISWorkerCheckResult;
    } = {};

    // Verify ABN if provided
    if (verifications.abn) {
      const abnResult = await ABNVerificationService.verifyABN({
        abn: verifications.abn,
        workerId,
      });
      await ABNVerificationService.createABNVerificationRecord(workerId, verifications.abn, abnResult);
      results.abn = abnResult;
    }

    // Verify TFN if provided
    if (verifications.tfn) {
      const isDuplicate = await TFNVerificationService.checkTFNDuplicate(workerId, verifications.tfn);
      if (!isDuplicate) {
        const tfnResult = await TFNVerificationService.verifyTFN({
          tfn: verifications.tfn,
          workerId,
          dateOfBirth: verifications.dateOfBirth,
          fullName: verifications.fullName,
        });
        await TFNVerificationService.createTFNVerificationRecord(workerId, verifications.tfn, tfnResult);
        results.tfn = tfnResult;
      } else {
        results.tfn = {
          valid: false,
          message: "This TFN has already been registered with another worker.",
        };
      }
    }

    // Verify NDIS Worker Check
    const ndisResult = await NDISWorkerCheckService.verifyNDISWorkerCheck({
      workerId,
      firstName: verifications.firstName,
      lastName: verifications.lastName,
      dateOfBirth: verifications.dateOfBirth,
      email: verifications.email,
    });
    await NDISWorkerCheckService.createNDISWorkerCheckRecord(workerId, ndisResult);
    results.ndisWorkerCheck = ndisResult;

    return results;
  }

  /**
   * Get verification status for a worker
   */
  static async getWorkerVerificationStatus(workerId: string) {
    const [abnVerification, tfnVerification, ndisCheck] = await Promise.all([
      // Get ABN verification
      prisma.verificationRecord.findUnique({
        where: {
          workerId_verificationType: {
            workerId,
            verificationType: VerificationType.ABN,
          },
        },
      }),
      // Get TFN verification
      prisma.verificationRecord.findUnique({
        where: {
          workerId_verificationType: {
            workerId,
            verificationType: VerificationType.TFN,
          },
        },
      }),
      // Get NDIS Worker Check
      NDISWorkerCheckService.getWorkerScreeningSummary(workerId),
    ]);

    return {
      abn: abnVerification ? {
        status: abnVerification.status,
        verifiedAt: abnVerification.verifiedAt,
        expiresAt: abnVerification.expiresAt,
        metadata: abnVerification.metadata,
      } : null,
      tfn: tfnVerification ? {
        status: tfnVerification.status,
        verifiedAt: tfnVerification.verifiedAt,
        tfnLast4: tfnVerification.metadata as any,
      } : null,
      ndisWorkerCheck: ndisCheck,
    };
  }
}
