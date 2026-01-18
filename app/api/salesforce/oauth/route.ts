/**
 * Salesforce OAuth Initiation Endpoint
 * Initiates Salesforce OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SalesforceOAuthService } from "@/lib/services/salesforce/salesforce-oauth-service";
import { getSalesforceConfig } from "@/lib/config/salesforce";
import { logger } from "@/lib/logger";
import crypto from "crypto";

/**
 * GET /api/salesforce/oauth
 * Initiate Salesforce OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getSalesforceConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "Salesforce integration is disabled" },
        { status: 400 }
      );
    }

    // Generate state token
    const state = crypto.randomBytes(16).toString("hex");
    
    // Store state in session or use cookie for validation
    // For simplicity, we'll include userId in state
    const stateWithUserId = Buffer.from(
      JSON.stringify({ userId: session.user.id, state })
    ).toString("base64url");

    const oauthService = new SalesforceOAuthService();
    const authUrl = oauthService.generateAuthUrl(stateWithUserId);

    // Redirect to Salesforce OAuth
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    logger.error("Salesforce OAuth initiation error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth initiation failed" },
      { status: 500 }
    );
  }
}
