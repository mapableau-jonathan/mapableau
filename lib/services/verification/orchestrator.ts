import { prisma } from "../../prisma";
import type { VerificationType, VerificationStatus } from "@prisma/client";
import { IdentityVerificationService } from "./identity";
import { VEVOService } from "./vevo";
import { WWCCService } from "./wwcc";
import { NDISService } from "./ndis";
import { FirstAidService } from "./firstaid";
import type { VerificationRequest } from "./base";
import { verificationConfig } from "../../config/verification";

export class VerificationOrchestrator {
  private identityService: IdentityVerificationService;
  private vevoService: VEVOService;
  private wwccService: WWCCService;
  private ndisService: NDISService;
  private firstAidService: FirstAidService;

  constructor() {
    this.identityService = new IdentityVerificationService();
    this.vevoService = new VEVOService();
    this.wwccService = new WWCCService();
    this.ndisService = new NDISService();
    this.firstAidService = new FirstAidService();
  }

  /**
   * Initiate verification for a specific type
   */
  async initiateVerification(
    workerId: string,
    verificationType: VerificationType,
    data: Record<string, unknown>,
    documents?: Array<{
      type: string;
      fileUrl: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<{
    success: boolean;
    verificationRecordId: string;
    status: VerificationStatus;
    providerRequestId?: string;
    errorMessage?: string;
  }> {
    // Get or create verification record
    let verificationRecord = await prisma.verificationRecord.findUnique({
      where: {
        workerId_verificationType: {
          workerId,
          verificationType,
        },
      },
    });

    if (!verificationRecord) {
      verificationRecord = await prisma.verificationRecord.create({
        data: {
          workerId,
          verificationType,
          status: "PENDING",
          provider: this.getProviderForType(verificationType),
        },
      });
    }

    // Create verification request
    const request: VerificationRequest = {
      workerId,
      verificationType,
      data,
      documents,
    };

    try {
      // Get appropriate service
      const service = this.getServiceForType(verificationType);
      const response = await service.verify(request);

      // Update verification record
      const updated = await prisma.verificationRecord.update({
        where: { id: verificationRecord.id },
        data: {
          status: response.status,
          providerRequestId: response.providerRequestId,
          providerResponse: response.providerResponse as any,
          expiresAt: response.expiresAt,
          verifiedAt: response.success ? new Date() : undefined,
          errorMessage: response.errorMessage,
          metadata: response.metadata as any,
        },
      });

      // Store documents if provided
      if (documents && documents.length > 0) {
        await Promise.all(
          documents.map((doc) =>
            prisma.verificationDocument.create({
              data: {
                verificationRecordId: updated.id,
                documentType: doc.type,
                fileUrl: doc.fileUrl,
                metadata: doc.metadata as any,
              },
            })
          )
        );
      }

      // Update worker status if all critical verifications are complete
      await this.updateWorkerStatus(workerId);

      return {
        success: response.success,
        verificationRecordId: updated.id,
        status: updated.status,
        providerRequestId: updated.providerRequestId || undefined,
        errorMessage: updated.errorMessage || undefined,
      };
    } catch (error) {
      // Update record with error
      const updated = await prisma.verificationRecord.update({
        where: { id: verificationRecord.id },
        data: {
          status: "FAILED",
          errorMessage:
            error instanceof Error ? error.message : "Verification failed",
        },
      });

      return {
        success: false,
        verificationRecordId: updated.id,
        status: updated.status,
        errorMessage: updated.errorMessage || undefined,
      };
    }
  }

  /**
   * Get status of all verifications for a worker
   */
  async getWorkerVerifications(workerId: string) {
    const verifications = await prisma.verificationRecord.findMany({
      where: { workerId },
      include: {
        documents: true,
        alerts: {
          where: {
            acknowledgedAt: null,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return verifications;
  }

  /**
   * Check status of a specific verification
   */
  async checkVerificationStatus(
    verificationRecordId: string
  ): Promise<VerificationStatus> {
    const record = await prisma.verificationRecord.findUnique({
      where: { id: verificationRecordId },
    });

    if (!record || !record.providerRequestId) {
      return record?.status || "PENDING";
    }

    try {
      const service = this.getServiceForType(record.verificationType);
      const statusResponse = await service.getStatus(record.providerRequestId);

      // Update record with latest status
      await prisma.verificationRecord.update({
        where: { id: verificationRecordId },
        data: {
          status: statusResponse.status,
          verifiedAt: statusResponse.verifiedAt,
          expiresAt: statusResponse.expiresAt,
          metadata: statusResponse.metadata as any,
          errorMessage: statusResponse.errorMessage,
        },
      });

      // Update worker status
      await this.updateWorkerStatus(record.workerId);

      return statusResponse.status;
    } catch (error) {
      console.error("Error checking verification status:", error);
      return record.status;
    }
  }

  /**
   * Recheck a verification
   */
  async recheckVerification(
    verificationRecordId: string
  ): Promise<{ success: boolean; status: VerificationStatus }> {
    const record = await prisma.verificationRecord.findUnique({
      where: { id: verificationRecordId },
    });

    if (!record || !record.providerRequestId) {
      return { success: false, status: record?.status || "PENDING" };
    }

    try {
      const service = this.getServiceForType(record.verificationType);
      const response = await service.recheck(record.providerRequestId);

      // Update record
      const updated = await prisma.verificationRecord.update({
        where: { id: verificationRecordId },
        data: {
          status: response.status,
          verifiedAt: response.success ? new Date() : undefined,
          expiresAt: response.expiresAt,
          errorMessage: response.errorMessage,
          metadata: response.metadata as any,
        },
      });

      // Update worker status
      await this.updateWorkerStatus(record.workerId);

      return {
        success: response.success,
        status: updated.status,
      };
    } catch (error) {
      return {
        success: false,
        status: record.status,
      };
    }
  }

  /**
   * Update worker status based on all verifications
   */
  async updateWorkerStatus(workerId: string): Promise<void> {
    const verifications = await prisma.verificationRecord.findMany({
      where: { workerId },
    });

    // Check if all required verifications are verified
    const requiredTypes: VerificationType[] = ["IDENTITY", "VEVO"];
    if (verificationConfig.enableWWCC) {
      requiredTypes.push("WWCC");
    }
    if (verificationConfig.enableNDIS) {
      requiredTypes.push("NDIS");
    }
    if (verificationConfig.enableFirstAid) {
      requiredTypes.push("FIRST_AID");
    }

    const allVerified = requiredTypes.every((type) => {
      const verification = verifications.find((v) => v.verificationType === type);
      return verification?.status === "VERIFIED";
    });

    const anyFailed = verifications.some((v) => v.status === "FAILED");
    const anyExpired = verifications.some((v) => v.status === "EXPIRED");

    let workerStatus: "VERIFIED" | "SUSPENDED" | "REJECTED" | "ONBOARDING_IN_PROGRESS" =
      "ONBOARDING_IN_PROGRESS";

    if (anyFailed) {
      workerStatus = "REJECTED";
    } else if (anyExpired) {
      workerStatus = "SUSPENDED";
    } else if (allVerified) {
      workerStatus = "VERIFIED";
    }

    await prisma.worker.update({
      where: { id: workerId },
      data: {
        status: workerStatus,
        onboardingStatus:
          allVerified && !anyFailed && !anyExpired
            ? "COMPLETED"
            : "IN_PROGRESS",
      },
    });
  }

  /**
   * Get service for verification type
   */
  private getServiceForType(verificationType: VerificationType) {
    switch (verificationType) {
      case "IDENTITY":
        return this.identityService;
      case "VEVO":
        return this.vevoService;
      case "WWCC":
        return this.wwccService;
      case "NDIS":
        return this.ndisService;
      case "FIRST_AID":
        return this.firstAidService;
      default:
        throw new Error(`Unknown verification type: ${verificationType}`);
    }
  }

  /**
   * Get provider name for verification type
   */
  private getProviderForType(verificationType: VerificationType): string {
    switch (verificationType) {
      case "IDENTITY":
        return verificationConfig.identityProvider;
      case "VEVO":
        return verificationConfig.vevoProvider;
      case "WWCC":
        return "oho";
      case "NDIS":
        return "ndis";
      case "FIRST_AID":
        return "usi";
      default:
        return "unknown";
    }
  }

  /**
   * Initiate all required verifications for a worker
   */
  async initiateAllVerifications(
    workerId: string,
    verificationData: {
      identity?: Record<string, unknown>;
      vevo?: Record<string, unknown>;
      wwcc?: Record<string, unknown>;
      ndis?: Record<string, unknown>;
      firstAid?: Record<string, unknown>;
    },
    documents?: Array<{
      type: string;
      fileUrl: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<Array<{ type: VerificationType; success: boolean; recordId: string }>> {
    const results = [];

    // Identity must be verified first
    if (verificationData.identity) {
      const result = await this.initiateVerification(
        workerId,
        "IDENTITY",
        verificationData.identity,
        documents?.filter((d) =>
          ["drivers_licence_front", "passport"].includes(d.type)
        )
      );
      results.push({
        type: "IDENTITY" as VerificationType,
        success: result.success,
        recordId: result.verificationRecordId,
      });
    }

    // VEVO
    if (verificationData.vevo) {
      const result = await this.initiateVerification(
        workerId,
        "VEVO",
        verificationData.vevo
      );
      results.push({
        type: "VEVO" as VerificationType,
        success: result.success,
        recordId: result.verificationRecordId,
      });
    }

    // WWCC
    if (verificationConfig.enableWWCC && verificationData.wwcc) {
      const result = await this.initiateVerification(
        workerId,
        "WWCC",
        verificationData.wwcc
      );
      results.push({
        type: "WWCC" as VerificationType,
        success: result.success,
        recordId: result.verificationRecordId,
      });
    }

    // NDIS
    if (verificationConfig.enableNDIS && verificationData.ndis) {
      const result = await this.initiateVerification(
        workerId,
        "NDIS",
        verificationData.ndis
      );
      results.push({
        type: "NDIS" as VerificationType,
        success: result.success,
        recordId: result.verificationRecordId,
      });
    }

    // First Aid
    if (verificationConfig.enableFirstAid && verificationData.firstAid) {
      const result = await this.initiateVerification(
        workerId,
        "FIRST_AID",
        verificationData.firstAid,
        documents?.filter((d) => d.type === "first_aid_certificate")
      );
      results.push({
        type: "FIRST_AID" as VerificationType,
        success: result.success,
        recordId: result.verificationRecordId,
      });
    }

    return results;
  }
}
