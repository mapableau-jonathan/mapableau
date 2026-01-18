/**
 * SAML SSO Endpoint
 * Initiates SAML SSO flow
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import crypto from "crypto";

/**
 * GET /api/auth/sso/saml
 * Initiate SAML SSO
 */
export async function GET(request: NextRequest) {
  try {
    const serviceId = request.nextUrl.searchParams.get("serviceId") || "mapable";
    const callbackUrl = request.nextUrl.searchParams.get("callback") || "/dashboard";

    // Use identity provider service for SAML
    // Note: SAML uses different flow, but we'll use the service for consistency

    // For SAML, we need to use the SAML-specific initiation
    // This is a simplified version - in production, use proper SAML library
    const { getMediaWikiAuthUrl } = await import("@/lib/services/auth/mediawiki-integration-enhanced");
    const state = Buffer.from(
      JSON.stringify({
        serviceId,
        callbackUrl,
        nonce: crypto.randomBytes(16).toString("hex"),
        timestamp: Date.now(),
      })
    ).toString("base64url");

    const authUrl = getMediaWikiAuthUrl(state);

    if (!authUrl) {
      return NextResponse.json(
        { error: "SAML OAuth not configured" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error("SAML SSO endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO failed" },
      { status: 500 }
    );
  }
}
