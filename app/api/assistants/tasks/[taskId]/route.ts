/**
 * Assistant Task Management API
 * PATCH /api/assistants/tasks/[taskId] - Update task
 * POST /api/assistants/tasks/[taskId]/reschedule - Reschedule task
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getScheduleOptimizationService } from "@/lib/services/assistants/assistant-service-factory";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  deadline: z.string().datetime().optional(),
  estimatedDuration: z.number().optional(),
});

/**
 * PATCH /api/assistants/tasks/[taskId]
 * Update task in assistant system
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();
    const validated = updateTaskSchema.parse(body);

    const optimizationService = getScheduleOptimizationService();

    const updates: any = {};
    if (validated.title) updates.title = validated.title;
    if (validated.description) updates.description = validated.description;
    if (validated.priority) updates.priority = validated.priority;
    if (validated.deadline) updates.deadline = new Date(validated.deadline);
    if (validated.estimatedDuration) updates.estimatedDuration = validated.estimatedDuration;

    const result = await optimizationService.updateTask(taskId, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update task" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Update task error", { error });
    return NextResponse.json(
      { error: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assistants/tasks/[taskId]/reschedule
 * Reschedule task automatically when conflicts occur
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();
    const reason = body.reason || "Conflict detected";

    const optimizationService = getScheduleOptimizationService();

    const result = await optimizationService.handleConflict(taskId, reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to reschedule task" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Task rescheduled successfully",
    });
  } catch (error: any) {
    logger.error("Reschedule task error", { error });
    return NextResponse.json(
      { error: error.message || "Failed to reschedule task" },
      { status: 500 }
    );
  }
}
