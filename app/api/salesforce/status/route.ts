/**
 * Salesforce Integration Status Endpoint
 * GET /api/salesforce/status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSalesforceConfig } from "@/lib/config/salesforce";
import { SalesforceOAuthService } from "@/lib/services/salesforce/salesforce-oauth-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/salesforce/status
 * Get Salesforce integration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getSalesforceConfig();

    if (!config.enabled) {
      return NextResponse.json({
        enabled: false,
        message: "Salesforce integration is disabled",
      });
    }

    // Check if user has connected Salesforce account
    const oauthService = new SalesforceOAuthService();
    const tokens = await oauthService.getStoredTokens(session.user.id);

    return NextResponse.json({
      enabled: true,
      connected: !!tokens,
      config: {
        apiVersion: config.apiVersion,
        loginUrl: config.loginUrl,
        instanceUrl: tokens?.instanceUrl || config.instanceUrl,
        syncSettings: config.syncSettings,
      },
      tokens: tokens
        ? {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          }
        : null,
    });
  } catch (error: any) {
    logger.error("Error getting Salesforce status", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get status" },
      { status: 500 }
    );
  }
}
