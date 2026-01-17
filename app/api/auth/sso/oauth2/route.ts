/**
 * OAuth2 SSO Endpoint
 * Initiates OAuth2 SSO flow
 */

import { NextRequest, NextResponse } from "next/server";
import { initiateOAuth2 } from "@/lib/auth/passport-adapter";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/sso/oauth2
 * Initiate OAuth2 SSO
 */
export async function GET(request: NextRequest) {
  try {
    const callbackUrl = request.nextUrl.searchParams.get("callback") || "/dashboard";

    const result = initiateOAuth2(callbackUrl);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Redirect to OAuth provider
    return NextResponse.redirect(result.url);
  } catch (error) {
    logger.error("OAuth2 SSO endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO failed" },
      { status: 500 }
    );
  }
}
