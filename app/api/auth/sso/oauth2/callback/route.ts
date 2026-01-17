/**
 * OAuth2 SSO Callback Endpoint
 * Handles OAuth2 callback and generates JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { handleOAuth2Callback } from "@/lib/auth/passport-adapter";
import { generateTokenPair } from "@/lib/auth/jwt-service";
import { getUserServices } from "@/lib/auth/sso-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/sso/oauth2/callback
 * OAuth2 callback handler
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=oauth_error", request.url));
    }

    let callbackUrl = "/dashboard";
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString());
        callbackUrl = stateData.callbackUrl || "/dashboard";
      } catch {
        // Invalid state, use default
      }
    }

    // Handle OAuth2 callback
    const authResult = await handleOAuth2Callback(code, state);

    if (authResult.error || !authResult.user) {
      logger.error("OAuth2 callback error", authResult.error);
      return NextResponse.redirect(new URL(`/login?error=oauth_error`, request.url));
    }

    try {
      // Get user's service access
      const services = await getUserServices(authResult.user.id);

      // Generate JWT token pair
      const tokens = generateTokenPair({
        sub: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        role: authResult.user.role,
        serviceAccess: services,
      });

      // Store tokens in cookies
      const response = NextResponse.redirect(new URL(callbackUrl, request.url));

      // Set HTTP-only cookies for tokens
      response.cookies.set("access_token", tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: tokens.expiresIn,
        path: "/",
      });

      response.cookies.set("refresh_token", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      return response;
    } catch (tokenError) {
      logger.error("Token generation error in OAuth2 callback", tokenError);
      return NextResponse.redirect(new URL(`/login?error=token_error`, request.url));
    }
  } catch (error) {
    logger.error("OAuth2 callback endpoint error", error);
    return NextResponse.redirect(new URL("/login?error=oauth_error", request.url));
  }
}
