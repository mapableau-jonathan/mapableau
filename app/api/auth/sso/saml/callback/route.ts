/**
 * SAML SSO Callback Route
 * Handles SAML response from Identity Provider
 */

import { NextRequest, NextResponse } from "next/server";
import { handleSAMLCallback } from "@/lib/services/auth/saml-service";
import { logger } from "@/lib/logger";
import { ServiceId } from "@/lib/services/auth/service-registry";

/**
 * POST /api/auth/sso/saml/callback
 * Handle SAML response (SAML responses are typically sent via HTTP POST)
 */
export async function POST(request: NextRequest) {
  try {
    // SAML responses are typically sent as form data
    const formData = await request.formData();
    const samlResponse = formData.get("SAMLResponse") as string | null;
    const relayState = (formData.get("RelayState") as string | null) || "";

    // Handle missing SAML response
    if (!samlResponse) {
      logger.error("SAML callback missing response", { hasRelayState: !!relayState });
      return NextResponse.redirect(
        new URL("/login?error=missing_saml_response", request.url)
      );
    }

    // Parse relay state to get serviceId
    // The relay state is base64url-encoded JSON containing { serviceId, callbackUrl, nonce, timestamp }
    let stateData: { serviceId?: string; callbackUrl?: string } | null = null;
    try {
      stateData = relayState ? JSON.parse(Buffer.from(relayState, "base64url").toString()) : null;
    } catch (error) {
      logger.error("Failed to parse relay state", { error, relayState });
      stateData = null;
    }
    const serviceId = (stateData?.serviceId || "mapable") as ServiceId;

    // Handle SAML callback
    const result = await handleSAMLCallback(samlResponse, relayState, serviceId);

    if (!result.success) {
      logger.error("SAML callback handling error", { serviceId, error: result.error });
      return NextResponse.redirect(
        new URL(`/login?error=saml_callback_failed&message=${encodeURIComponent(result.error || "Unknown error")}`, request.url)
      );
    }

    // Build callback URL with token
    const callbackUrl = new URL(result.callbackUrl || "/dashboard", request.url);
    if (result.tokens?.accessToken) {
      callbackUrl.searchParams.set("token", result.tokens.accessToken);
      if (stateData?.serviceId) {
        callbackUrl.searchParams.set("serviceId", stateData.serviceId);
      }
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

    logger.info("SAML callback processed successfully", {
      userId: result.userId,
      serviceId,
    });

    return response;
  } catch (error) {
    logger.error("SAML callback route error", error);
    return NextResponse.redirect(
      new URL(`/login?error=internal_error`, request.url)
    );
  }
}

/**
 * GET /api/auth/sso/saml/callback
 * Handle SAML response via GET (redirect binding - less common but supported)
 */
export async function GET(request: NextRequest) {
  try {
    // SAML responses via GET use query parameters
    const samlResponse = request.nextUrl.searchParams.get("SAMLResponse");
    const relayState = request.nextUrl.searchParams.get("RelayState") || "";

    if (!samlResponse) {
      logger.error("SAML callback missing response", { hasRelayState: !!relayState });
      return NextResponse.redirect(
        new URL("/login?error=missing_saml_response", request.url)
      );
    }

    // Parse relay state
    const stateData = relayState ? JSON.parse(Buffer.from(relayState, "base64url").toString()) : null;
    const serviceId = (stateData?.serviceId || "mapable") as ServiceId;

    // Handle SAML callback (same logic as POST)
    const result = await handleSAMLCallback(samlResponse, relayState, serviceId);

    if (!result.success) {
      logger.error("SAML callback handling error", { serviceId, error: result.error });
      return NextResponse.redirect(
        new URL(`/login?error=saml_callback_failed&message=${encodeURIComponent(result.error || "Unknown error")}`, request.url)
      );
    }

    // Build callback URL with token
    const callbackUrl = new URL(result.callbackUrl || "/dashboard", request.url);
    if (result.tokens?.accessToken) {
      callbackUrl.searchParams.set("token", result.tokens.accessToken);
      if (stateData?.serviceId) {
        callbackUrl.searchParams.set("serviceId", stateData.serviceId);
      }
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
    logger.error("SAML callback route error", error);
    return NextResponse.redirect(
      new URL(`/login?error=internal_error`, request.url)
    );
  }
}
