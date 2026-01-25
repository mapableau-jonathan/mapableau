/**
 * Google OAuth via Passport
 * Redirects to Google OAuth and bridges to NextAuth
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";
import { findOrCreateUserFromPassport } from "@/lib/auth/nextauth-passport-bridge";
import { signIn } from "next-auth/react";

export async function GET(request: NextRequest) {
  try {
    const callbackURL = new URL("/api/auth/passport/google/callback", request.url).toString();

    // Use Passport to initiate OAuth flow
    return new Promise((resolve) => {
      passport.authenticate("google", {
        scope: ["profile", "email"],
        callbackURL,
      })(request as any, {} as any, (err: Error | null, user: any) => {
        if (err) {
          resolve(
            NextResponse.redirect(
              new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url)
            )
          );
          return;
        }

        if (!user) {
          resolve(
            NextResponse.redirect(
              new URL("/login?error=Authentication failed", request.url)
            )
          );
          return;
        }

        // Bridge to NextAuth session
        resolve(
          NextResponse.redirect(
            new URL(
              `/api/auth/signin?callbackUrl=${encodeURIComponent("/dashboard")}&provider=google`,
              request.url
            )
          )
        );
      });
    });
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message || "Authentication failed")}`,
        request.url
      )
    );
  }
}
