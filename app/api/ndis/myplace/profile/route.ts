/**
 * NDIS myplace Profile Endpoint
 * GET /api/ndis/myplace/profile
 * PATCH /api/ndis/myplace/profile
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NDISMyplaceApiService } from "@/lib/services/ndis/myplace-api-service";
import { getNDISMyplaceConfig } from "@/lib/config/ndis-myplace";
import { logger } from "@/lib/logger";

/**
 * GET /api/ndis/myplace/profile
 * Get participant profile
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
    const profile = await apiService.getProfile(session.user.id);

    return NextResponse.json({ profile });
  } catch (error: any) {
    logger.error("Error fetching profile from myplace", { error });
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ndis/myplace/profile
 * Update participant profile
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const apiService = new NDISMyplaceApiService();
    const profile = await apiService.updateProfile(session.user.id, body);

    return NextResponse.json({ profile });
  } catch (error: any) {
    logger.error("Error updating profile in myplace", { error });
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
