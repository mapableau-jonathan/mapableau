/**
 * NDIS myplace Plans Endpoint
 * GET /api/ndis/myplace/plans
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NDISMyplaceApiService } from "@/lib/services/ndis/myplace-api-service";
import { getNDISMyplaceConfig } from "@/lib/config/ndis-myplace";
import { logger } from "@/lib/logger";

/**
 * GET /api/ndis/myplace/plans
 * Get participant's NDIS plans
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getNDISMyplaceConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "NDIS myplace integration is disabled" },
        { status: 400 }
      );
    }

    const apiService = new NDISMyplaceApiService();
    
    // Check if getting current plan or all plans
    const currentOnly = request.nextUrl.searchParams.get("current") === "true";
    
    if (currentOnly) {
      const plan = await apiService.getPlan(session.user.id);
      return NextResponse.json({ plan });
    } else {
      const plans = await apiService.getPlans(session.user.id);
      return NextResponse.json({ plans });
    }
  } catch (error: any) {
    logger.error("Error fetching NDIS plans from myplace", { error });
    return NextResponse.json(
      { error: error.message || "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
