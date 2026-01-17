/**
 * Service Providers Route
 * List available authentication providers for a service
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/service/[serviceId]/providers
 * Get available providers for service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serviceId: string } }
) {
  try {
    const serviceId = params.serviceId as ServiceId;
    const callbackUrl = request.nextUrl.searchParams.get("callback") || undefined;

    // Validate service
    const service = serviceRegistry.get(serviceId);
    if (!service || !service.enabled) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 404 }
      );
    }

    const providers = [];

    // Google
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push({
        id: "google",
        name: "Google",
        type: "oauth2",
        authUrl: `/api/auth/identity-provider/google?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
        icon: "https://www.google.com/favicon.ico",
      });
    }

    // Facebook
    if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
      providers.push({
        id: "facebook",
        name: "Facebook",
        type: "oauth2",
        authUrl: `/api/auth/identity-provider/facebook?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
        icon: "https://www.facebook.com/favicon.ico",
      });
    }

    // Microsoft
    if (
      process.env.AZURE_AD_CLIENT_ID &&
      process.env.AZURE_AD_CLIENT_SECRET &&
      process.env.AZURE_AD_TENANT_ID
    ) {
      providers.push({
        id: "microsoft",
        name: "Microsoft",
        type: "oauth2",
        authUrl: `/api/auth/identity-provider/microsoft?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
        icon: "https://www.microsoft.com/favicon.ico",
      });
    }

    // Wix
    if (
      process.env.WIX_CLIENT_ID &&
      process.env.WIX_CLIENT_SECRET &&
      process.env.WIX_APP_ID
    ) {
      providers.push({
        id: "wix",
        name: "Wix",
        type: "oauth2",
        authUrl: `/api/auth/identity-provider/wix?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
        icon: "https://www.wix.com/favicon.ico",
      });
    }

    // Replit
    if (process.env.REPLIT_CLIENT_ID && process.env.REPLIT_CLIENT_SECRET) {
      providers.push({
        id: "replit",
        name: "Replit",
        type: "oauth2",
        authUrl: `/api/auth/replit?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
        icon: "https://replit.com/favicon.ico",
      });
    }

    // MediaWiki
    if (
      process.env.MEDIAWIKI_CONSUMER_KEY &&
      process.env.MEDIAWIKI_CONSUMER_SECRET
    ) {
      providers.push({
        id: "mediawiki",
        name: "MediaWiki",
        type: "oauth1",
        authUrl: `/api/auth/mediawiki?serviceId=${serviceId}${
          callbackUrl ? `&callback=${encodeURIComponent(callbackUrl)}` : ""
        }`,
        icon: "https://www.mediawiki.org/favicon.ico",
      });
    }

    // Local (email/password)
    providers.push({
      id: "local",
      name: "Email & Password",
      type: "credentials",
      authUrl: `/api/auth/passport/login`,
      icon: null,
    });

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
      },
      providers,
    });
  } catch (error) {
    logger.error("Service providers error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
