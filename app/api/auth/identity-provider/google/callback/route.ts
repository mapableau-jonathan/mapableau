/**
 * Google OAuth Callback Endpoint
 * Handles Google OAuth callback and generates JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";
import { generateTokenPair } from "@/lib/auth/jwt-service";
import { getUserServices } from "@/lib/auth/sso-service";
import { parseServiceCallback, getServiceCallbackUrl } from "@/lib/auth/service-callbacks";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/identity-provider/google/callback
 * Google OAuth callback handler
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=google_oauth_error", request.url));
    }

    // Parse service callback if specified
    const { serviceName, serviceCallback } = parseServiceCallback(request);
    
    let callbackUrl = "/dashboard";
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString());
        callbackUrl = stateData.callbackUrl || "/dashboard";
      } catch {
        // Invalid state, use default
      }
    }

    // If service is specified, use service callback URL
    if (serviceName && serviceCallback) {
      callbackUrl = serviceCallback;
    } else if (serviceName) {
      callbackUrl = getServiceCallbackUrl(serviceName, "google");
    }

    return new Promise<NextResponse>((resolve) => {
      passport.authenticate("google", { session: false }, async (err: any, user: any) => {
        if (err || !user) {
          logger.error("Google callback error", err);
          return resolve(
            NextResponse.redirect(new URL(`/login?error=google_oauth_error`, request.url))
          );
        }

        try {
          // Get user's service access
          const services = await getUserServices(user.id);

          // Generate JWT token pair
          const tokens = generateTokenPair({
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            serviceAccess: services,
          });

          // Store tokens in cookies
          const response = NextResponse.redirect(new URL(callbackUrl, request.url));

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

          return resolve(response);
        } catch (tokenError) {
          logger.error("Token generation error in Google callback", tokenError);
          return resolve(
            NextResponse.redirect(new URL(`/login?error=token_error`, request.url))
          );
        }
      })(request as any, {} as any, () => {});
    });
  } catch (error) {
    logger.error("Google callback endpoint error", error);
    return NextResponse.redirect(new URL("/login?error=google_oauth_error", request.url));
  }
}
