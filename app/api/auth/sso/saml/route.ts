/**
 * SAML SSO Endpoint
 * Initiates SAML SSO flow
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/sso/saml
 * Initiate SAML SSO
 */
export async function GET(request: NextRequest) {
  try {
    const callbackUrl = request.nextUrl.searchParams.get("callback") || "/dashboard";

    return new Promise<NextResponse>((resolve) => {
      passport.authenticate("saml", {
        session: false,
        additionalParams: {
          RelayState: Buffer.from(JSON.stringify({ callbackUrl })).toString("base64"),
        },
      })(request as any, {} as any, (err: any) => {
        if (err) {
          logger.error("SAML SSO initiation error", err);
          return resolve(
            NextResponse.json({ error: "SSO initiation failed" }, { status: 500 })
          );
        }
        // SAML will redirect to IdP
        return resolve(NextResponse.json({ error: "Redirect required" }, { status: 500 }));
      });
    });
  } catch (error) {
    logger.error("SAML SSO endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO failed" },
      { status: 500 }
    );
  }
}
