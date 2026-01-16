/**
 * Redemption Service
 * Processes provider token-to-AUD conversion via NPP
 */

import { prisma } from "@/lib/prisma";
import { NPPAdapter } from "./banking/npp-adapter";
import { SettlementService } from "./banking/settlement-service";

export interface RequestRedemptionData {
  providerId: string;
  transactionIds: string[];
  bankAccountDetails: {
    accountNumber: string;
    bsb: string;
    accountName: string;
    payId?: string;
  };
}

export class RedemptionService {
  private nppAdapter: NPPAdapter;
  private settlementService: SettlementService;

  constructor(nppAdapter: NPPAdapter) {
    this.nppAdapter = nppAdapter;
    this.settlementService = new SettlementService(nppAdapter);
  }

  /**
   * Request redemption of tokens to AUD
   */
  async requestRedemption(data: RequestRedemptionData) {
    const { providerId, transactionIds, bankAccountDetails } = data;

    // Validate provider
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      include: {
        providerRegistration: true,
      },
    });

    if (!provider || !provider.providerRegistration) {
      throw new Error("Provider not registered");
    }

    if (provider.providerRegistration.registrationStatus !== "ACTIVE") {
      throw new Error("Provider registration is not active");
    }

    // Get transactions
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        id: { in: transactionIds },
        providerId,
        status: "COMPLETED",
      },
    });

    if (transactions.length === 0) {
      throw new Error("No completed transactions found for redemption");
    }

    // Check if transactions are already part of a redemption
    const existingRedemptions = await prisma.redemptionRequest.findMany({
      where: {
        transactionIds: {
          hasSome: transactionIds,
        },
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
    });

    if (existingRedemptions.length > 0) {
      throw new Error(
        "Some transactions are already part of a pending redemption"
      );
    }

    // Calculate total amount
    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    // Verify bank account
    const verification = await this.nppAdapter.verifyAccount(bankAccountDetails);
    if (!verification.valid) {
      throw new Error(`Account verification failed: ${verification.error}`);
    }

    // Create redemption request
    const redemption = await prisma.redemptionRequest.create({
      data: {
        providerId,
        transactionIds,
        totalAmount,
        status: "PENDING",
        bankAccountDetails: bankAccountDetails as any, // In production, encrypt this
      },
    });

    return redemption;
  }

  /**
   * Process redemption (execute NPP payment)
   */
  async processRedemption(redemptionId: string) {
    const redemption = await prisma.redemptionRequest.findUnique({
      where: { id: redemptionId },
      include: {
        transactions: true,
      },
    });

    if (!redemption) {
      throw new Error(`Redemption not found: ${redemptionId}`);
    }

    if (redemption.status !== "PENDING") {
      throw new Error(`Redemption is not in PENDING status: ${redemption.status}`);
    }

    try {
      // Update status to PROCESSING
      await prisma.redemptionRequest.update({
        where: { id: redemptionId },
        data: { status: "PROCESSING" },
      });

      // Execute NPP payment
      const bankDetails = redemption.bankAccountDetails as any;
      const paymentResult = await this.nppAdapter.initiatePayment({
        payeeDetails: {
          accountNumber: bankDetails.accountNumber,
          bsb: bankDetails.bsb,
          accountName: bankDetails.accountName,
          payId: bankDetails.payId,
        },
        amount: Number(redemption.totalAmount),
        reference: `REDEMPTION-${redemptionId}`,
        description: `NDIS Payment Redemption - ${redemption.transactions.length} transactions`,
      });

      // Update redemption with NPP transaction ID
      const updated = await prisma.redemptionRequest.update({
        where: { id: redemptionId },
        data: {
          nppTransactionId: paymentResult.paymentId,
          status: "COMPLETED",
          settledAt: new Date(),
        },
      });

      return updated;
    } catch (error: any) {
      // Mark as failed
      await prisma.redemptionRequest.update({
        where: { id: redemptionId },
        data: {
          status: "FAILED",
        },
      });

      throw error;
    }
  }

  /**
   * Get redemption status
   */
  async getRedemptionStatus(redemptionId: string) {
    const redemption = await prisma.redemptionRequest.findUnique({
      where: { id: redemptionId },
      include: {
        transactions: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
              },
            },
            voucher: {
              include: {
                category: true,
              },
            },
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!redemption) {
      throw new Error(`Redemption not found: ${redemptionId}`);
    }

    // If NPP transaction ID exists, check status with NPP
    if (redemption.nppTransactionId) {
      try {
        const nppStatus = await this.nppAdapter.getPaymentStatus(
          redemption.nppTransactionId
        );
        return {
          ...redemption,
          nppStatus,
        };
      } catch (error) {
        // If NPP check fails, return redemption status
        console.error("Failed to check NPP status:", error);
      }
    }

    return redemption;
  }

  /**
   * Get provider redemption history
   */
  async getProviderRedemptions(providerId: string) {
    const redemptions = await prisma.redemptionRequest.findMany({
      where: { providerId },
      include: {
        transactions: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return redemptions;
  }

  /**
   * Batch process multiple redemptions
   */
  async batchRedemptions(
    providerId: string,
    dateRange?: { start: Date; end: Date }
  ) {
    const where: any = {
      providerId,
      status: "PENDING",
    };

    if (dateRange) {
      where.requestedAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const redemptions = await prisma.redemptionRequest.findMany({
      where,
      orderBy: {
        requestedAt: "asc",
      },
    });

    const results = [];
    for (const redemption of redemptions) {
      try {
        const result = await this.processRedemption(redemption.id);
        results.push({ success: true, redemption: result });
      } catch (error: any) {
        results.push({
          success: false,
          redemptionId: redemption.id,
          error: error.message,
        });
      }
    }

    return results;
  }
}
