/**
 * MediaWiki OAuth Callback Endpoint
 * Handles MediaWiki OAuth callback
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeMediaWikiCode,
  getMediaWikiUser,
  syncUserToMediaWiki,
} from "@/lib/services/auth/mediawiki-integration-enhanced";
import { issueToken } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { linkAccount } from "@/lib/services/auth/account-linker";
import { normalizeProfile } from "@/lib/services/auth/profile-normalizer";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/mediawiki/callback
 * Handle MediaWiki OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const oauthToken = request.nextUrl.searchParams.get("oauth_token");
    const oauthVerifier = request.nextUrl.searchParams.get("oauth_verifier");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      logger.error("MediaWiki OAuth error", { error });
      return NextResponse.redirect(
        new URL("/login?error=mediawiki_oauth_error", request.url)
      );
    }

    if (!oauthToken || !oauthVerifier || !state) {
      return NextResponse.redirect(
        new URL("/login?error=missing_params", request.url)
      );
    }

    // Parse state
    let stateData: { serviceId?: ServiceId; callbackUrl?: string; nonce?: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/login?error=invalid_state", request.url)
      );
    }

    const serviceId = stateData.serviceId;
    if (!serviceId) {
      return NextResponse.redirect(
        new URL("/login?error=missing_service", request.url)
      );
    }

    // Exchange code for token
    const tokenResult = await exchangeMediaWikiCode(oauthToken, oauthVerifier);
    if (!tokenResult.success || !tokenResult.accessToken || !tokenResult.accessSecret) {
      logger.error("MediaWiki token exchange failed", tokenResult.error);
      return NextResponse.redirect(
        new URL("/login?error=token_exchange_failed", request.url)
      );
    }

    // Get MediaWiki user
    const mediaWikiUser = await getMediaWikiUser(
      tokenResult.accessToken,
      tokenResult.accessSecret
    );
    if (!mediaWikiUser) {
      return NextResponse.redirect(
        new URL("/login?error=user_fetch_failed", request.url)
      );
    }

    // Normalize profile
    const normalizedProfile = normalizeProfile("mediawiki", {
      id: mediaWikiUser.id.toString(),
      email: mediaWikiUser.email,
      name: mediaWikiUser.realname || mediaWikiUser.name,
      accessToken: tokenResult.accessToken,
      accessSecret: tokenResult.accessSecret,
    });

    // Link account
    const service = serviceRegistry.get(serviceId);
    const linkResult = await linkAccount(
      normalizedProfile,
      service?.requiresEmailVerification || false
    );

    if (!linkResult.success || !linkResult.userId) {
      return NextResponse.redirect(
        new URL("/login?error=account_linking_failed", request.url)
      );
    }

    // Sync to MediaWiki if needed
    await syncUserToMediaWiki(linkResult.userId);

    // Issue service token
    const tokenIssueResult = await issueToken({
      userId: linkResult.userId,
      serviceId,
      scopes: service?.allowedScopes || ["read:profile", "read:email"],
    });

    if (!tokenIssueResult.success) {
      return NextResponse.redirect(
        new URL("/login?error=token_issue_failed", request.url)
      );
    }

    // Build callback URL
    const callbackUrl = new URL(
      stateData.callbackUrl || "/dashboard",
      request.url
    );
    callbackUrl.searchParams.set("token", tokenIssueResult.accessToken!);
    callbackUrl.searchParams.set("serviceId", serviceId);

    // Set cookies
    const response = NextResponse.redirect(callbackUrl);
    response.cookies.set("access_token", tokenIssueResult.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenIssueResult.expiresIn || 3600,
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error("MediaWiki callback error", error);
    return NextResponse.redirect(
      new URL("/login?error=internal_error", request.url)
    );
  }
}
