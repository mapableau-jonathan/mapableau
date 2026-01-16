import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { VerificationOrchestrator } from "@/lib/services/verification/orchestrator";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  req: Request,
  { params }: { params: { id: string; type: string } }
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

    // Check authorization
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    const isOwnWorker = worker.userId === session.user.id;
    if (!isOwnWorker) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Find verification record
    const verification = await prisma.verificationRecord.findUnique({
      where: {
        workerId_verificationType: {
          workerId,
          verificationType: params.type as any,
        },
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    // Check status with provider
    const orchestrator = new VerificationOrchestrator();
    const status = await orchestrator.checkVerificationStatus(verification.id);

    // Get updated record
    const updated = await prisma.verificationRecord.findUnique({
      where: { id: verification.id },
    });

    return NextResponse.json({
      id: updated?.id,
      type: updated?.verificationType,
      status: updated?.status,
      providerRequestId: updated?.providerRequestId,
      expiresAt: updated?.expiresAt,
      verifiedAt: updated?.verifiedAt,
      errorMessage: updated?.errorMessage,
      metadata: updated?.metadata,
    });
  } catch (error) {
    console.error("Error checking verification status:", error);
    return NextResponse.json(
      { error: "Failed to check verification status" },
      { status: 500 }
    );
  }
}
