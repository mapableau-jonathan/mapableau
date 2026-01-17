/**
 * Passport Refresh Token Endpoint
 * Refreshes access token using refresh token
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, generateTokenPair } from "@/lib/auth/jwt-service";
import { getUserServices } from "@/lib/auth/sso-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/passport/refresh
 * Refresh access token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token is required" }, { status: 400 });
    }

    // Verify refresh token
    const { sub: userId } = verifyRefreshToken(refreshToken);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's service access
    const services = await getUserServices(user.id);

    // Generate new token pair
    const tokens = generateTokenPair({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      serviceAccess: services,
    });

    return NextResponse.json({
      success: true,
      tokens,
    });
  } catch (error) {
    logger.error("Refresh token endpoint error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh token",
      },
      { status: 401 }
    );
  }
}
