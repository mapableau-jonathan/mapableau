/**
 * Assistant Tasks API
 * POST /api/assistants/tasks - Create task
 * GET /api/assistants/tasks - List tasks
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ScheduleOptimizationService } from "@/lib/services/assistants/schedule-optimization-service";
import { getEnv } from "@/lib/config/env";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  deadline: z.string().datetime().optional(),
  estimatedDuration: z.number().optional(),
});

/**
 * POST /api/assistants/tasks
 * Create task in assistant system
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createTaskSchema.parse(body);

    const env = getEnv();
    const optimizationService = new ScheduleOptimizationService({
      provider: env.MOTION_API_KEY ? "motion" : "basic",
      motionApiKey: env.MOTION_API_KEY,
      motionApiUrl: env.MOTION_API_URL,
    });

    const task = {
      title: validated.title,
      description: validated.description,
      priority: validated.priority as "low" | "medium" | "high" | "urgent",
      deadline: validated.deadline ? new Date(validated.deadline) : undefined,
      estimatedDuration: validated.estimatedDuration,
    };

    const result = await optimizationService.createTask(task, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create task" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Create task error", { error });
    return NextResponse.json(
      { error: error.message || "Failed to create task" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assistants/tasks
 * Get schedule recommendations (placeholder - would fetch tasks from assistant)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();

    const env = getEnv();
    const optimizationService = new ScheduleOptimizationService({
      provider: env.MOTION_API_KEY ? "motion" : "basic",
      motionApiKey: env.MOTION_API_KEY,
      motionApiUrl: env.MOTION_API_URL,
    });

    const recommendations = await optimizationService.getRecommendations(session.user.id, date);

    return NextResponse.json({
      success: true,
      recommendations: recommendations.map((e) => ({
        ...e,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
      })),
    });
  } catch (error: any) {
    logger.error("Get recommendations error", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
