/**
 * Payment Service for Advertising
 * Handles publisher payouts and advertiser billing
 */

import { prisma } from "@/lib/prisma";
import { RevenueCalculator } from "./revenue-calculator";
import { advertisingConfig } from "@/lib/config/advertising";
import { Decimal } from "@prisma/client/runtime/library";

export class AdvertisingPaymentService {
  private revenueCalculator: RevenueCalculator;

  constructor() {
    this.revenueCalculator = new RevenueCalculator();
  }

  /**
   * Request publisher payout
   */
  async requestPublisherPayout(
    publisherId: string,
    amount?: number
  ): Promise<{
    success: boolean;
    paymentId?: string;
    message: string;
  }> {
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
    });

    if (!publisher) {
      throw new Error("Publisher not found");
    }

    // Check payment threshold
    const thresholdCheck = await this.revenueCalculator.checkPaymentThreshold(
      publisherId
    );

    if (!thresholdCheck.reached) {
      return {
        success: false,
        message: `Minimum payout threshold not reached. Current: $${thresholdCheck.unpaidEarnings.toFixed(2)}, Required: $${thresholdCheck.threshold.toFixed(2)}`,
      };
    }

    // Calculate payout amount
    const payoutAmount = amount || thresholdCheck.unpaidEarnings;

    if (payoutAmount > thresholdCheck.unpaidEarnings) {
      return {
        success: false,
        message: `Requested amount exceeds unpaid earnings. Available: $${thresholdCheck.unpaidEarnings.toFixed(2)}`,
      };
    }

    // Determine payment period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    if (advertisingConfig.payment.paymentFrequency === "monthly") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (advertisingConfig.payment.paymentFrequency === "weekly") {
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - (7 - daysUntilMonday));
    } else {
      // Quarterly
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
    }

    // Create payment record
    const payment = await prisma.publisherPayment.create({
      data: {
        publisherId,
        amount: new Decimal(payoutAmount),
        periodStart,
        periodEnd,
        status: "PENDING",
        paymentMethod: publisher.paymentMethod || "bank",
      },
    });

    // Update publisher paid earnings
    await prisma.publisher.update({
      where: { id: publisherId },
      data: {
        paidEarnings: {
          increment: payoutAmount,
        },
      },
    });

    // In production, this would trigger actual payment processing
    // For now, we just create the payment record

    return {
      success: true,
      paymentId: payment.id,
      message: `Payout request created for $${payoutAmount.toFixed(2)}. Payment will be processed within 5-7 business days.`,
    };
  }

  /**
   * Process advertiser payment (add funds to account)
   */
  async processAdvertiserPayment(
    advertiserId: string,
    amount: number,
    paymentMethod: string,
    transactionId?: string
  ): Promise<{
    success: boolean;
    paymentId?: string;
    newBalance: number;
  }> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser) {
      throw new Error("Advertiser not found");
    }

    // Create payment record
    const payment = await prisma.advertiserPayment.create({
      data: {
        advertiserId,
        amount: new Decimal(amount),
        paymentMethod,
        transactionId,
        status: "PENDING",
      },
    });

    // Update advertiser balance
    const updated = await prisma.advertiser.update({
      where: { id: advertiserId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    // In production, verify payment with payment processor before updating balance
    // For now, we assume payment is successful

    // Mark payment as completed
    await prisma.advertiserPayment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
      },
    });

    return {
      success: true,
      paymentId: payment.id,
      newBalance: updated.balance.toNumber(),
    };
  }

  /**
   * Deduct advertiser spend from balance
   */
  async deductAdvertiserSpend(
    advertiserId: string,
    amount: number
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const advertiser = await tx.advertiser.findUnique({
        where: { id: advertiserId },
      });

      if (!advertiser) {
        throw new Error("Advertiser not found");
      }

      if (advertiser.balance.toNumber() < amount) {
        throw new Error("Insufficient balance");
      }

      await tx.advertiser.update({
        where: { id: advertiserId },
        data: {
          balance: {
            decrement: amount,
          },
          totalSpent: {
            increment: amount,
          },
        },
      });
    });
  }

  /**
   * Get publisher payment history
   */
  async getPublisherPayments(
    publisherId: string,
    limit: number = 20
  ): Promise<any[]> {
    return prisma.publisherPayment.findMany({
      where: { publisherId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get advertiser payment history
   */
  async getAdvertiserPayments(
    advertiserId: string,
    limit: number = 20
  ): Promise<any[]> {
    return prisma.advertiserPayment.findMany({
      where: { advertiserId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Process scheduled publisher payouts
   * This would be called by a cron job
   */
  async processScheduledPayouts(): Promise<{
    processed: number;
    totalAmount: number;
  }> {
    const publishers = await prisma.publisher.findMany({
      where: {
        status: "ACTIVE",
      },
    });

    let processed = 0;
    let totalAmount = 0;

    for (const publisher of publishers) {
      const thresholdCheck = await this.revenueCalculator.checkPaymentThreshold(
        publisher.id
      );

      if (thresholdCheck.reached) {
        const result = await this.requestPublisherPayout(publisher.id);
        if (result.success) {
          processed++;
          totalAmount += thresholdCheck.unpaidEarnings;
        }
      }
    }

    return { processed, totalAmount };
  }
}
