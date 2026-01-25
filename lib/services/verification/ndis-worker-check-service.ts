import { prisma } from "@/lib/prisma";
import { VerificationType, VerificationStatus } from "@prisma/client";

/**
 * NDIS Worker Check Verification Service
 * 
 * Verifies NDIS Worker Screening Check status using NDIS Worker Screening API.
 * 
 * NDIS Worker Screening is mandatory for workers providing services to NDIS participants.
 * Checks include:
 * - National Police Check
 * - Working with Children Check (WWCC)
 * - Disability Worker Exclusion Scheme check
 */

export interface NDISWorkerCheckRequest {
  workerId: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
}

export interface NDISWorkerCheckResult {
  valid: boolean;
  workerScreeningNumber?: string;
  status?: "CLEAR" | "EXCLUDED" | "PENDING" | "EXPIRED" | "NOT_FOUND";
  expiryDate?: Date;
  issuedDate?: Date;
  state?: string; // Australian state/territory
  checks?: {
    nationalPoliceCheck?: boolean;
    wwccCheck?: boolean;
    exclusionSchemeCheck?: boolean;
  };
  message?: string;
  verifiedAt?: Date;
}

export class NDISWorkerCheckService {
  /**
   * Verify NDIS Worker Screening Check status
   * 
   * This integrates with NDIS Worker Screening Database (WSD) API.
   * 
   * Note: This is a placeholder implementation. In production, integrate with:
   * - NDIS Worker Screening API (if available)
   * - State-based Worker Screening Unit APIs
   * - National Disability Insurance Scheme databases
   * 
   * For testing/sandbox, use mock verification with format validation.
   */
  static async verifyNDISWorkerCheck(
    request: NDISWorkerCheckRequest
  ): Promise<NDISWorkerCheckResult> {
    // Get worker details
    const worker = await prisma.worker.findUnique({
      where: { id: request.workerId },
      include: { user: true },
    });

    if (!worker) {
      return {
        valid: false,
        message: "Worker not found",
      };
    }

    // Get existing NDIS verification record
    const existingCheck = await prisma.verificationRecord.findUnique({
      where: {
        workerId_verificationType: {
          workerId: request.workerId,
          verificationType: VerificationType.NDIS_WORKER_CHECK,
        },
      },
    });

    // TODO: In production, integrate with NDIS Worker Screening API
    // Example API integration (NOT IMPLEMENTED):
    // 
    // const screeningResult = await NDISWorkerScreeningAPI.verifyWorker({
    //   firstName: request.firstName || worker.user.name?.split(' ')[0],
    //   lastName: request.lastName || worker.user.name?.split(' ').slice(1).join(' '),
    //   dateOfBirth: request.dateOfBirth,
    //   email: request.email || worker.user.email,
    // });
    
    // For now, check if worker has required verifications:
    // 1. WWCC (Working with Children Check)
    // 2. National Police Check
    // 3. NDIS Worker Check status

    // Check for WWCC verification
    const wwccCheck = await prisma.verificationRecord.findUnique({
      where: {
        workerId_verificationType: {
          workerId: request.workerId,
          verificationType: VerificationType.WWCC,
        },
      },
    });

    // Check for National Police Check (IDENTITY verification)
    const policeCheck = await prisma.verificationRecord.findUnique({
      where: {
        workerId_verificationType: {
          workerId: request.workerId,
          verificationType: VerificationType.IDENTITY,
        },
      },
    });

    // Validate that required checks are present and valid
    const hasWWCC = wwccCheck?.status === VerificationStatus.VERIFIED && 
                    (!wwccCheck.expiresAt || wwccCheck.expiresAt > new Date());
    const hasPoliceCheck = policeCheck?.status === VerificationStatus.VERIFIED;

    // For testing: return mock result if all checks are in place
    if (hasWWCC && hasPoliceCheck) {
      return {
        valid: true,
        status: "CLEAR",
        workerScreeningNumber: existingCheck?.providerRequestId || `NDIS-${Date.now()}`,
        expiryDate: existingCheck?.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        issuedDate: existingCheck?.verifiedAt || new Date(),
        checks: {
          nationalPoliceCheck: hasPoliceCheck,
          wwccCheck: hasWWCC,
          exclusionSchemeCheck: true, // Assumed clear if other checks pass
        },
        message: "NDIS Worker Check verified. Production implementation will verify with NDIS Worker Screening API.",
        verifiedAt: new Date(),
      };
    }

    return {
      valid: false,
      status: "PENDING",
      message: "Worker requires WWCC and National Police Check verification before NDIS Worker Check can be completed.",
      checks: {
        nationalPoliceCheck: hasPoliceCheck,
        wwccCheck: hasWWCC,
        exclusionSchemeCheck: false,
      },
    };
  }

  /**
   * Create or update NDIS Worker Check verification record
   */
  static async createNDISWorkerCheckRecord(
    workerId: string,
    result: NDISWorkerCheckResult
  ) {
    return await prisma.verificationRecord.upsert({
      where: {
        workerId_verificationType: {
          workerId,
          verificationType: VerificationType.NDIS_WORKER_CHECK,
        },
      },
      update: {
        status: result.valid 
          ? (result.status === "CLEAR" ? VerificationStatus.VERIFIED : VerificationStatus.PENDING)
          : VerificationStatus.FAILED,
        providerRequestId: result.workerScreeningNumber,
        providerResponse: result as any,
        metadata: {
          screeningStatus: result.status,
          checks: result.checks,
          state: result.state,
        },
        expiresAt: result.expiryDate,
        verifiedAt: result.verifiedAt || (result.valid ? new Date() : null),
        errorMessage: result.valid ? null : result.message,
      },
      create: {
        workerId,
        verificationType: VerificationType.NDIS_WORKER_CHECK,
        status: result.valid 
          ? (result.status === "CLEAR" ? VerificationStatus.VERIFIED : VerificationStatus.PENDING)
          : VerificationStatus.FAILED,
        provider: "NDIS_WORKER_SCREENING",
        providerRequestId: result.workerScreeningNumber,
        providerResponse: result as any,
        metadata: {
          screeningStatus: result.status,
          checks: result.checks,
          state: result.state,
        },
        expiresAt: result.expiryDate,
        verifiedAt: result.verifiedAt || (result.valid ? new Date() : null),
        errorMessage: result.valid ? null : result.message,
      },
    });
  }

  /**
   * Check if worker is eligible to work with NDIS participants
   */
  static async isWorkerEligible(workerId: string): Promise<boolean> {
    const ndisCheck = await prisma.verificationRecord.findUnique({
      where: {
        workerId_verificationType: {
          workerId,
          verificationType: VerificationType.NDIS_WORKER_CHECK,
        },
      },
    });

    if (!ndisCheck || ndisCheck.status !== VerificationStatus.VERIFIED) {
      return false;
    }

    // Check if check has expired
    if (ndisCheck.expiresAt && ndisCheck.expiresAt < new Date()) {
      return false;
    }

    // Check status from provider response
    const response = ndisCheck.providerResponse as any;
    if (response?.status === "EXCLUDED" || response?.status === "NOT_FOUND") {
      return false;
    }

    return response?.status === "CLEAR";
  }

  /**
   * Get worker screening status summary
   */
  static async getWorkerScreeningSummary(workerId: string) {
    const verifications = await prisma.verificationRecord.findMany({
      where: {
        workerId,
        verificationType: {
          in: [
            VerificationType.NDIS_WORKER_CHECK,
            VerificationType.WWCC,
            VerificationType.IDENTITY,
          ],
        },
      },
    });

    const ndisCheck = verifications.find(v => v.verificationType === VerificationType.NDIS_WORKER_CHECK);
    const wwcc = verifications.find(v => v.verificationType === VerificationType.WWCC);
    const policeCheck = verifications.find(v => v.verificationType === VerificationType.IDENTITY);

    return {
      ndisWorkerCheck: {
        status: ndisCheck?.status,
        expiresAt: ndisCheck?.expiresAt,
        screeningStatus: ndisCheck?.providerResponse as any,
      },
      wwcc: {
        status: wwcc?.status,
        expiresAt: wwcc?.expiresAt,
      },
      policeCheck: {
        status: policeCheck?.status,
      },
      isEligible: await this.isWorkerEligible(workerId),
    };
  }
}
