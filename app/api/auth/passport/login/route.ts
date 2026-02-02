/**
 * Passport Login Endpoint
 * Authenticates users using Passport Local strategy and bridges to NextAuth
 */

// Force Node.js runtime (required for argon2 native module via passport-adapter)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateLocal } from "@/lib/auth/passport-adapter";
import { createAuthErrorResponse } from "@/lib/auth/error-handler";

/**
 * POST /api/auth/passport/login
 * Login with email and password - bridges to NextAuth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, callbackUrl } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const authResult = await authenticateLocal(email, password);

    if (authResult.error || !authResult.user) {
      return createAuthErrorResponse(
        authResult.error || "Invalid email or password",
        "Invalid email or password",
        401
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        role: authResult.user.role,
        image: authResult.user.image,
      },
      nextAuthSignIn: true,
      callbackUrl: callbackUrl || "/dashboard",
    });
  } catch (error) {
    return createAuthErrorResponse(error, "Login failed", 500);
  }
}
