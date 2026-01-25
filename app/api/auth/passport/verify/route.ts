/**
 * Passport Verify Token Endpoint
 * Verifies JWT token and returns user information
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth/jwt-service";
import { createAuthErrorResponse } from "@/lib/auth/error-handler";

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

    const payload = await verifyToken(token);

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
    return createAuthErrorResponse(error, "Token verification failed", 401);
  }
}
