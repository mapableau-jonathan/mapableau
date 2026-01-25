import { NextResponse } from "next/server";
import { z } from "zod";
import { UnifiedVerificationService } from "@/lib/services/verification/unified-verification-service";
import { requireAuth } from "@/lib/security/authorization-utils";

const batchVerifySchema = z.object({
  workerId: z.string(),
  abn: z.string().optional(),
  tfn: z.string().optional(),
  dateOfBirth: z.string().optional(),
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * POST /api/verification/batch
 * Batch verify multiple verification types for a worker
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const validated = batchVerifySchema.parse(body);

    // Verify user has access to this worker
    if (user.role !== "NDIA_ADMIN" && user.role !== "PROVIDER") {
      const { prisma } = await import("@/lib/prisma");
      const worker = await prisma.worker.findUnique({
        where: { id: validated.workerId },
      });

      if (!worker || worker.userId !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized access to worker" },
          { status: 403 }
        );
      }
    }

    const results = await UnifiedVerificationService.batchVerifyWorker(
      validated.workerId,
      {
        abn: validated.abn,
        tfn: validated.tfn,
        dateOfBirth: validated.dateOfBirth,
        fullName: validated.fullName,
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
      }
    );

    return NextResponse.json({
      success: true,
      workerId: validated.workerId,
      results,
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

    console.error("Error batch verifying:", error);
    return NextResponse.json(
      { error: "Failed to batch verify", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
