/**
 * NDIS myplace Integration Status Endpoint
 * GET /api/ndis/myplace/status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getNDISMyplaceConfig } from "@/lib/config/ndis-myplace";
import { NDISMyplaceAuthService } from "@/lib/services/ndis/myplace-auth-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/ndis/myplace/status
 * Get NDIS myplace integration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getNDISMyplaceConfig();

    if (!config.enabled) {
      return NextResponse.json({
        enabled: false,
        message: "NDIS myplace integration is disabled",
      });
    }

    // Check if user has connected NDIS myplace account
    const authService = new NDISMyplaceAuthService();
    const tokens = await authService.getStoredTokens(session.user.id);

    return NextResponse.json({
      enabled: true,
      connected: !!tokens,
      config: {
        apiUrl: config.apiUrl,
        scope: config.scope,
      },
      tokens: tokens
        ? {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          }
        : null,
    });
  } catch (error: any) {
    logger.error("Error getting NDIS myplace status", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get status" },
      { status: 500 }
    );
  }
}
