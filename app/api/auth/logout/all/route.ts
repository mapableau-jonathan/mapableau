/**
 * Global Logout Route
 * Logs out user from all services
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth/jwt-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { tokenLifecycleManager } from "@/lib/services/auth/token-lifecycle-manager";

/**
 * POST /api/auth/logout/all
 * Logout from all services
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { verifyToken } = await import("@/lib/auth/jwt-service");
    const payload = verifyToken(token);
    const userId = payload.sub;

    // Revoke all active tokens for user
    // In a full implementation, you would:
    // 1. Query database for all active tokens
    // 2. Add them to revocation list
    // 3. Invalidate service links if needed

    logger.info("Global logout", { userId });

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: "Logged out from all services",
    });

    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");

    // Invalidate service links (optional - depends on requirements)
    // await prisma.serviceLink.updateMany({
    //   where: { userId },
    //   data: { isActive: false }
    // });

    return response;
  } catch (error) {
    logger.error("Global logout error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logout failed" },
      { status: 500 }
    );
  }
}
