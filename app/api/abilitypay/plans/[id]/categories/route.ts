/**
 * Plan Categories API
 * GET /api/abilitypay/plans/[id]/categories - List budget categories
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PlanService } from "@/lib/services/abilitypay";

const planService = new PlanService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await planService.getPlanCategories(params.id);
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get categories" },
      { status: 500 }
    );
  }
}
