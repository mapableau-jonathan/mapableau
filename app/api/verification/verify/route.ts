import { NextResponse } from "next/server";
import { z } from "zod";
import { UnifiedVerificationService } from "@/lib/services/verification/unified-verification-service";
import { requireAuth } from "@/lib/security/authorization-utils";

const verifyRequestSchema = z.object({
  type: z.enum(["ABN", "TFN", "NDIS_WORKER_CHECK"]),
  workerId: z.string().optional(),
  userId: z.string().optional(),
  // ABN-specific
  abn: z.string().optional(),
  // TFN-specific
  tfn: z.string().optional(),
  dateOfBirth: z.string().optional(),
  fullName: z.string().optional(),
  // NDIS Worker Check specific
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
}).refine((data) => {
  // Validate that required fields are provided based on type
  if (data.type === "ABN" && !data.abn) return false;
  if (data.type === "TFN" && !data.tfn) return false;
  if (data.type === "NDIS_WORKER_CHECK" && !data.workerId) return false;
  return true;
}, {
  message: "Required fields missing for verification type",
});

/**
 * POST /api/verification/verify
 * Verify ABN, TFN, or NDIS Worker Check
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const validated = verifyRequestSchema.parse(body);

    // Add authenticated user's ID if not provided
    if (!validated.userId) {
      validated.userId = user.id;
    }

    const result = await UnifiedVerificationService.verify(validated);

    return NextResponse.json({
      success: true,
      ...result,
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

    console.error("Error verifying:", error);
    return NextResponse.json(
      { error: "Failed to verify", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
