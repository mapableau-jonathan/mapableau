/**
 * 2FA Verification API
 * POST /api/auth/2fa/verify - Verify TOTP token
 * POST /api/auth/2fa/verify/backup - Verify backup code
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TOTPService } from "@/lib/services/verification/totp-service";
import { z } from "zod";
import { logger } from "@/lib/logger";

const totpService = new TOTPService({
  issuer: process.env.TOTP_ISSUER || "AbilityPay Protocol",
});

const verifyTokenSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Token must be 6 digits"),
});

const verifyBackupCodeSchema = z.object({
  code: z.string().regex(/^\d{8}$/, "Backup code must be 8 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "token";

    if (action === "token") {
      // Verify TOTP token
      const body = await request.json();
      const data = verifyTokenSchema.parse(body);

      const verification = await totpService.verifyToken(
        session.user.id,
        data.token
      );

      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.error || "Invalid verification code" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
        timeRemaining: totpService.getTimeRemaining(),
      });
    }

    if (action === "backup") {
      // Verify backup code
      const body = await request.json();
      const data = verifyBackupCodeSchema.parse(body);

      const verified = await totpService.verifyBackupCode(
        session.user.id,
        data.code
      );

      if (!verified) {
        return NextResponse.json(
          { error: "Invalid or already used backup code" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
        message: "Backup code verified successfully",
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("2FA verification error", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify 2FA" },
      { status: 500 }
    );
  }
}
