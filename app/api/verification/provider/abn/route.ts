import { NextResponse } from "next/server";
import { z } from "zod";
import { ABNVerificationService } from "@/lib/services/verification/abn-verification-service";
import { requireAuth } from "@/lib/security/authorization-utils";

const verifyProviderABNSchema = z.object({
  abn: z.string().min(1),
});

/**
 * POST /api/verification/provider/abn
 * Verify ABN for a provider registration
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    // Only providers can verify their own ABN
    if (user.role !== "PROVIDER" && user.role !== "NDIA_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Only providers can verify ABN." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { abn } = verifyProviderABNSchema.parse(body);

    const result = await ABNVerificationService.verifyProviderABN(user.id, abn);

    return NextResponse.json({
      success: result.valid,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Error verifying provider ABN:", error);
    return NextResponse.json(
      { error: "Failed to verify provider ABN", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
