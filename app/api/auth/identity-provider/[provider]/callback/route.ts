/**
 * OAuth Provider Callback Endpoint
 * Handles OAuth callback and redirects to service with token
 */

import { NextRequest, NextResponse } from "next/server";
import { identityProviderService, type OAuthProvider } from "@/lib/services/auth/identity-provider-service";
import { serviceRegistry } from "@/lib/services/auth/service-registry";
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
      return NextResponse.redirect(
        new URL("/login?error=invalid_provider", request.url)
      );
    }

    // Get code and state from query params
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/login?error=missing_params", request.url)
      );
    }

    // Handle callback
    const result = await identityProviderService.handleCallback(provider, code, state);

    if (result.error || !result.user) {
      logger.error("OAuth callback error", { error: result.error, provider });
      return NextResponse.redirect(
        new URL(`/login?error=${result.error || "auth_failed"}`, request.url)
      );
    }

    // Use callback URL from result (extracted from state)
    const finalCallbackUrl = result.callbackUrl || serviceRegistry.getServiceCallbackUrl(result.serviceId!) || "/auth/callback";
    
    // Create callback URL with tokens
    const callbackUrl = new URL(finalCallbackUrl, request.nextUrl.origin);
    callbackUrl.searchParams.set("token", result.token);
    callbackUrl.searchParams.set("refreshToken", result.refreshToken);
    callbackUrl.searchParams.set("expiresIn", result.expiresIn.toString());
    callbackUrl.searchParams.set("serviceId", result.serviceId!);

    // Redirect to service callback
    return NextResponse.redirect(callbackUrl.toString());
  } catch (error) {
    logger.error("OAuth callback error", error);
    return NextResponse.redirect(
      new URL("/login?error=callback_error", request.url)
    );
  }
}
