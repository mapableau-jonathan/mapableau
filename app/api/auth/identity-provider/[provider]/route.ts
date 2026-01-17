/**
 * OAuth Provider Initiation Endpoint
 * Initiates OAuth flow for a specific provider
 */

import { NextRequest, NextResponse } from "next/server";
import { identityProviderService, type OAuthProvider } from "@/lib/services/auth/identity-provider-service";
import { serviceRegistry, type ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider.toLowerCase() as OAuthProvider;
    
    // Validate provider
    const validProviders: OAuthProvider[] = ["google", "facebook", "microsoft", "wix"];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Get serviceId from query params
    const serviceId = request.nextUrl.searchParams.get("serviceId") as ServiceId;
    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId is required" },
        { status: 400 }
      );
    }

    // Validate service
    if (!serviceRegistry.isServiceEnabled(serviceId)) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 400 }
      );
    }

    // Get optional callback URL
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || undefined;

    // Initiate auth
    const result = await identityProviderService.initiateAuth(provider, serviceId, callbackUrl);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Redirect to provider authorization URL
    return NextResponse.redirect(result.url);
  } catch (error) {
    logger.error("OAuth initiation error", error);
    return NextResponse.json(
      { error: "Failed to initiate authentication" },
      { status: 500 }
    );
  }
}
