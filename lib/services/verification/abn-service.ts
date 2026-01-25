/**
 * ABN Verification Service
 * Extends BaseVerificationService for integration with VerificationOrchestrator
 */

import { BaseVerificationService, VerificationRequest, VerificationResponse, VerificationStatusResponse } from "./base";
import { ABNVerificationService as StaticABNService } from "./abn-verification-service";
import { logger } from "@/lib/logger";
import { prisma } from "../../prisma";

/**
 * ABN Verification Service
 * Integrates ABN verification with the verification orchestrator
 */
export class ABNService extends BaseVerificationService {
  constructor() {
    super("ABR");
  }

  async verify(request: VerificationRequest): Promise<VerificationResponse> {
    this.validateRequest(request);

    try {
      const abn = request.data.abn as string;
      if (!abn) {
        return this.createErrorResponse(new Error("ABN is required"));
      }

      const result = await StaticABNService.verifyABN({
        abn,
        workerId: request.workerId,
      });

      if (!result.valid) {
        return this.createErrorResponse(
          new Error(result.message || "ABN verification failed"),
          "FAILED"
        );
      }

      // Create verification record
      await StaticABNService.createABNVerificationRecord(
        request.workerId,
        abn,
        result
      );

      return this.createSuccessResponse(
        `abn-${result.abn}`,
        undefined,
        {
          abn: result.abn,
          entityName: result.entityName,
          entityType: result.entityType,
          gstRegistered: result.gstRegistered,
        }
      );
    } catch (error) {
      logger.error("ABN verification error", { error, request });
      return this.createErrorResponse(error);
    }
  }

  async getStatus(providerRequestId: string): Promise<VerificationStatusResponse> {
    // Extract ABN from provider request ID
    const abn = providerRequestId.replace("abn-", "");

    try {
      // Re-verify ABN to get current status
      const result = await StaticABNService.verifyABN({ abn });

      return {
        status: result.valid ? "VERIFIED" : "FAILED",
        providerRequestId,
        verifiedAt: result.valid ? new Date() : undefined,
        metadata: {
          abn: result.abn,
          entityName: result.entityName,
        },
        errorMessage: result.valid ? undefined : result.message,
      };
    } catch (error) {
      logger.error("ABN status check error", { error, providerRequestId });
      return {
        status: "FAILED",
        providerRequestId,
        errorMessage: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  async recheck(providerRequestId: string): Promise<VerificationResponse> {
    const abn = providerRequestId.replace("abn-", "");

    try {
      const result = await StaticABNService.verifyABN({ abn });

      if (!result.valid) {
        return this.createErrorResponse(
          new Error(result.message || "ABN recheck failed"),
          "FAILED"
        );
      }

      return this.createSuccessResponse(
        providerRequestId,
        undefined,
        {
          abn: result.abn,
          entityName: result.entityName,
          recheckedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      logger.error("ABN recheck error", { error, providerRequestId });
      return this.createErrorResponse(error);
    }
  }
}
