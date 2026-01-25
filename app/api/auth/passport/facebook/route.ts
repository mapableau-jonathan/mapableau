/**
 * Facebook OAuth via Passport
 * Redirects to Facebook OAuth and bridges to NextAuth
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";

export async function GET(request: NextRequest) {
  try {
    const callbackURL = new URL("/api/auth/passport/facebook/callback", request.url).toString();

    return new Promise((resolve) => {
      passport.authenticate("facebook", {
        scope: ["email", "public_profile"],
        callbackURL,
      })(request as any, {} as any, (err: Error | null) => {
        if (err) {
          resolve(
            NextResponse.redirect(
              new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url)
            )
          );
        }
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
