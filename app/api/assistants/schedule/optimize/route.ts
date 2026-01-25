/**
 * Schedule Optimization API
 * POST /api/assistants/schedule/optimize
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ScheduleOptimizationService } from "@/lib/services/assistants/schedule-optimization-service";
import { getEnv } from "@/lib/config/env";
import { logger } from "@/lib/logger";
import { z } from "zod";

const optimizeSchema = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    deadline: z.string().datetime().optional(),
    estimatedDuration: z.number().optional(),
  })),
  existingEvents: z.array(z.object({
    summary: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
  })).optional(),
  preferences: z.object({
    workingHours: z.object({
      start: z.string(),
      end: z.string(),
      daysOfWeek: z.array(z.number()),
    }),
    bufferTime: z.number().optional(),
    maxMeetingsPerDay: z.number().optional(),
  }),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
});

/**
 * POST /api/assistants/schedule/optimize
 * Optimize schedule with AI-powered scheduling
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = optimizeSchema.parse(body);

    const env = getEnv();
    const optimizationService = new ScheduleOptimizationService({
      provider: env.MOTION_API_KEY ? "motion" : "basic",
      motionApiKey: env.MOTION_API_KEY,
      motionApiUrl: env.MOTION_API_URL,
    });

    // Convert to service format
    const tasks = validated.tasks.map((t) => ({
      title: t.title,
      description: t.description,
      priority: t.priority as "low" | "medium" | "high" | "urgent",
      deadline: t.deadline ? new Date(t.deadline) : undefined,
      estimatedDuration: t.estimatedDuration,
    }));

    const existingEvents = (validated.existingEvents || []).map((e) => ({
      summary: e.summary,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      status: "CONFIRMED" as const,
    }));

    const timeRange = validated.timeRange ? {
      start: new Date(validated.timeRange.start),
      end: new Date(validated.timeRange.end),
    } : undefined;

    const result = await optimizationService.optimizeSchedule(
      tasks,
      existingEvents,
      validated.preferences,
      timeRange
    );

    return NextResponse.json({
      success: true,
      scheduledTasks: result.scheduledTasks.map((st) => ({
        task: st.task,
        scheduledTime: st.scheduledTime.toISOString(),
        calendarEvent: {
          ...st.calendarEvent,
          startTime: st.calendarEvent.startTime.toISOString(),
          endTime: st.calendarEvent.endTime.toISOString(),
        },
      })),
      conflicts: result.conflicts,
      unscheduledTasks: result.unscheduledTasks,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Schedule optimization error", { error });
    return NextResponse.json(
      { error: error.message || "Failed to optimize schedule" },
      { status: 500 }
    );
  }
}
