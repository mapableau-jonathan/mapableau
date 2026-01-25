/**
 * NDIS myplace OAuth Callback Endpoint
 * Handles NDIS myplace OAuth callback
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NDISMyplaceAuthService } from "@/lib/services/ndis/myplace-auth-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/ndis/myplace/oauth/callback
 * Handle NDIS myplace OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      logger.error("NDIS myplace OAuth error", { error });
      return NextResponse.redirect(
        new URL("/login?error=ndis_myplace_oauth_error", request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing authorization code or state" },
        { status: 400 }
      );
    }

    // Parse state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
      userId = stateData.userId;
    } catch {
      // Fallback: get from session
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
    }

    const authService = new NDISMyplaceAuthService();
    const tokenData = await authService.exchangeCodeForToken(code);

    // Store tokens
    await authService.storeTokens(userId, tokenData);

    logger.info("NDIS myplace OAuth completed successfully", { userId });

    // Redirect to dashboard or return success
    return NextResponse.redirect(
      new URL("/dashboard?ndis_myplace=connected", request.url)
    );
  } catch (error: any) {
    logger.error("NDIS myplace OAuth callback error", { error });
    return NextResponse.redirect(
      new URL("/login?error=ndis_myplace_oauth_failed", request.url)
    );
  }
}
