/**
 * Passport Refresh Token Endpoint
 * Refreshes access token using refresh token
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, generateTokenPair } from "@/lib/auth/jwt-service";
import { getUserServices } from "@/lib/auth/sso-service";
import { prisma } from "@/lib/prisma";
import { createAuthErrorResponse } from "@/lib/auth/error-handler";

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

    const { sub: userId } = await verifyRefreshToken(refreshToken);

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

    const services = await getUserServices(user.id);
    const tokens = await generateTokenPair({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      serviceAccess: services,
    });

    return NextResponse.json({ success: true, tokens });
  } catch (error) {
    return createAuthErrorResponse(error, "Failed to refresh token", 401);
  }
}
