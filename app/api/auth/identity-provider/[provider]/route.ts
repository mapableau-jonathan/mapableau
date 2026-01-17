/**
 * Dynamic Identity Provider Route
 * Handles OAuth initiation for all providers (google, facebook, microsoft, wix)
 */

import { NextRequest, NextResponse } from "next/server";
import { initiateAuth } from "@/lib/services/auth/identity-provider-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/identity-provider/[provider]
 * Initiate OAuth flow for identity provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider as "google" | "facebook" | "microsoft" | "wix";
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

    // Initiate auth
    const result = await initiateAuth(provider, serviceId, callbackUrl);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Auth initiation failed" },
        { status: 500 }
      );
    }

    // Redirect to provider
    if (result.authUrl) {
      return NextResponse.redirect(result.authUrl);
    }

    return NextResponse.json(
      { error: "No auth URL generated" },
      { status: 500 }
    );
  } catch (error) {
    logger.error("Identity provider route error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
