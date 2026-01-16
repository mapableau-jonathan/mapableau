/**
 * Plan Audit Trail API
 * GET /api/abilitypay/audit/plans/[id] - Plan audit trail
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await prisma.nDISPlan.findUnique({
      where: { id: params.id },
      include: {
        categories: {
          include: {
            tokens: true,
          },
        },
        payments: {
          include: {
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
        },
        tokens: {
          orderBy: {
            createdAt: "desc",
          },
        },
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        planManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      plan,
      audit: {
        totalTransactions: plan.payments.length,
        totalTokens: plan.tokens.length,
        totalCategories: plan.categories.length,
        budgetUtilization:
          ((Number(plan.totalBudget) - Number(plan.remainingBudget)) /
            Number(plan.totalBudget)) *
          100,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get plan audit trail" },
      { status: 500 }
    );
  }
}
