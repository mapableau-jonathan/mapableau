/**
 * Fraud Detection API
 * GET /api/abilitypay/audit/fraud-detection - Fraud indicators and suspicious activity
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin role for fraud detection access
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const participantId = searchParams.get("participantId");
    const providerId = searchParams.get("providerId");

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const where: any = {};
    if (dateFilter.gte || dateFilter.lte) {
      where.createdAt = dateFilter;
    }
    if (participantId) {
      where.participantId = participantId;
    }
    if (providerId) {
      where.providerId = providerId;
    }

    // Get all transactions for analysis
    const transactions = await prisma.paymentTransaction.findMany({
      where,
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            planNumber: true,
            status: true,
          },
        },
        voucher: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fraud detection indicators
    const fraudIndicators: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      description: string;
      transactionIds: string[];
      metadata: any;
    }> = [];

    // 1. Check for rapid successive transactions (potential fraud)
    const rapidTransactions = detectRapidTransactions(transactions);
    if (rapidTransactions.length > 0) {
      fraudIndicators.push({
        type: "RAPID_SUCCESSIVE_TRANSACTIONS",
        severity: "medium",
        description: `Detected ${rapidTransactions.length} rapid successive transactions`,
        transactionIds: rapidTransactions.map((t) => t.id),
        metadata: {
          count: rapidTransactions.length,
          timeWindow: "5 minutes",
        },
      });
    }

    // 2. Check for unusually large transactions
    const largeTransactions = detectLargeTransactions(transactions);
    if (largeTransactions.length > 0) {
      fraudIndicators.push({
        type: "UNUSUALLY_LARGE_TRANSACTIONS",
        severity: "high",
        description: `Detected ${largeTransactions.length} unusually large transactions`,
        transactionIds: largeTransactions.map((t) => t.id),
        metadata: {
          count: largeTransactions.length,
          threshold: "$10,000",
        },
      });
    }

    // 3. Check for transactions outside normal hours (9 AM - 6 PM)
    const offHoursTransactions = detectOffHoursTransactions(transactions);
    if (offHoursTransactions.length > 0) {
      fraudIndicators.push({
        type: "OFF_HOURS_TRANSACTIONS",
        severity: "low",
        description: `Detected ${offHoursTransactions.length} transactions outside business hours`,
        transactionIds: offHoursTransactions.map((t) => t.id),
        metadata: {
          count: offHoursTransactions.length,
          hours: "Outside 9 AM - 6 PM",
        },
      });
    }

    // 4. Check for multiple failed transactions
    const failedTransactions = transactions.filter((t) => t.status === "FAILED");
    if (failedTransactions.length > 5) {
      fraudIndicators.push({
        type: "MULTIPLE_FAILED_TRANSACTIONS",
        severity: "medium",
        description: `Detected ${failedTransactions.length} failed transactions`,
        transactionIds: failedTransactions.map((t) => t.id),
        metadata: {
          count: failedTransactions.length,
        },
      });
    }

    // 5. Check for transactions exceeding budget
    const overBudgetTransactions = await detectOverBudgetTransactions(transactions);
    if (overBudgetTransactions.length > 0) {
      fraudIndicators.push({
        type: "OVER_BUDGET_TRANSACTIONS",
        severity: "high",
        description: `Detected ${overBudgetTransactions.length} transactions exceeding budget`,
        transactionIds: overBudgetTransactions.map((t) => t.id),
        metadata: {
          count: overBudgetTransactions.length,
        },
      });
    }

    // 6. Check for provider with multiple participants (potential collusion)
    const providerParticipantMap = new Map<string, Set<string>>();
    transactions.forEach((t) => {
      if (!providerParticipantMap.has(t.providerId)) {
        providerParticipantMap.set(t.providerId, new Set());
      }
      providerParticipantMap.get(t.providerId)!.add(t.participantId);
    });

    const suspiciousProviders: string[] = [];
    providerParticipantMap.forEach((participants, providerId) => {
      if (participants.size > 10) {
        suspiciousProviders.push(providerId);
      }
    });

    if (suspiciousProviders.length > 0) {
      const suspiciousTransactions = transactions.filter((t) =>
        suspiciousProviders.includes(t.providerId)
      );
      fraudIndicators.push({
        type: "SUSPICIOUS_PROVIDER_PATTERN",
        severity: "medium",
        description: `Detected providers with unusually high number of participants`,
        transactionIds: suspiciousTransactions.map((t) => t.id),
        metadata: {
          providerCount: suspiciousProviders.length,
          participantThreshold: 10,
        },
      });
    }

    return NextResponse.json({
      type: "fraud-detection",
      reportDate: new Date().toISOString(),
      totalTransactions: transactions.length,
      indicators: fraudIndicators,
      summary: {
        totalIndicators: fraudIndicators.length,
        highSeverity: fraudIndicators.filter((i) => i.severity === "high").length,
        mediumSeverity: fraudIndicators.filter((i) => i.severity === "medium").length,
        lowSeverity: fraudIndicators.filter((i) => i.severity === "low").length,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    logger.error("Error fetching fraud detection data", error);
    return NextResponse.json(
      { error: "Failed to get fraud detection data" },
      { status: 500 }
    );
  }
}

/**
 * Detect rapid successive transactions (within 5 minutes)
 */
function detectRapidTransactions(transactions: any[]) {
  const rapid: any[] = [];
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (
      prev.participantId === curr.participantId &&
      new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime() <
        5 * 60 * 1000 // 5 minutes
    ) {
      if (!rapid.includes(prev)) rapid.push(prev);
      if (!rapid.includes(curr)) rapid.push(curr);
    }
  }

  return rapid;
}

/**
 * Detect unusually large transactions (> $10,000)
 */
function detectLargeTransactions(transactions: any[]) {
  const LARGE_TRANSACTION_THRESHOLD = 10000;
  return transactions.filter(
    (t) => Number(t.amount) > LARGE_TRANSACTION_THRESHOLD
  );
}

/**
 * Detect transactions outside business hours (9 AM - 6 PM)
 */
function detectOffHoursTransactions(transactions: any[]) {
  return transactions.filter((t) => {
    const date = new Date(t.createdAt);
    const hour = date.getHours();
    return hour < 9 || hour >= 18;
  });
}

/**
 * Detect transactions that exceed budget
 */
async function detectOverBudgetTransactions(transactions: any[]) {
  const overBudget: any[] = [];

  // Group transactions by plan
  const planTransactions = new Map<string, any[]>();
  transactions.forEach((t) => {
    if (!planTransactions.has(t.planId)) {
      planTransactions.set(t.planId, []);
    }
    planTransactions.get(t.planId)!.push(t);
  });

  // Check each plan
  for (const [planId, planTxns] of planTransactions.entries()) {
    const plan = await prisma.nDISPlan.findUnique({
      where: { id: planId },
      select: {
        totalBudget: true,
        remainingBudget: true,
      },
    });

    if (plan) {
      const totalSpent = planTxns.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );
      const budgetUsed = Number(plan.totalBudget) - Number(plan.remainingBudget);

      // If transactions exceed what should be spent
      if (totalSpent > Number(plan.totalBudget)) {
        overBudget.push(...planTxns);
      }
    }
  }

  return overBudget;
}
