import { NextResponse } from "next/server";
import { UnifiedVerificationService } from "@/lib/services/verification/unified-verification-service";
import { requireAuth } from "@/lib/security/authorization-utils";
import { z } from "zod";

/**
 * GET /api/verification/status/[workerId]
 * Get verification status for a worker
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ workerId: string }> }
) {
  try {
    const user = await requireAuth();
    const { workerId } = await params;

    // Verify user has access to this worker's verification status
    // Admin or the worker's own account can access
    if (user.role !== "NDIA_ADMIN" && user.role !== "PROVIDER") {
      // Check if this worker belongs to the user
      const { prisma } = await import("@/lib/prisma");
      const worker = await prisma.worker.findUnique({
        where: { id: workerId },
      });

      if (!worker || worker.userId !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized access to worker verification status" },
          { status: 403 }
        );
      }
    }

    const status = await UnifiedVerificationService.getWorkerVerificationStatus(workerId);

    return NextResponse.json({
      success: true,
      workerId,
      verifications: status,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Error fetching verification status:", error);
    return NextResponse.json(
      { error: "Failed to fetch verification status" },
      { status: 500 }
    );
  }
}
