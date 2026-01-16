/**
 * Care Note Management API
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

const createCareNoteSchema = z.object({
  carePlanId: z.string(),
  noteType: z.enum([
    "PROGRESS",
    "INCIDENT",
    "MEDICATION",
    "PERSONAL_CARE",
    "ACTIVITY",
    "OTHER",
  ]),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createCareNoteSchema.parse(body);

    // Verify care plan exists
    const carePlan = await prisma.carePlan.findUnique({
      where: { id: data.carePlanId },
    });

    if (!carePlan) {
      return NextResponse.json(
        { error: "Care plan not found" },
        { status: 404 }
      );
    }

    // Get worker for current user
    const worker = await prisma.worker.findUnique({
      where: { userId: session.user.id },
    });

    if (!worker) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    // Require NDIS verification
    try {
      await requireNDISVerification(
        worker.id,
        "NDIS Worker Screening verification is required to create care notes"
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    // Verify worker is assigned to this care plan (if workerId is set)
    if (carePlan.workerId && carePlan.workerId !== worker.id) {
      return NextResponse.json(
        {
          error:
            "You are not assigned to this care plan. Only assigned workers can create notes.",
        },
        { status: 403 }
      );
    }

    // Create care note
    const careNote = await prisma.careNote.create({
      data: {
        carePlanId: data.carePlanId,
        workerId: worker.id,
        noteType: data.noteType,
        content: data.content,
        metadata: data.metadata || {},
      },
      include: {
        carePlan: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
              },
            },
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

    return NextResponse.json(careNote, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create care note" },
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
    const carePlanId = searchParams.get("carePlanId");
    const workerId = searchParams.get("workerId");
    const noteType = searchParams.get("noteType");

    const where: any = {};

    if (carePlanId) {
      where.carePlanId = carePlanId;
    }

    if (workerId) {
      where.workerId = workerId;
    } else {
      // If no workerId specified, check if user is a worker
      const worker = await prisma.worker.findUnique({
        where: { userId: session.user.id },
      });
      if (worker) {
        // Workers can only see their own notes unless they have NDIS verification
        const ndisCheck = await checkWorkerNDISVerificationByUserId(
          session.user.id
        );
        if (ndisCheck.hasNDISVerification) {
          // Verified workers can see all notes for their care plans
          if (carePlanId) {
            const carePlan = await prisma.carePlan.findUnique({
              where: { id: carePlanId },
            });
            if (carePlan?.workerId === worker.id) {
              where.carePlanId = carePlanId;
            } else {
              return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
              );
            }
          } else {
            where.workerId = worker.id;
          }
        } else {
          // Non-verified workers can only see their own notes
          where.workerId = worker.id;
        }
      }
    }

    if (noteType) {
      where.noteType = noteType;
    }

    const careNotes = await prisma.careNote.findMany({
      where,
      include: {
        carePlan: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
              },
            },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ careNotes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get care notes" },
      { status: 500 }
    );
  }
}
