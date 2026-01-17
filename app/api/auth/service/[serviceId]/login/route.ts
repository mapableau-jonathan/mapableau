/**
 * Direct Service Authentication Route
 * Allows services to initiate authentication directly
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/service/[serviceId]/login
 * Direct login route for specific service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serviceId: string } }
) {
  try {
    const serviceId = params.serviceId as ServiceId;
    const provider = request.nextUrl.searchParams.get("provider") as
      | "google"
      | "facebook"
      | "microsoft"
      | "wix"
      | null;
    const callbackUrl = request.nextUrl.searchParams.get("callback") || undefined;

    // Validate service
    const service = serviceRegistry.get(serviceId);
    if (!service || !service.enabled) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 404 }
      );
    }

    // If provider specified, redirect to provider OAuth
    if (provider) {
      const providerUrl = `/api/auth/identity-provider/${provider}?serviceId=${serviceId}${
        callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
      }`;
      return NextResponse.redirect(new URL(providerUrl, request.url));
    }

    // Otherwise, return available providers
    const providers = [];
    if (process.env.GOOGLE_CLIENT_ID) {
      providers.push({
        id: "google",
        name: "Google",
        url: `/api/auth/identity-provider/google?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
      });
    }
    if (process.env.FACEBOOK_CLIENT_ID) {
      providers.push({
        id: "facebook",
        name: "Facebook",
        url: `/api/auth/identity-provider/facebook?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
      });
    }
    if (process.env.AZURE_AD_CLIENT_ID) {
      providers.push({
        id: "microsoft",
        name: "Microsoft",
        url: `/api/auth/identity-provider/microsoft?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
      });
    }
    if (process.env.WIX_CLIENT_ID) {
      providers.push({
        id: "wix",
        name: "Wix",
        url: `/api/auth/identity-provider/wix?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
      });
    }

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        domain: service.domain,
      },
      providers,
      loginUrl: `/api/auth/service/${serviceId}/login`,
    });
  } catch (error) {
    logger.error("Direct service login error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
