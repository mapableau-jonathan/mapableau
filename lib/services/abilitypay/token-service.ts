/**
 * Token Service
 * Handles tokenization, minting, and token lifecycle management
 */

import { prisma } from "@/lib/prisma";
import { createBlockchainAdapter } from "./blockchain";
import type { BlockchainAdapterConfig, TokenRules } from "./types";

export interface TokenizeCategoryData {
  categoryId: string;
  recipientAddress: string;
  amount: number; // AUD amount
}

export class TokenService {
  private adapter: ReturnType<typeof createBlockchainAdapter>;

  constructor(blockchainConfig: BlockchainAdapterConfig) {
    this.adapter = createBlockchainAdapter(blockchainConfig);
  }

  /**
   * Tokenize a budget category by minting blockchain tokens
   */
  async tokenizeCategory(data: TokenizeCategoryData) {
    const { categoryId, recipientAddress, amount } = data;

    // Get category with plan details
    const category = await prisma.budgetCategory.findUnique({
      where: { id: categoryId },
      include: {
        plan: true,
      },
    });

    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    // Validate plan is active
    if (category.plan.status !== "ACTIVE") {
      throw new Error("Cannot tokenize category for inactive plan");
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    if (amount > Number(category.remainingAmount)) {
      throw new Error("Amount exceeds remaining budget");
    }

    // Check if contract is deployed (use plan's contract or deploy new)
    let contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;
    if (!contractAddress) {
      // Deploy contract if not exists (in production, this should be done separately)
      contractAddress = await this.adapter.deployContract("");
    }

    // Build token rules from category
    const rules: TokenRules = {
      authorizedSpender: recipientAddress,
      eligibleServices: (category.rules as any)?.eligibleServices || [],
      eligibleProviders: (category.rules as any)?.eligibleProviders || [],
      maxAmount: BigInt(Math.floor(amount * 100)), // Convert to cents (smallest unit)
      validFrom: category.plan.startDate.getTime(),
      validUntil: category.plan.endDate.getTime(),
      categoryCode: category.categoryCode,
    };

    // Mint token on blockchain
    const amountInSmallestUnit = BigInt(Math.floor(amount * 100)); // Convert AUD to cents
    const txHash = await this.adapter.mintToken(
      contractAddress,
      recipientAddress,
      amountInSmallestUnit,
      rules
    );

    // Create token voucher record
    const voucher = await prisma.$transaction(async (tx) => {
      // Create voucher
      const newVoucher = await tx.tokenVoucher.create({
        data: {
          categoryId,
          planId: category.planId,
          tokenId: `token_${categoryId}_${Date.now()}`,
          amount,
          status: "MINTED",
          blockchainTxHash: txHash,
          blockchainAddress: contractAddress,
          expiresAt: category.plan.endDate,
        },
      });

      // Update category spent amount (reserve the amount)
      await tx.budgetCategory.update({
        where: { id: categoryId },
        data: {
          remainingAmount: {
            decrement: amount,
          },
        },
      });

      // Update plan remaining budget
      await tx.nDISPlan.update({
        where: { id: category.planId },
        data: {
          remainingBudget: {
            decrement: amount,
          },
        },
      });

      return newVoucher;
    });

    return voucher;
  }

  /**
   * Get token details
   */
  async getToken(tokenId: string) {
    const voucher = await prisma.tokenVoucher.findUnique({
      where: { id: tokenId },
      include: {
        category: true,
        plan: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!voucher) {
      throw new Error(`Token not found: ${tokenId}`);
    }

    return voucher;
  }

  /**
   * Get all tokens for a plan
   */
  async getPlanTokens(planId: string) {
    const tokens = await prisma.tokenVoucher.findMany({
      where: { planId },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return tokens;
  }

  /**
   * Query blockchain for token balance
   */
  async getTokenBalance(tokenId: string, address: string): Promise<bigint> {
    const voucher = await this.getToken(tokenId);

    if (!voucher.blockchainAddress) {
      throw new Error("Token not deployed to blockchain");
    }

    const balance = await this.adapter.getTokenBalance(
      voucher.blockchainAddress,
      address
    );

    return balance;
  }

  /**
   * Validate token rules against a service and provider
   */
  async validateTokenRules(
    tokenId: string,
    serviceCode: string,
    providerId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const voucher = await this.getToken(tokenId);

    if (!voucher.blockchainAddress || !voucher.tokenId) {
      return { valid: false, reason: "Token not deployed to blockchain" };
    }

    // Get rules from blockchain
    const rules = await this.adapter.getTokenRules(
      voucher.blockchainAddress,
      voucher.tokenId
    );

    // Check service eligibility
    if (
      rules.eligibleServices.length > 0 &&
      !rules.eligibleServices.includes(serviceCode)
    ) {
      return {
        valid: false,
        reason: `Service ${serviceCode} not eligible for this token`,
      };
    }

    // Check provider eligibility
    if (
      rules.eligibleProviders.length > 0
    ) {
      // TODO: Map providerId to blockchain address
      // For now, we'll check provider registration
      const provider = await prisma.providerRegistration.findUnique({
        where: { userId: providerId },
      });

      if (!provider) {
        return { valid: false, reason: "Provider not registered" };
      }
    }

    // Check time constraints
    const now = Date.now();
    if (now < rules.validFrom || now > rules.validUntil) {
      return { valid: false, reason: "Token outside valid time window" };
    }

    return { valid: true };
  }

  /**
   * Transfer token (used during payment)
   */
  async transferToken(
    tokenId: string,
    fromAddress: string,
    toAddress: string,
    amount: number
  ): Promise<string> {
    const voucher = await this.getToken(tokenId);

    if (!voucher.blockchainAddress) {
      throw new Error("Token not deployed to blockchain");
    }

    if (voucher.status !== "ACTIVE" && voucher.status !== "MINTED") {
      throw new Error(`Cannot transfer token in status: ${voucher.status}`);
    }

    const amountInSmallestUnit = BigInt(Math.floor(amount * 100));
    const txHash = await this.adapter.transferToken(
      voucher.blockchainAddress,
      fromAddress,
      toAddress,
      amountInSmallestUnit
    );

    // Update voucher status if fully spent
    const newAmount = Number(voucher.amount) - amount;
    if (newAmount <= 0) {
      await prisma.tokenVoucher.update({
        where: { id: tokenId },
        data: {
          status: "SPENT",
          spentAt: new Date(),
        },
      });
    }

    return txHash;
  }

  /**
   * Update token status
   */
  async updateTokenStatus(
    tokenId: string,
    status: "MINTED" | "ACTIVE" | "SPENT" | "EXPIRED" | "REVOKED"
  ) {
    const voucher = await prisma.tokenVoucher.update({
      where: { id: tokenId },
      data: { status },
    });

    return voucher;
  }
}
