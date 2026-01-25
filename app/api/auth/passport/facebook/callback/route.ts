/**
 * Facebook OAuth Callback via Passport
 * Handles Facebook OAuth callback and creates NextAuth session
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";
import { findOrCreateUserFromPassport } from "@/lib/auth/nextauth-passport-bridge";
import { createAuthErrorRedirect } from "@/lib/auth/error-handler";

export async function GET(request: NextRequest) {
  return new Promise((resolve) => {
    passport.authenticate("facebook", async (err: Error | null, profile: any) => {
      if (err || !profile?.id) {
        resolve(createAuthErrorRedirect(request.url, err || "Failed to get user profile"));
        return;
      }

      try {
        await findOrCreateUserFromPassport("facebook", profile.id, {
          email: profile.emails?.[0]?.value || profile.email,
          name: profile.displayName || profile.name?.givenName,
          image: profile.photos?.[0]?.value,
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
        });

        const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/dashboard";
        resolve(
          NextResponse.redirect(
            new URL(
              `/api/auth/callback/facebook?callbackUrl=${encodeURIComponent(callbackUrl)}`,
              request.url
            )
          )
        );
      } catch (error) {
        resolve(createAuthErrorRedirect(request.url, error));
      }
    })(request as any, {} as any);
  });
}
