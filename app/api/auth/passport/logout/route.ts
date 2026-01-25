/**
 * Passport Logout Endpoint
 * Invalidates tokens and logs out user
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthErrorResponse } from "@/lib/auth/error-handler";

/**
 * POST /api/auth/passport/logout
 * Logout user
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");

    return response;
  } catch (error) {
    return createAuthErrorResponse(error, "Logout failed", 500);
  }
}
