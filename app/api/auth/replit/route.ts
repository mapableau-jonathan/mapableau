/**
 * Replit OAuth Initiation Endpoint
 * Initiates Replit OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import { getReplitAuthUrl } from "@/lib/services/auth/replit-integration";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";
import crypto from "crypto";

/**
 * GET /api/auth/replit
 * Initiate Replit OAuth
 */
export async function GET(request: NextRequest) {
  try {
    const serviceId = request.nextUrl.searchParams.get("serviceId") as ServiceId | null;
    const callbackUrl = request.nextUrl.searchParams.get("callback") || undefined;

    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId query parameter is required" },
        { status: 400 }
      );
    }

    // Validate service
    if (!serviceRegistry.isEnabled(serviceId)) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 400 }
      );
    }

    // Generate secure state token
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = Buffer.from(
      JSON.stringify({
        serviceId,
        callbackUrl: callbackUrl || serviceRegistry.get(serviceId)?.callbackUrl,
        nonce,
        timestamp: Date.now(),
      })
    ).toString("base64url");

    // Get Replit auth URL
    const authUrl = getReplitAuthUrl(state);

    if (!authUrl) {
      return NextResponse.json(
        { error: "Replit OAuth not configured" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error("Replit OAuth initiation error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth initiation failed" },
      { status: 500 }
    );
  }
}
