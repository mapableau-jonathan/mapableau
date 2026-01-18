/**
 * Microsoft Entra ID (Azure AD) SSO Endpoint
 * Initiates Microsoft OAuth SSO flow
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/identity-provider/microsoft
 * Initiate Microsoft Entra ID SSO
 */
export async function GET(request: NextRequest) {
  try {
    const serviceId = (request.nextUrl.searchParams.get("serviceId") || "mapable") as any;
    const callbackUrl = request.nextUrl.searchParams.get("callback") || "/dashboard";

    // Use identity provider service instead of direct Passport
    const { initiateAuth } = await import("@/lib/services/auth/identity-provider-service");

    const result = await initiateAuth("microsoft", serviceId, callbackUrl);

    if (!result.success || !result.authUrl) {
      return NextResponse.json(
        { error: result.error || "SSO initiation failed" },
        { status: 500 }
      );
    }

    // Redirect to OAuth provider
    return NextResponse.redirect(result.authUrl);
  } catch (error) {
    logger.error("Microsoft SSO endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO failed" },
      { status: 500 }
    );
  }
}
