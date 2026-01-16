/**
 * 2FA Setup API
 * POST /api/auth/2fa/setup - Generate TOTP secret and QR code
 * POST /api/auth/2fa/setup/verify - Verify and enable 2FA
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

const verifySetupSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Token must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "generate";

    if (action === "generate") {
      // Generate new TOTP secret
      const secret = await totpService.generateSecret(session.user.id, {
        label: session.user.email || session.user.id,
        issuer: process.env.TOTP_ISSUER || "AbilityPay Protocol",
      });

      return NextResponse.json({
        secret: secret.secret,
        qrCodeUrl: secret.qrCodeUrl,
        manualEntryKey: secret.manualEntryKey,
        timeRemaining: totpService.getTimeRemaining(),
      });
    }

    if (action === "verify") {
      // Verify token and enable 2FA
      const body = await request.json();
      const data = verifySetupSchema.parse(body);

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

      // Enable 2FA
      await totpService.enable2FA(session.user.id);

      // Generate backup codes
      const backupCodes = await totpService.generateBackupCodes(
        session.user.id,
        10
      );

      return NextResponse.json({
        success: true,
        enabled: true,
        backupCodes, // Show only once - user should save these
        message: "2FA enabled successfully. Please save your backup codes.",
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

    logger.error("2FA setup error", error);
    return NextResponse.json(
      { error: error.message || "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}
