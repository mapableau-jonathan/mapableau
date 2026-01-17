/**
 * Passport Logout Endpoint
 * Invalidates tokens and logs out user
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/passport/logout
 * Logout user
 */
export async function POST(request: NextRequest) {
  try {
    // Clear cookies
    const response = NextResponse.json({ success: true, message: "Logged out successfully" });

    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");

    // In a production system, you might want to:
    // 1. Add tokens to a blacklist/revocation list
    // 2. Invalidate refresh tokens in database
    // 3. Log the logout event

    return response;
  } catch (error) {
    logger.error("Logout endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logout failed" },
      { status: 500 }
    );
  }
}
