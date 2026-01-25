/**
 * NDIS Worker Check Service Wrapper
 * Extends BaseVerificationService for integration with VerificationOrchestrator
 */

import { BaseVerificationService, VerificationRequest, VerificationResponse, VerificationStatusResponse } from "./base";
import { NDISWorkerCheckService as StaticNDISWorkerCheckService } from "./ndis-worker-check-service";
import { logger } from "@/lib/logger";
import { prisma } from "../../prisma";
import { VerificationStatus } from "@prisma/client";

/**
 * NDIS Worker Check Service
 * Integrates NDIS Worker Check verification with the verification orchestrator
 */
export class NDISWorkerCheckServiceWrapper extends BaseVerificationService {
  constructor() {
    super("NDIS_WORKER_SCREENING");
  }

  async verify(request: VerificationRequest): Promise<VerificationResponse> {
    this.validateRequest(request);

    try {
      const result = await StaticNDISWorkerCheckService.verifyNDISWorkerCheck({
        workerId: request.workerId,
        ...(request.data as any),
      });

      if (!result.valid) {
        return this.createErrorResponse(
          new Error(result.message || "NDIS Worker Check verification failed"),
          result.status === "EXCLUDED" ? "FAILED" : "PENDING"
        );
      }

      // Create verification record
      await StaticNDISWorkerCheckService.createNDISWorkerCheckRecord(
        request.workerId,
        result
      );

      return this.createSuccessResponse(
        result.workerScreeningNumber || `ndis-worker-check-${request.workerId}`,
        result.expiryDate,
        {
          status: result.status,
          workerScreeningNumber: result.workerScreeningNumber,
          checks: result.checks,
          state: result.state,
        }
      );
    } catch (error) {
      logger.error("NDIS Worker Check verification error", { error, request });
      return this.createErrorResponse(error);
    }
  }

  async getStatus(providerRequestId: string): Promise<VerificationStatusResponse> {
    try {
      // Find verification record
      const record = await prisma.verificationRecord.findFirst({
        where: {
          providerRequestId,
          verificationType: "NDIS_WORKER_CHECK",
        },
      });

      if (!record) {
        return {
          status: "PENDING",
          providerRequestId,
          errorMessage: "Verification record not found",
        };
      }

      const response = record.providerResponse as any;

      return {
        status: record.status,
        providerRequestId: record.providerRequestId || undefined,
        verifiedAt: record.verifiedAt || undefined,
        expiresAt: record.expiresAt || undefined,
        metadata: record.metadata as any,
        errorMessage: record.errorMessage || undefined,
      };
    } catch (error) {
      logger.error("NDIS Worker Check status check error", { error, providerRequestId });
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
          verificationType: "NDIS_WORKER_CHECK",
        },
        include: {
          worker: true,
        },
      });

      if (!record) {
        return this.createErrorResponse(new Error("Verification record not found"));
      }

      // Re-verify
      const result = await StaticNDISWorkerCheckService.verifyNDISWorkerCheck({
        workerId: record.workerId,
      });

      if (!result.valid) {
        await prisma.verificationRecord.update({
          where: { id: record.id },
          data: {
            status: result.status === "EXCLUDED" ? VerificationStatus.FAILED : VerificationStatus.PENDING,
            errorMessage: result.message,
          },
        });

        return this.createErrorResponse(
          new Error(result.message || "NDIS Worker Check recheck failed"),
          result.status === "EXCLUDED" ? "FAILED" : "PENDING"
        );
      }

      // Update record
      await StaticNDISWorkerCheckService.createNDISWorkerCheckRecord(
        record.workerId,
        result
      );

      return this.createSuccessResponse(
        providerRequestId,
        result.expiryDate,
        {
          status: result.status,
          recheckedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      logger.error("NDIS Worker Check recheck error", { error, providerRequestId });
      return this.createErrorResponse(error);
    }
  }
}
