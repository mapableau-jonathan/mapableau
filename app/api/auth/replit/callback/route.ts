/**
 * Replit OAuth Callback Endpoint
 * Handles Replit OAuth callback
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeReplitCode,
  getReplitUser,
  syncReplitUser,
} from "@/lib/services/auth/replit-integration";
import { issueToken } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/replit/callback
 * Handle Replit OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      logger.error("Replit OAuth error", { error });
      return NextResponse.redirect(
        new URL("/login?error=replit_oauth_error", request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/login?error=missing_params", request.url)
      );
    }

    // Parse state
    let stateData: { serviceId?: ServiceId; callbackUrl?: string; nonce?: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/login?error=invalid_state", request.url)
      );
    }

    const serviceId = stateData.serviceId;
    if (!serviceId) {
      return NextResponse.redirect(
        new URL("/login?error=missing_service", request.url)
      );
    }

    // Exchange code for token
    const tokenResult = await exchangeReplitCode(code);
    if (!tokenResult.success || !tokenResult.accessToken) {
      logger.error("Replit token exchange failed", tokenResult.error);
      return NextResponse.redirect(
        new URL("/login?error=token_exchange_failed", request.url)
      );
    }

    // Get Replit user
    const replitUser = await getReplitUser(tokenResult.accessToken);
    if (!replitUser) {
      return NextResponse.redirect(
        new URL("/login?error=user_fetch_failed", request.url)
      );
    }

    // Sync user
    const syncResult = await syncReplitUser(
      replitUser,
      tokenResult.accessToken,
      tokenResult.refreshToken
    );

    if (!syncResult.success || !syncResult.userId) {
      return NextResponse.redirect(
        new URL("/login?error=user_sync_failed", request.url)
      );
    }

    // Issue service token
    const service = serviceRegistry.get(serviceId);
    const tokenIssueResult = await issueToken({
      userId: syncResult.userId,
      serviceId,
      scopes: service?.allowedScopes || ["read:profile", "read:email"],
    });

    if (!tokenIssueResult.success) {
      return NextResponse.redirect(
        new URL("/login?error=token_issue_failed", request.url)
      );
    }

    // Build callback URL
    const callbackUrl = new URL(
      stateData.callbackUrl || "/dashboard",
      request.url
    );
    callbackUrl.searchParams.set("token", tokenIssueResult.accessToken!);
    callbackUrl.searchParams.set("serviceId", serviceId);

    // Set cookies
    const response = NextResponse.redirect(callbackUrl);
    response.cookies.set("access_token", tokenIssueResult.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenIssueResult.expiresIn || 3600,
      path: "/",
    });

    if (tokenIssueResult.refreshToken) {
      response.cookies.set("refresh_token", tokenIssueResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    logger.error("Replit callback error", error);
    return NextResponse.redirect(
      new URL("/login?error=internal_error", request.url)
    );
  }
}
