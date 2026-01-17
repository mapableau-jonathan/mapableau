/**
 * Identity Provider List Endpoint
 * Returns available identity providers for SSO
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";

/**
 * GET /api/auth/identity-provider/list
 * Get list of available identity providers
 */
export async function GET(request: NextRequest) {
  try {
    const env = getEnv();
    const providers: Array<{
      id: string;
      name: string;
      enabled: boolean;
      authUrl: string;
    }> = [];

    // Google
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      const baseUrl = env.AD_ID_DOMAIN || request.nextUrl.origin;
      providers.push({
        id: "google",
        name: "Google",
        enabled: true,
        authUrl: `${baseUrl}/api/auth/identity-provider/google`,
      });
    }

    // Facebook
    if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
      const baseUrl = env.AD_ID_DOMAIN || request.nextUrl.origin;
      providers.push({
        id: "facebook",
        name: "Facebook",
        enabled: true,
        authUrl: `${baseUrl}/api/auth/identity-provider/facebook`,
      });
    }

    // Microsoft Entra ID (Azure AD)
    if (env.AZURE_AD_CLIENT_ID && env.AZURE_AD_CLIENT_SECRET && env.AZURE_AD_TENANT_ID) {
      const baseUrl = env.AD_ID_DOMAIN || request.nextUrl.origin;
      providers.push({
        id: "microsoft",
        name: "Microsoft",
        enabled: true,
        authUrl: `${baseUrl}/api/auth/identity-provider/microsoft`,
      });
    }

    // Generic OAuth2
    if (process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_CLIENT_SECRET) {
      const baseUrl = env.AD_ID_DOMAIN || request.nextUrl.origin;
      providers.push({
        id: "oauth2",
        name: "OAuth2",
        enabled: true,
        authUrl: `${baseUrl}/api/auth/sso/oauth2`,
      });
    }

    // SAML
    if (process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER) {
      const baseUrl = env.AD_ID_DOMAIN || request.nextUrl.origin;
      providers.push({
        id: "saml",
        name: "SAML",
        enabled: true,
        authUrl: `${baseUrl}/api/auth/sso/saml`,
      });
    }

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list providers",
      },
      { status: 500 }
    );
  }
}
