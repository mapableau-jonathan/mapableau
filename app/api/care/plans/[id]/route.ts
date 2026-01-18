/**
 * Individual Care Plan API
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

const updateCarePlanSchema = z.object({
  planName: z.string().min(1).optional(),
  goals: z.array(z.any()).optional(),
  services: z.record(z.any()).optional(),
  reviewDate: z.string().transform((str) => new Date(str)).optional(),
  status: z.enum(["Active", "Completed", "On Hold"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const carePlan = await prisma.carePlan.findUnique({
      where: { id: params.id },
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
        },
      },
    });

    if (!carePlan) {
      return NextResponse.json(
        { error: "Care plan not found" },
        { status: 404 }
      );
    }

    // Check access: participant can view their own, worker can view if they have NDIS verification
    if (carePlan.participantId === session.user.id) {
      return NextResponse.json(carePlan);
    }

    if (carePlan.workerId) {
      const worker = await prisma.worker.findUnique({
        where: { id: carePlan.workerId },
      });
      if (worker?.userId === session.user.id) {
        const ndisCheck = await checkWorkerNDISVerificationByUserId(
          session.user.id
        );
        if (!ndisCheck.hasNDISVerification) {
          return NextResponse.json(
            {
              error:
                "NDIS Worker Screening verification is required to view care plans",
            },
            { status: 403 }
          );
        }
        return NextResponse.json(carePlan);
      }
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get care plan" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateCarePlanSchema.parse(body);

    // Get existing care plan
    const existingPlan = await prisma.carePlan.findUnique({
      where: { id: params.id },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Care plan not found" },
        { status: 404 }
      );
    }

    // Only workers with NDIS verification can update
    if (existingPlan.workerId) {
      try {
        await requireNDISVerification(
          existingPlan.workerId,
          "NDIS Worker Screening verification is required to update care plans"
        );
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }

      // Verify the worker is the one making the request
      const worker = await prisma.worker.findUnique({
        where: { id: existingPlan.workerId },
      });
      if (worker?.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // If no worker assigned, check if current user is a verified worker
      const ndisCheck = await checkWorkerNDISVerificationByUserId(
        session.user.id
      );
      if (!ndisCheck.hasNDISVerification) {
        return NextResponse.json(
          {
            error:
              "NDIS Worker Screening verification is required to update care plans",
          },
          { status: 403 }
        );
      }
    }

    // Update care plan
    const updatedPlan = await prisma.carePlan.update({
      where: { id: params.id },
      data: {
        ...(data.planName && { planName: data.planName }),
        ...(data.goals && { goals: data.goals as any }),
        ...(data.services && { services: data.services }),
        ...(data.reviewDate && { reviewDate: data.reviewDate }),
        ...(data.status && { status: data.status }),
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

    // Trigger Notion sync
    try {
      const { onCarePlanUpdated } = await import("@/lib/services/notion/event-listeners");
      await onCarePlanUpdated(updatedPlan.id);
    } catch (error) {
      // Don't fail if Notion sync fails
      console.warn("Failed to trigger Notion sync for care plan update", error);
    }

    return NextResponse.json(updatedPlan);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update care plan" },
      { status: 500 }
    );
  }
}
