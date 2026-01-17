/**
 * Microsoft Entra ID (Azure AD) SSO Endpoint
 * Initiates Microsoft OAuth SSO flow
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "@/lib/auth/passport-config";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/identity-provider/microsoft
 * Initiate Microsoft Entra ID SSO
 */
export async function GET(request: NextRequest) {
  try {
    const callbackUrl = request.nextUrl.searchParams.get("callback") || "/dashboard";

    return new Promise<NextResponse>((resolve) => {
      passport.authenticate("azure-ad", {
        session: false,
        state: Buffer.from(JSON.stringify({ callbackUrl })).toString("base64"),
      })(request as any, {} as any, (err: any) => {
        if (err) {
          logger.error("Microsoft SSO initiation error", err);
          return resolve(
            NextResponse.json({ error: "SSO initiation failed" }, { status: 500 })
          );
        }
        return resolve(NextResponse.json({ error: "Redirect required" }, { status: 500 }));
      });
    });
  } catch (error) {
    logger.error("Microsoft SSO endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO failed" },
      { status: 500 }
    );
  }
}
