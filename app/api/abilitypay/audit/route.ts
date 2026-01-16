/**
 * Audit & Reporting API
 * GET /api/abilitypay/audit/transactions - Query transaction log
 * GET /api/abilitypay/audit/compliance - Compliance reports
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin role for audit access
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "transactions";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const planId = searchParams.get("planId");

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    switch (type) {
      case "transactions": {
        const where: any = {};
        if (dateFilter.gte || dateFilter.lte) {
          where.createdAt = dateFilter;
        }
        if (planId) {
          where.planId = planId;
        }

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
            voucher: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1000, // Limit to prevent huge responses
        });

        return NextResponse.json({
          type: "transactions",
          count: transactions.length,
          transactions,
        });
      }

      case "compliance": {
        // Get all plans and their compliance status
        const plans = await prisma.nDISPlan.findMany({
          where: planId ? { id: planId } : {},
          include: {
            categories: true,
            payments: {
              where: dateFilter.gte || dateFilter.lte
                ? { createdAt: dateFilter }
                : {},
            },
          },
        });

        const complianceReport = plans.map((plan) => {
          const totalSpent = plan.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0
          );
          const budgetUtilization = (totalSpent / Number(plan.totalBudget)) * 100;

          return {
            planId: plan.id,
            planNumber: plan.planNumber,
            status: plan.status,
            totalBudget: Number(plan.totalBudget),
            totalSpent,
            remainingBudget: Number(plan.remainingBudget),
            budgetUtilization: budgetUtilization.toFixed(2),
            transactionCount: plan.payments.length,
            categories: plan.categories.map((cat) => ({
              categoryCode: cat.categoryCode,
              allocated: Number(cat.allocatedAmount),
              spent: Number(cat.spentAmount),
              remaining: Number(cat.remainingAmount),
            })),
          };
        });

        return NextResponse.json({
          type: "compliance",
          reportDate: new Date().toISOString(),
          plans: complianceReport,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown audit type: ${type}` },
          { status: 400 }
        );
    }
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
    logger.error("Error fetching audit data", error);
    return NextResponse.json(
      { error: "Failed to get audit data" },
      { status: 500 }
    );
  }
}
