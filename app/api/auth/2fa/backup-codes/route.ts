/**
 * 2FA Backup Codes API
 * POST /api/auth/2fa/backup-codes - Generate new backup codes
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TOTPService } from "@/lib/services/verification/totp-service";
import { logger } from "@/lib/logger";

const totpService = new TOTPService({
  issuer: process.env.TOTP_ISSUER || "AbilityPay",
});

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
        { error: "2FA must be enabled before generating backup codes" },
        { status: 400 }
      );
    }

    // Generate new backup codes (replaces existing ones)
    const backupCodes = await totpService.generateBackupCodes(
      session.user.id,
      10
    );

    return NextResponse.json({
      success: true,
      backupCodes, // Show only once - user should save these
      message: "New backup codes generated. Please save these codes securely.",
      warning: "Previous backup codes have been invalidated.",
    });
  } catch (error: any) {
    logger.error("Backup codes generation error", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate backup codes" },
      { status: 500 }
    );
  }
}
