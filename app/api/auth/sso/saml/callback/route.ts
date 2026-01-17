/**
 * SAML SSO Callback Endpoint
 * Handles SAML callback and generates JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";
import { generateTokenPair } from "@/lib/auth/jwt-service";
import { getUserServices } from "@/lib/auth/sso-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/sso/saml/callback
 * SAML callback handler (SAML uses POST for assertions)
 */
export async function POST(request: NextRequest) {
  try {
    const relayState = request.nextUrl.searchParams.get("RelayState");

    let callbackUrl = "/dashboard";
    if (relayState) {
      try {
        const stateData = JSON.parse(Buffer.from(relayState, "base64").toString());
        callbackUrl = stateData.callbackUrl || "/dashboard";
      } catch {
        // Invalid state, use default
      }
    }

    return new Promise<NextResponse>((resolve) => {
      passport.authenticate("saml", { session: false }, async (err: any, user: any) => {
        if (err || !user) {
          logger.error("SAML callback error", err);
          return resolve(
            NextResponse.redirect(new URL(`/login?error=saml_error`, request.url))
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
          logger.error("Token generation error in SAML callback", tokenError);
          return resolve(
            NextResponse.redirect(new URL(`/login?error=token_error`, request.url))
          );
        }
      })(request as any, {} as any, () => {});
    });
  } catch (error) {
    logger.error("SAML callback endpoint error", error);
    return NextResponse.redirect(new URL("/login?error=saml_error", request.url));
  }
}
