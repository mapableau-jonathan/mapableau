/**
 * Biometric Registration API
 * POST /api/auth/biometric/register - Generate registration options
 * POST /api/auth/biometric/register/verify - Verify registration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { WebAuthnService } from "@/lib/services/verification/webauthn-service";
import { z } from "zod";
import { logger } from "@/lib/logger";

const webauthnService = new WebAuthnService({
  rpId: process.env.WEBAUTHN_RP_ID || process.env.NEXT_PUBLIC_DOMAIN || "localhost",
  rpName: process.env.WEBAUTHN_RP_NAME || "AbilityPay Protocol",
  origin: process.env.WEBAUTHN_ORIGIN || process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
});

const verifyRegistrationSchema = z.object({
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      attestationObject: z.string(),
      clientDataJSON: z.string(),
    }),
    type: z.string(),
  }),
  deviceName: z.string().optional(),
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
      // Generate registration options
      const body = await request.json();
      const { deviceName, requireResidentKey, authenticatorAttachment } = body;

      const options = await webauthnService.generateRegistrationOptions({
        userId: session.user.id,
        userName: session.user.email || session.user.id,
        userDisplayName: session.user.name || session.user.email || "User",
        deviceName,
        requireResidentKey,
        authenticatorSelection: {
          authenticatorAttachment,
          userVerification: "preferred",
        },
      });

      return NextResponse.json(options);
    }

    if (action === "verify") {
      // Verify registration
      const body = await request.json();
      const data = verifyRegistrationSchema.parse(body);

      const credential = await webauthnService.verifyRegistration(
        session.user.id,
        data.credential,
        data.deviceName
      );

      return NextResponse.json({
        success: true,
        credential: {
          id: credential.id,
          deviceName: credential.deviceName,
          createdAt: credential.createdAt,
        },
        message: "Biometric authentication registered successfully",
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

    logger.error("Biometric registration error", error);
    return NextResponse.json(
      { error: error.message || "Failed to register biometric" },
      { status: 500 }
    );
  }
}
