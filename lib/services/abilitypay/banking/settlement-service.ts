/**
 * Settlement Service
 * Manages bank settlement workflow and reconciliation
 */

import { prisma } from "@/lib/prisma";
import { NPPAdapter, type PayeeDetails } from "./npp-adapter";

export class SettlementService {
  private nppAdapter: NPPAdapter;

  constructor(nppAdapter: NPPAdapter) {
    this.nppAdapter = nppAdapter;
  }

  /**
   * Process settlement for completed transactions
   */
  async processSettlement(transactionIds: string[]) {
    // Get transactions
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        id: { in: transactionIds },
        status: "COMPLETED",
      },
      include: {
        provider: {
          include: {
            providerRegistration: true,
          },
        },
      },
    });

    if (transactions.length === 0) {
      throw new Error("No completed transactions found for settlement");
    }

    // Group by provider and prepare payments
    const providerPayments = new Map<
      string,
      { provider: any; transactions: typeof transactions; totalAmount: number }
    >();

    for (const transaction of transactions) {
      const providerId = transaction.providerId;
      if (!providerPayments.has(providerId)) {
        providerPayments.set(providerId, {
          provider: transaction.provider,
          transactions: [],
          totalAmount: 0,
        });
      }

      const providerData = providerPayments.get(providerId)!;
      providerData.transactions.push(transaction);
      providerData.totalAmount += Number(transaction.amount);
    }

    // Process settlements for each provider
    const settlements = [];
    for (const [providerId, data] of providerPayments) {
      const settlement = await this.settleProvider(
        providerId,
        data.transactions.map((t) => t.id),
        data.totalAmount
      );
      settlements.push(settlement);
    }

    return settlements;
  }

  /**
   * Settle payments for a specific provider
   */
  private async settleProvider(
    providerId: string,
    transactionIds: string[],
    totalAmount: number
  ) {
    // Get provider bank details (would be stored encrypted)
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      include: {
        providerRegistration: true,
      },
    });

    if (!provider || !provider.providerRegistration) {
      throw new Error(`Provider not found or not registered: ${providerId}`);
    }

    // In a real implementation, bank details would be retrieved from encrypted storage
    // For now, we'll use a placeholder
    const bankDetails: PayeeDetails = {
      accountNumber: "12345678", // Would be retrieved from secure storage
      bsb: "123456",
      accountName: provider.name || provider.email,
    };

    // Verify account
    const verification = await this.nppAdapter.verifyAccount(bankDetails);
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
        bankAccountDetails: bankDetails as any, // In production, this should be encrypted
      },
    });

    return redemption;
  }

  /**
   * Reconcile settlements with bank statements
   */
  async reconcileSettlements(dateRange: { start: Date; end: Date }) {
    // Get all completed redemptions in date range
    const redemptions = await prisma.redemptionRequest.findMany({
      where: {
        status: "COMPLETED",
        settledAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      include: {
        transactions: true,
      },
    });

    // In a real implementation, this would:
    // 1. Fetch bank statements via API
    // 2. Match transactions by reference
    // 3. Flag discrepancies
    // 4. Generate reconciliation report

    return {
      totalRedemptions: redemptions.length,
      totalAmount: redemptions.reduce(
        (sum, r) => sum + Number(r.totalAmount),
        0
      ),
      redemptions,
    };
  }
}
