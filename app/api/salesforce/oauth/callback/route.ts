/**
 * Salesforce OAuth Callback Endpoint
 * Handles Salesforce OAuth callback
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SalesforceOAuthService } from "@/lib/services/salesforce/salesforce-oauth-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/salesforce/oauth/callback
 * Handle Salesforce OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      logger.error("Salesforce OAuth error", { error });
      return NextResponse.redirect(
        new URL("/login?error=salesforce_oauth_error", request.url)
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

    const oauthService = new SalesforceOAuthService();
    const tokenData = await oauthService.exchangeCodeForToken(code);

    // Store tokens
    await oauthService.storeTokens(userId, tokenData);

    logger.info("Salesforce OAuth completed successfully", { userId });

    // Redirect to dashboard or return success
    return NextResponse.redirect(
      new URL("/dashboard?salesforce=connected", request.url)
    );
  } catch (error: any) {
    logger.error("Salesforce OAuth callback error", { error });
    return NextResponse.redirect(
      new URL("/login?error=salesforce_oauth_failed", request.url)
    );
  }
}
