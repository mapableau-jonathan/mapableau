/**
 * 2FA Status API
 * GET /api/auth/2fa/status - Get 2FA status for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TOTPService } from "@/lib/services/verification/totp-service";
import { prisma } from "@/lib/prisma";

const totpService = new TOTPService({
  issuer: process.env.TOTP_ISSUER || "AbilityPay Protocol",
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isEnabled = await totpService.isEnabled(session.user.id);

    // Check if backup codes are available
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorBackupCodes: true },
    });

    const hasBackupCodes = !!user?.twoFactorBackupCodes;
    const backupCodesCount = user?.twoFactorBackupCodes
      ? user.twoFactorBackupCodes.split(",").length
      : 0;

    return NextResponse.json({
      enabled: isEnabled,
      hasBackupCodes,
      backupCodesCount,
      timeRemaining: totpService.getTimeRemaining(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}
