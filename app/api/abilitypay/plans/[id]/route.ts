/**
 * Plan Details API
 * GET /api/abilitypay/plans/[id] - Get plan details
 * PUT /api/abilitypay/plans/[id]/budget - Update budget allocation
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PlanService } from "@/lib/services/abilitypay";
import { z } from "zod";

const planService = new PlanService();

const updateBudgetSchema = z.object({
  categoryId: z.string().optional(),
  categoryCode: z.string().optional(),
  amount: z.number().positive(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await planService.getPlan(params.id);
    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get plan" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateBudgetSchema.parse(body);

    const category = await planService.updateBudget(params.id, data);
    return NextResponse.json(category);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update budget" },
      { status: 500 }
    );
  }
}
