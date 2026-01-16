import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VerificationOrchestrator } from "@/lib/services/verification/orchestrator";
import { requireAuth, requireAdmin, hasResourceAccess } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workerId = params.id;

    // Check if user has access to this worker
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: {
        user: true,
      },
    });

    if (!worker) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    // SECURITY: Check authorization - worker can view own, admin can view all
    const user = await requireAuth();
    const isOwnWorker = worker.userId === user.id;
    
    let isAdmin = false;
    try {
      await requireAdmin();
      isAdmin = true;
    } catch {
      // Not admin, continue with ownership check
    }

    if (!isOwnWorker && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access other workers' verifications" },
        { status: 403 }
      );
    }

    const orchestrator = new VerificationOrchestrator();
    const verifications = await orchestrator.getWorkerVerifications(workerId);

    return NextResponse.json({
      workerId,
      verifications: verifications.map((v) => ({
        id: v.id,
        type: v.verificationType,
        status: v.status,
        provider: v.provider,
        providerRequestId: v.providerRequestId,
        expiresAt: v.expiresAt,
        verifiedAt: v.verifiedAt,
        errorMessage: v.errorMessage,
        metadata: v.metadata,
        documents: v.documents.map((d) => ({
          id: d.id,
          type: d.documentType,
          fileUrl: d.fileUrl,
          uploadedAt: d.uploadedAt,
        })),
        alerts: v.alerts.map((a) => ({
          id: a.id,
          type: a.alertType,
          message: a.message,
          sentAt: a.sentAt,
        })),
      })),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    logger.error("Error fetching verifications", error);
    return NextResponse.json(
      { error: "Failed to fetch verifications" },
      { status: 500 }
    );
  }
}
