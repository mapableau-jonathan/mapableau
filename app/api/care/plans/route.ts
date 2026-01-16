/**
 * Care Plan Management API
 * Requires NDIS verification for workers
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  requireNDISVerification,
  checkWorkerNDISVerificationByUserId,
} from "@/lib/access-control/ndis-guards";
import { z } from "zod";

const createCarePlanSchema = z.object({
  participantId: z.string(),
  workerId: z.string().optional(),
  planName: z.string().min(1),
  goals: z.array(
    z.object({
      description: z.string(),
      targetDate: z.string().transform((str) => new Date(str)),
      status: z.enum(["ACTIVE", "ACHIEVED", "ON_HOLD"]).optional(),
    })
  ),
  services: z.record(z.any()).optional(),
  startDate: z.string().transform((str) => new Date(str)),
  reviewDate: z.string().transform((str) => new Date(str)),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createCarePlanSchema.parse(body);

    // If workerId is provided, verify they have NDIS verification
    if (data.workerId) {
      try {
        await requireNDISVerification(
          data.workerId,
          "Worker must have valid NDIS verification to create care plans"
        );
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    } else {
      // If no workerId, check if current user is a verified worker
      const ndisCheck = await checkWorkerNDISVerificationByUserId(
        session.user.id
      );
      if (!ndisCheck.hasNDISVerification) {
        return NextResponse.json(
          {
            error:
              "NDIS Worker Screening verification is required to create care plans",
          },
          { status: 403 }
        );
      }

      // Get worker ID from user
      const worker = await prisma.worker.findUnique({
        where: { userId: session.user.id },
      });
      if (worker) {
        data.workerId = worker.id;
      }
    }

    // Verify participant exists
    const participant = await prisma.user.findUnique({
      where: { id: data.participantId },
    });
    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Create care plan
    const carePlan = await prisma.carePlan.create({
      data: {
        participantId: data.participantId,
        workerId: data.workerId,
        planName: data.planName,
        goals: data.goals as any,
        services: data.services || {},
        startDate: data.startDate,
        reviewDate: data.reviewDate,
        status: "Active",
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        worker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(carePlan, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create care plan" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");
    const workerId = searchParams.get("workerId");

    const where: any = {};

    if (participantId) {
      where.participantId = participantId;
    }

    if (workerId) {
      where.workerId = workerId;
    }

    // If user is a worker, only show their own care plans
    const worker = await prisma.worker.findUnique({
      where: { userId: session.user.id },
    });
    if (worker && !participantId) {
      where.workerId = worker.id;
    }

    const carePlans = await prisma.carePlan.findMany({
      where,
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        worker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        notes: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5, // Latest 5 notes
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ carePlans });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get care plans" },
      { status: 500 }
    );
  }
}
