/**
 * Custom AbilityPay RPC Methods
 * NDIS-specific and AbilityPay functionality
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface AbilityPayRPCMethods {
  abilitypay_getNDISPlan(planId: string): Promise<any>;
  abilitypay_getTokenVouchers(participantId: string): Promise<any[]>;
  abilitypay_getPaymentHistory(participantId: string, limit?: number): Promise<any[]>;
  abilitypay_validatePayment(paymentData: any): Promise<any>;
  abilitypay_getProviderStatus(providerId: string): Promise<any>;
  abilitypay_getNetworkStatus(): Promise<any>;
  abilitypay_getQualityRating(providerId: string, participantId?: string): Promise<any>;
  abilitypay_getSafeguardingBenchmark(providerId: string, participantId?: string): Promise<any>;
  abilitypay_submitQualityRating(ratingData: any): Promise<string>;
  abilitypay_submitSafeguardingUpdate(benchmarkData: any): Promise<string>;
  abilitypay_getQualityHistory(providerId: string, limit?: number): Promise<any[]>;
  abilitypay_getSafeguardingHistory(providerId: string, limit?: number): Promise<any[]>;
}

export class AbilityPayRPC implements AbilityPayRPCMethods {
  /**
   * abilitypay_getNDISPlan - Get NDIS plan details
   */
  async abilitypay_getNDISPlan(planId: string): Promise<any> {
    try {
      const plan = await prisma.nDISPlan.findUnique({
        where: { id: planId },
        include: {
          categories: true,
          participant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      return {
        id: plan.id,
        planNumber: plan.planNumber,
        status: plan.status,
        startDate: plan.startDate.toISOString(),
        endDate: plan.endDate.toISOString(),
        totalBudget: plan.totalBudget.toString(),
        remainingBudget: plan.remainingBudget.toString(),
        categories: plan.categories.map((cat) => ({
          id: cat.id,
          categoryCode: cat.categoryCode,
          allocatedAmount: cat.allocatedAmount.toString(),
          spentAmount: cat.spentAmount.toString(),
          remainingAmount: cat.remainingAmount.toString(),
        })),
        participant: plan.participant,
      };
    } catch (error: any) {
      logger.error("abilitypay_getNDISPlan error", error);
      throw error;
    }
  }

  /**
   * abilitypay_getTokenVouchers - Get token vouchers for participant
   */
  async abilitypay_getTokenVouchers(participantId: string): Promise<any[]> {
    try {
      const plan = await prisma.nDISPlan.findUnique({
        where: { participantId },
        include: {
          categories: {
            include: {
              tokens: {
                where: { status: { in: ["MINTED", "ACTIVE"] } },
              },
            },
          },
        },
      });

      if (!plan) {
        return [];
      }

      const vouchers: any[] = [];
      plan.categories.forEach((category) => {
        category.tokens.forEach((token) => {
          vouchers.push({
            id: token.id,
            tokenId: token.tokenId,
            categoryCode: category.categoryCode,
            amount: token.amount.toString(),
            status: token.status,
            expiresAt: token.expiresAt?.toISOString(),
            mintedAt: token.mintedAt.toISOString(),
          });
        });
      });

      return vouchers;
    } catch (error: any) {
      logger.error("abilitypay_getTokenVouchers error", error);
      throw error;
    }
  }

  /**
   * abilitypay_getPaymentHistory - Get payment transaction history
   */
  async abilitypay_getPaymentHistory(participantId: string, limit: number = 50): Promise<any[]> {
    try {
      const transactions = await prisma.paymentTransaction.findMany({
        where: { participantId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          provider: {
            select: { id: true, name: true, email: true },
          },
          voucher: {
            select: { id: true, tokenId: true },
          },
        },
      });

      return transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount.toString(),
        status: tx.status,
        serviceCode: tx.serviceCode,
        serviceDescription: tx.serviceDescription,
        provider: tx.provider,
        createdAt: tx.createdAt.toISOString(),
        completedAt: tx.completedAt?.toISOString(),
        blockchainTxHash: tx.blockchainTxHash,
      }));
    } catch (error: any) {
      logger.error("abilitypay_getPaymentHistory error", error);
      throw error;
    }
  }

  /**
   * abilitypay_validatePayment - Validate payment against NDIS rules
   */
  async abilitypay_validatePayment(paymentData: any): Promise<any> {
    try {
      // This would use the ValidationService
      const { ValidationService } = await import("../../validation-service");
      const validationService = new ValidationService();

      const validation = await validationService.validatePayment({
        planId: paymentData.planId,
        categoryId: paymentData.categoryId,
        providerId: paymentData.providerId,
        serviceCode: paymentData.serviceCode,
        amount: paymentData.amount,
        workerId: paymentData.workerId,
      });

      return {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings || [],
      };
    } catch (error: any) {
      logger.error("abilitypay_validatePayment error", error);
      throw error;
    }
  }

  /**
   * abilitypay_getProviderStatus - Get provider registration status
   */
  async abilitypay_getProviderStatus(providerId: string): Promise<any> {
    try {
      const provider = await prisma.providerRegistration.findUnique({
        where: { userId: providerId },
      });

      if (!provider) {
        throw new Error("Provider not found");
      }

      return {
        providerNumber: provider.providerNumber,
        registrationStatus: provider.registrationStatus,
        serviceCategories: provider.serviceCategories,
        verifiedAt: provider.verifiedAt?.toISOString(),
        expiresAt: provider.expiresAt?.toISOString(),
      };
    } catch (error: any) {
      logger.error("abilitypay_getProviderStatus error", error);
      throw error;
    }
  }

  /**
   * abilitypay_getNetworkStatus - Get network health and statistics
   */
  async abilitypay_getNetworkStatus(): Promise<any> {
    try {
      const latestBlock = await prisma.block.findFirst({
        orderBy: { number: "desc" },
      });

      const nodeCount = await prisma.paymentNode.count({
        where: { status: "ACTIVE" },
      });

      const transactionCount = await prisma.networkTransaction.count({
        where: { status: "CONFIRMED" },
      });

      return {
        blockNumber: latestBlock ? latestBlock.number.toString() : "0",
        blockHash: latestBlock?.hash || "0x0",
        peerCount: nodeCount,
        transactionCount,
        networkId: "abilitypay-mainnet",
        chainId: "0x1",
      };
    } catch (error: any) {
      logger.error("abilitypay_getNetworkStatus error", error);
      throw error;
    }
  }

  /**
   * abilitypay_getQualityRating - Get quality rating for provider/participant
   */
  async abilitypay_getQualityRating(providerId: string, participantId?: string): Promise<any> {
    try {
      // Query quality ratings from network transactions
      const transactions = await prisma.networkTransaction.findMany({
        where: {
          type: "QUALITY_RATING",
          to: providerId,
          ...(participantId && {
            data: {
              path: ["participantId"],
              equals: participantId,
            } as any,
          }),
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });

      if (transactions.length === 0) {
        return null;
      }

      const ratingData = transactions[0].data as any;
      return {
        providerId: ratingData.qualityRating?.providerId,
        participantId: ratingData.qualityRating?.participantId,
        rating: ratingData.qualityRating?.rating,
        category: ratingData.qualityRating?.category,
        comment: ratingData.qualityRating?.comment,
        timestamp: ratingData.qualityRating?.timestamp,
        transactionHash: transactions[0].hash,
      };
    } catch (error: any) {
      logger.error("abilitypay_getQualityRating error", error);
      throw error;
    }
  }

  /**
   * abilitypay_getSafeguardingBenchmark - Get safeguarding benchmark scores
   */
  async abilitypay_getSafeguardingBenchmark(providerId: string, participantId?: string): Promise<any> {
    try {
      const transactions = await prisma.networkTransaction.findMany({
        where: {
          type: "SAFEGUARDING_UPDATE",
          to: providerId,
          ...(participantId && {
            data: {
              path: ["participantId"],
              equals: participantId,
            } as any,
          }),
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });

      if (transactions.length === 0) {
        return null;
      }

      const benchmarkData = transactions[0].data as any;
      return {
        providerId: benchmarkData.safeguardingBenchmark?.providerId,
        participantId: benchmarkData.safeguardingBenchmark?.participantId,
        benchmark: benchmarkData.safeguardingBenchmark?.benchmark,
        score: benchmarkData.safeguardingBenchmark?.score,
        criteria: benchmarkData.safeguardingBenchmark?.criteria,
        timestamp: benchmarkData.safeguardingBenchmark?.timestamp,
        transactionHash: transactions[0].hash,
      };
    } catch (error: any) {
      logger.error("abilitypay_getSafeguardingBenchmark error", error);
      throw error;
    }
  }

  /**
   * abilitypay_submitQualityRating - Submit quality rating update
   */
  async abilitypay_submitQualityRating(ratingData: any): Promise<string> {
    try {
      // Create transaction for quality rating
      // This would be submitted to the network
      const txHash = `0x${Buffer.from(`${Date.now()}-${ratingData.providerId}`).toString("hex")}`;
      
      // Store as pending transaction
      await prisma.networkTransaction.create({
        data: {
          hash: txHash,
          type: "QUALITY_RATING",
          from: ratingData.reviewerId,
          to: ratingData.providerId,
          amount: BigInt(0),
          nonce: BigInt(Date.now()),
          data: {
            qualityRating: {
              providerId: ratingData.providerId,
              participantId: ratingData.participantId,
              rating: ratingData.rating,
              category: ratingData.category,
              comment: ratingData.comment,
              reviewerId: ratingData.reviewerId,
              timestamp: Date.now(),
            },
          } as any,
          signature: "", // Would be signed by submitter
          status: "PENDING",
        },
      });

      return txHash;
    } catch (error: any) {
      logger.error("abilitypay_submitQualityRating error", error);
      throw error;
    }
  }

  /**
   * abilitypay_submitSafeguardingUpdate - Submit safeguarding benchmark update
   */
  async abilitypay_submitSafeguardingUpdate(benchmarkData: any): Promise<string> {
    try {
      const txHash = `0x${Buffer.from(`${Date.now()}-${benchmarkData.providerId}`).toString("hex")}`;
      
      await prisma.networkTransaction.create({
        data: {
          hash: txHash,
          type: "SAFEGUARDING_UPDATE",
          from: benchmarkData.assessedBy,
          to: benchmarkData.providerId,
          amount: BigInt(0),
          nonce: BigInt(Date.now()),
          data: {
            safeguardingBenchmark: {
              providerId: benchmarkData.providerId,
              participantId: benchmarkData.participantId,
              benchmark: benchmarkData.benchmark,
              score: benchmarkData.score,
              criteria: benchmarkData.criteria,
              assessedBy: benchmarkData.assessedBy,
              timestamp: Date.now(),
            },
          } as any,
          signature: "",
          status: "PENDING",
        },
      });

      return txHash;
    } catch (error: any) {
      logger.error("abilitypay_submitSafeguardingUpdate error", error);
      throw error;
    }
  }

  /**
   * abilitypay_getQualityHistory - Get quality rating history
   */
  async abilitypay_getQualityHistory(providerId: string, limit: number = 50): Promise<any[]> {
    try {
      const transactions = await prisma.networkTransaction.findMany({
        where: {
          type: "QUALITY_RATING",
          to: providerId,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return transactions.map((tx) => {
        const ratingData = tx.data as any;
        return {
          transactionHash: tx.hash,
          rating: ratingData.qualityRating?.rating,
          category: ratingData.qualityRating?.category,
          comment: ratingData.qualityRating?.comment,
          timestamp: ratingData.qualityRating?.timestamp,
          createdAt: tx.createdAt.toISOString(),
        };
      });
    } catch (error: any) {
      logger.error("abilitypay_getQualityHistory error", error);
      throw error;
    }
  }

  /**
   * abilitypay_getSafeguardingHistory - Get safeguarding benchmark history
   */
  async abilitypay_getSafeguardingHistory(providerId: string, limit: number = 50): Promise<any[]> {
    try {
      const transactions = await prisma.networkTransaction.findMany({
        where: {
          type: "SAFEGUARDING_UPDATE",
          to: providerId,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return transactions.map((tx) => {
        const benchmarkData = tx.data as any;
        return {
          transactionHash: tx.hash,
          benchmark: benchmarkData.safeguardingBenchmark?.benchmark,
          score: benchmarkData.safeguardingBenchmark?.score,
          criteria: benchmarkData.safeguardingBenchmark?.criteria,
          timestamp: benchmarkData.safeguardingBenchmark?.timestamp,
          createdAt: tx.createdAt.toISOString(),
        };
      });
    } catch (error: any) {
      logger.error("abilitypay_getSafeguardingHistory error", error);
      throw error;
    }
  }
}
