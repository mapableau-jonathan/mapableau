import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { VerificationOrchestrator } from "@/lib/services/verification/orchestrator";
import type { VerificationType } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const verificationTypeSchema = z.enum([
  "IDENTITY",
  "VEVO",
  "WWCC",
  "NDIS",
  "FIRST_AID",
  "ABN",
  "TFN",
  "NDIS_WORKER_CHECK",
]);

export async function POST(
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
    const verificationType = verificationTypeSchema.parse(
      params.type
    ) as VerificationType;

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

    const body = await req.json();
    const { data, documents } = body;

    const orchestrator = new VerificationOrchestrator();
    const result = await orchestrator.initiateVerification(
      workerId,
      verificationType,
      data,
      documents
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error initiating verification:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid verification type", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initiate verification" },
      { status: 500 }
    );
  }
}
