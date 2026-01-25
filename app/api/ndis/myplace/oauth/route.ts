/**
 * NDIS myplace OAuth Initiation Endpoint
 * Initiates NDIS myplace OAuth flow for participants
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NDISMyplaceAuthService } from "@/lib/services/ndis/myplace-auth-service";
import { getNDISMyplaceConfig } from "@/lib/config/ndis-myplace";
import { logger } from "@/lib/logger";
import crypto from "crypto";

/**
 * GET /api/ndis/myplace/oauth
 * Initiate NDIS myplace OAuth flow
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

    // Generate state token
    const state = crypto.randomBytes(16).toString("hex");

    // Include userId in state for callback
    const stateWithUserId = Buffer.from(
      JSON.stringify({ userId: session.user.id, state })
    ).toString("base64url");

    const authService = new NDISMyplaceAuthService();
    const authUrl = authService.generateAuthUrl(stateWithUserId);

    // Redirect to NDIS myplace OAuth
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    logger.error("NDIS myplace OAuth initiation error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth initiation failed" },
      { status: 500 }
    );
  }
}
