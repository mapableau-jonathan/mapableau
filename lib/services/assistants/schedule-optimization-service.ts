/**
 * Schedule Optimization Service
 * Unified service for AI-powered calendar and schedule optimization
 */

import { AssistantAdapter, Task, ScheduleOptimizationRequest, ScheduleOptimizationResult, SchedulePreferences } from "./assistant-adapter";
import { MotionAdapter } from "./motion-adapter";
import { CalendarEvent } from "../communication/ical-service";
import { logger } from "@/lib/logger";

export interface ScheduleOptimizationServiceConfig {
  provider: "motion" | "basic";
  motionApiKey?: string;
  motionApiUrl?: string;
}

/**
 * Schedule Optimization Service
 * Provides AI-powered scheduling with automatic conflict resolution
 */
export class ScheduleOptimizationService {
  private adapter: AssistantAdapter;

  constructor(config?: ScheduleOptimizationServiceConfig) {
    const provider = config?.provider || "basic";

    if (provider === "motion") {
      this.adapter = new MotionAdapter({
        apiKey: config?.motionApiKey,
        apiUrl: config?.motionApiUrl,
      });
    } else {
      // Use Motion adapter in basic mode (fallback logic)
      this.adapter = new MotionAdapter();
    }
  }

  /**
   * Optimize schedule with AI-powered scheduling
   */
  async optimizeSchedule(
    tasks: Task[],
    existingEvents: CalendarEvent[],
    preferences: SchedulePreferences,
    timeRange?: { start: Date; end: Date }
  ): Promise<ScheduleOptimizationResult> {
    try {
      const request: ScheduleOptimizationRequest = {
        tasks,
        existingEvents,
        preferences,
        timeRange,
      };

      return await this.adapter.optimizeSchedule(request);
    } catch (error) {
      logger.error("Schedule optimization error", { error });
      throw error;
    }
  }

  /**
   * Create task in assistant system
   */
  async createTask(task: Task, userId: string): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const result = await this.adapter.createTask(task, userId);
      return {
        success: result.success,
        taskId: result.scheduleId,
        error: result.error,
      };
    } catch (error: any) {
      logger.error("Create task error", { error, task });
      return {
        success: false,
        error: error.message || "Failed to create task",
      };
    }
  }

  /**
   * Update task in assistant system
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.adapter.updateTask(taskId, updates);
    } catch (error: any) {
      logger.error("Update task error", { error, taskId });
      return {
        success: false,
        error: error.message || "Failed to update task",
      };
    }
  }

  /**
   * Automatically reschedule when conflicts occur
   */
  async handleConflict(taskId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.adapter.rescheduleTask(taskId, reason);
    } catch (error: any) {
      logger.error("Reschedule task error", { error, taskId });
      return {
        success: false,
        error: error.message || "Failed to reschedule task",
      };
    }
  }

  /**
   * Get AI recommendations for schedule improvements
   */
  async getRecommendations(userId: string, date: Date): Promise<CalendarEvent[]> {
    try {
      return await this.adapter.getRecommendations(userId, date);
    } catch (error) {
      logger.error("Get recommendations error", { error });
      return [];
    }
  }

  /**
   * Auto-reschedule when existing event changes
   */
  async handleEventChange(
    changedEvent: CalendarEvent,
    userId: string,
    preferences: SchedulePreferences
  ): Promise<{ rescheduled: boolean; affectedTasks?: string[] }> {
    try {
      // This would integrate with the assistant to detect conflicts
      // and automatically reschedule affected tasks
      const recommendations = await this.adapter.getRecommendations(userId, changedEvent.startTime);

      return {
        rescheduled: recommendations.length > 0,
        affectedTasks: recommendations.map((e) => e.uid).filter(Boolean) as string[],
      };
    } catch (error) {
      logger.error("Handle event change error", { error });
      return { rescheduled: false };
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    provider: string;
    enabled: boolean;
  } {
    return {
      provider: this.adapter instanceof MotionAdapter ? "motion" : "basic",
      enabled: this.adapter.isEnabled(),
    };
  }
}

// Export default instance
export const scheduleOptimizationService = new ScheduleOptimizationService();
