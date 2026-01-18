/**
 * JWK Key Management Endpoint
 * Get or delete specific key
 */

import { NextRequest, NextResponse } from "next/server";
import { keyStore } from "@/lib/services/auth/jwk-service";
import { authenticate } from "@/lib/auth/middleware";
import { logger } from "@/lib/logger";

/**
 * GET /api/jose/keys/[keyId]
 * Get public key information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Authenticate
    const authResult = authenticate(request, { required: true });
    if (authResult.error) {
      return authResult.error;
    }

    const keyId = params.keyId;
    const publicKey = keyStore.getPublicKey(keyId);

    if (!publicKey) {
      return NextResponse.json(
        { error: "Key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      keyId,
      publicKey,
      // Never return private key
    });
  } catch (error) {
    logger.error("JWK get error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jose/keys/[keyId]
 * Delete key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Authenticate
    const authResult = authenticate(request, { required: true });
    if (authResult.error) {
      return authResult.error;
    }

    const keyId = params.keyId;
    keyStore.deleteKey(keyId);

    logger.info("Key deleted", { keyId });

    return NextResponse.json({
      success: true,
      message: "Key deleted successfully",
    });
  } catch (error) {
    logger.error("JWK delete error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
