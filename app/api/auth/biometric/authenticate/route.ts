/**
 * Biometric Authentication API
 * POST /api/auth/biometric/authenticate - Generate authentication options
 * POST /api/auth/biometric/authenticate/verify - Verify authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { WebAuthnService } from "@/lib/services/verification/webauthn-service";
import { z } from "zod";
import { logger } from "@/lib/logger";

const webauthnService = new WebAuthnService({
  rpId: process.env.WEBAUTHN_RP_ID || process.env.NEXT_PUBLIC_DOMAIN || "localhost",
  rpName: process.env.WEBAUTHN_RP_NAME || "AbilityPay",
  origin: process.env.WEBAUTHN_ORIGIN || process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
});

const verifyAuthenticationSchema = z.object({
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.string(),
  }),
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
      // Generate authentication options
      const options = await webauthnService.generateAuthenticationOptions({
        userId: session.user.id,
      });

      return NextResponse.json(options);
    }

    if (action === "verify") {
      // Verify authentication
      const body = await request.json();
      const data = verifyAuthenticationSchema.parse(body);

      const result = await webauthnService.verifyAuthentication(
        session.user.id,
        data.credential
      );

      if (!result.verified) {
        return NextResponse.json(
          { error: "Biometric authentication failed" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
        credential: {
          id: result.credential.id,
          deviceName: result.credential.deviceName,
        },
        message: "Biometric authentication successful",
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

    logger.error("Biometric authentication error", error);
    return NextResponse.json(
      { error: error.message || "Failed to authenticate with biometric" },
      { status: 500 }
    );
  }
}
