/**
 * Plan Management API
 * POST /api/abilitypay/plans - Create NDIS plan
 * GET /api/abilitypay/plans/[id] - Get plan details
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PlanService } from "@/lib/services/abilitypay";
import { z } from "zod";

const planService = new PlanService();

const createPlanSchema = z.object({
  participantId: z.string(),
  planNumber: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  totalBudget: z.number().positive(),
  planManagerId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  categories: z
    .array(
      z.object({
        categoryCode: z.string(),
        allocatedAmount: z.number().positive(),
        rules: z.record(z.any()).optional(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createPlanSchema.parse(body);

    const plan = await planService.createPlan(data);

    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create plan" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("id");
    const participantId = searchParams.get("participantId");

    if (planId) {
      const plan = await planService.getPlan(planId);
      return NextResponse.json(plan);
    }

    if (participantId) {
      const plan = await planService.getPlanByParticipant(participantId);
      if (!plan) {
        return NextResponse.json(
          { error: "Plan not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(plan);
    }

    return NextResponse.json(
      { error: "Either id or participantId must be provided" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get plan" },
      { status: 500 }
    );
  }
}
