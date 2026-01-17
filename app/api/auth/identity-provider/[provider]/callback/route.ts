/**
 * Dynamic Identity Provider Callback Route
 * Handles OAuth callbacks for all providers
 */

import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@/lib/services/auth/identity-provider-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/identity-provider/[provider]/callback
 * Handle OAuth callback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider as "google" | "facebook" | "microsoft" | "wix";
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      logger.error("OAuth provider error", { provider, error });
      return NextResponse.redirect(
        new URL(`/login?error=oauth_error&provider=${provider}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/login?error=missing_params&provider=${provider}`, request.url)
      );
    }

    // Handle callback
    const result = await handleCallback(provider, code, state);

    if (!result.success) {
      logger.error("Callback handling error", { provider, error: result.error });
      return NextResponse.redirect(
        new URL(`/login?error=callback_failed&provider=${provider}`, request.url)
      );
    }

    // Build callback URL with token
    const callbackUrl = new URL(result.callbackUrl || "/dashboard", request.url);
    if (result.tokens?.accessToken) {
      callbackUrl.searchParams.set("token", result.tokens.accessToken);
      callbackUrl.searchParams.set("serviceId", state.split(".")[0] || ""); // Extract serviceId from state
    }

    // Set cookies for token storage
    const response = NextResponse.redirect(callbackUrl);

    if (result.tokens?.accessToken) {
      response.cookies.set("access_token", result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: result.tokens.expiresIn || 3600,
        path: "/",
      });
    }

    if (result.tokens?.refreshToken) {
      response.cookies.set("refresh_token", result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });
    }

    return response;
  } catch (error) {
    logger.error("Callback route error", error);
    return NextResponse.redirect(
      new URL(`/login?error=internal_error`, request.url)
    );
  }
}
