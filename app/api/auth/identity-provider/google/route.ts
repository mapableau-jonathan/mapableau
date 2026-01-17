/**
 * Google OAuth SSO Endpoint
 * Initiates Google OAuth SSO flow
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/identity-provider/google
 * Initiate Google OAuth SSO
 */
export async function GET(request: NextRequest) {
  try {
    const callbackUrl = request.nextUrl.searchParams.get("callback") || "/dashboard";

    return new Promise<NextResponse>((resolve) => {
      passport.authenticate("google", {
        session: false,
        state: Buffer.from(JSON.stringify({ callbackUrl })).toString("base64"),
      })(request as any, {} as any, (err: any) => {
        if (err) {
          logger.error("Google SSO initiation error", err);
          return resolve(
            NextResponse.json({ error: "SSO initiation failed" }, { status: 500 })
          );
        }
        // Passport will handle the redirect
        return resolve(NextResponse.json({ error: "Redirect required" }, { status: 500 }));
      });
    });
  } catch (error) {
    logger.error("Google SSO endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO failed" },
      { status: 500 }
    );
  }
}
