/**
 * Biometric Credentials Management API
 * GET /api/auth/biometric/credentials - List credentials
 * DELETE /api/auth/biometric/credentials/[id] - Delete credential
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { WebAuthnService } from "@/lib/services/verification/webauthn-service";
import { logger } from "@/lib/logger";

const webauthnService = new WebAuthnService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await webauthnService.listCredentials(session.user.id);

    return NextResponse.json({
      credentials: credentials.map((cred) => ({
        id: cred.id,
        deviceName: cred.deviceName,
        createdAt: cred.createdAt,
        lastUsedAt: cred.lastUsedAt,
      })),
    });
  } catch (error: any) {
    logger.error("Failed to list credentials", error);
    return NextResponse.json(
      { error: error.message || "Failed to list credentials" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("id");

    if (!credentialId) {
      return NextResponse.json(
        { error: "Credential ID required" },
        { status: 400 }
      );
    }

    await webauthnService.deleteCredential(session.user.id, credentialId);

    return NextResponse.json({
      success: true,
      message: "Credential deleted successfully",
    });
  } catch (error: any) {
    logger.error("Failed to delete credential", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete credential" },
      { status: 500 }
    );
  }
}
