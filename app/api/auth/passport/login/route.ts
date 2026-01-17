/**
 * Passport Login Endpoint
 * Authenticates users using Passport Local strategy and returns JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateLocal } from "@/lib/auth/passport-adapter";
import { generateTokenPair } from "@/lib/auth/jwt-service";
import { getUserServices } from "@/lib/auth/sso-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/passport/login
 * Login with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Authenticate using local strategy
    const authResult = await authenticateLocal(email, password);

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Authentication failed" },
        { status: 401 }
      );
    }

    try {
      // Get user's service access
      const services = await getUserServices(authResult.user.id);

      // Generate JWT token pair
      const tokens = generateTokenPair({
        sub: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        role: authResult.user.role,
        serviceAccess: services,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          name: authResult.user.name,
          role: authResult.user.role,
          image: authResult.user.image,
        },
        tokens,
      });
    } catch (tokenError) {
      logger.error("Token generation error", tokenError);
      return NextResponse.json({ error: "Failed to generate tokens" }, { status: 500 });
    }
  } catch (error) {
    logger.error("Login endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    );
  }
}
