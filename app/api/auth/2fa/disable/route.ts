/**
 * 2FA Disable API
 * POST /api/auth/2fa/disable - Disable 2FA (requires verification)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TOTPService } from "@/lib/services/verification/totp-service";
import { z } from "zod";
import { logger } from "@/lib/logger";

const totpService = new TOTPService({
  issuer: process.env.TOTP_ISSUER || "AbilityPay",
});

const disableSchema = z.object({
  verificationToken: z.string().regex(/^\d{6}$/, "Verification token must be 6 digits").optional(),
  backupCode: z.string().regex(/^\d{8}$/, "Backup code must be 8 digits").optional(),
}).refine(
  (data) => data.verificationToken || data.backupCode,
  "Either verificationToken or backupCode must be provided"
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if 2FA is enabled
    const isEnabled = await totpService.isEnabled(session.user.id);
    if (!isEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled for this account" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = disableSchema.parse(body);

    // Verify token or backup code
    let verified = false;
    if (data.verificationToken) {
      const verification = await totpService.verifyToken(
        session.user.id,
        data.verificationToken
      );
      verified = verification.valid;
    } else if (data.backupCode) {
      verified = await totpService.verifyBackupCode(
        session.user.id,
        data.backupCode
      );
    }

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid verification code or backup code" },
        { status: 400 }
      );
    }

    // Disable 2FA
    await totpService.disable2FA(session.user.id);

    return NextResponse.json({
      success: true,
      disabled: true,
      message: "2FA has been disabled successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("2FA disable error", error);
    return NextResponse.json(
      { error: error.message || "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
