/**
 * Passport Verify Token Endpoint
 * Verifies JWT token and returns user information
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth/jwt-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/passport/verify
 * Verify JWT token
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const payload = verifyToken(token);

    return NextResponse.json({
      success: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        serviceAccess: payload.serviceAccess || [],
      },
    });
  } catch (error) {
    logger.error("Verify token endpoint error", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Token verification failed",
      },
      { status: 401 }
    );
  }
}
