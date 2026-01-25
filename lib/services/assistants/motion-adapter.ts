/**
 * Motion Assistant Adapter
 * Integration with Motion AI calendar assistant
 */

import { AssistantAdapter, Task, ScheduleOptimizationRequest, ScheduleOptimizationResult, AssistantResult, SchedulePreferences } from "./assistant-adapter";
import { CalendarEvent } from "../communication/ical-service";
import { logger } from "@/lib/logger";

export interface MotionConfig {
  apiKey?: string;
  apiUrl?: string; // Default: https://api.usemotion.com
}

/**
 * Motion Assistant Adapter
 * Integrates with Motion API for AI-powered calendar optimization
 */
export class MotionAdapter implements AssistantAdapter {
  private config: MotionConfig;
  private apiBaseUrl: string;

  constructor(config?: MotionConfig) {
    this.config = config || {};
    this.apiBaseUrl = config?.apiUrl || "https://api.usemotion.com/v1";
  }

  async optimizeSchedule(request: ScheduleOptimizationRequest): Promise<ScheduleOptimizationResult> {
    try {
      if (!this.isEnabled()) {
        // Fallback to basic scheduling logic
        return this.basicScheduleOptimization(request);
      }

      // Call Motion API for AI-powered scheduling
      const response = await fetch(`${this.apiBaseUrl}/schedules/optimize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tasks: request.tasks.map((t) => ({
            title: t.title,
            description: t.description,
            priority: t.priority,
            deadline: t.deadline?.toISOString(),
            estimatedDuration: t.estimatedDuration,
          })),
          existingEvents: request.existingEvents.map((e) => ({
            summary: e.summary,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime.toISOString(),
          })),
          preferences: request.preferences,
          timeRange: request.timeRange ? {
            start: request.timeRange.start.toISOString(),
            end: request.timeRange.end.toISOString(),
          } : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        logger.warn("Motion API error, falling back to basic scheduling", { error });
        return this.basicScheduleOptimization(request);
      }

      const motionResult = await response.json();

      // Convert Motion response to our format
      return this.convertMotionSchedule(motionResult, request.tasks);
    } catch (error: any) {
      logger.error("Motion schedule optimization error", { error });
      // Fallback to basic scheduling
      return this.basicScheduleOptimization(request);
    }
  }

  async createTask(task: Task, userId: string): Promise<AssistantResult> {
    try {
      if (!this.isEnabled()) {
        return {
          success: false,
          error: "Motion API not configured",
        };
      }

      const response = await fetch(`${this.apiBaseUrl}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.deadline?.toISOString(),
          duration: task.estimatedDuration,
          workspaceId: userId, // User's workspace ID
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create Motion task");
      }

      const createdTask = await response.json();

      return {
        success: true,
        scheduleId: createdTask.id,
      };
    } catch (error: any) {
      logger.error("Motion create task error", { error, task });
      return {
        success: false,
        error: error.message || "Failed to create task in Motion",
      };
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<AssistantResult> {
    try {
      if (!this.isEnabled()) {
        return {
          success: false,
          error: "Motion API not configured",
        };
      }

      const updatePayload: any = {};
      if (updates.title) updatePayload.name = updates.title;
      if (updates.description) updatePayload.description = updates.description;
      if (updates.priority) updatePayload.priority = updates.priority;
      if (updates.deadline) updatePayload.dueDate = updates.deadline.toISOString();
      if (updates.estimatedDuration) updatePayload.duration = updates.estimatedDuration;

      const response = await fetch(`${this.apiBaseUrl}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update Motion task");
      }

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error("Motion update task error", { error, taskId });
      return {
        success: false,
        error: error.message || "Failed to update task in Motion",
      };
    }
  }

  async rescheduleTask(taskId: string, reason: string): Promise<AssistantResult> {
    try {
      if (!this.isEnabled()) {
        return {
          success: false,
          error: "Motion API not configured",
        };
      }

      // Motion automatically reschedules, but we can trigger a re-optimization
      const response = await fetch(`${this.apiBaseUrl}/tasks/${taskId}/reschedule`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reschedule task in Motion");
      }

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error("Motion reschedule task error", { error, taskId });
      return {
        success: false,
        error: error.message || "Failed to reschedule task in Motion",
      };
    }
  }

  async getRecommendations(userId: string, date: Date): Promise<CalendarEvent[]> {
    try {
      if (!this.isEnabled()) {
        return [];
      }

      const response = await fetch(
        `${this.apiBaseUrl}/schedules/recommendations?userId=${userId}&date=${date.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        logger.warn("Motion recommendations error", { response: await response.text() });
        return [];
      }

      const recommendations = await response.json();
      return recommendations.events || [];
    } catch (error: any) {
      logger.error("Motion get recommendations error", { error });
      return [];
    }
  }

  /**
   * Basic schedule optimization fallback
   */
  private basicScheduleOptimization(request: ScheduleOptimizationRequest): ScheduleOptimizationResult {
    const scheduledTasks: ScheduleOptimizationResult["scheduledTasks"] = [];
    const conflicts: ScheduleOptimizationResult["conflicts"] = [];
    const unscheduledTasks: Task[] = [];

    const prefs = request.preferences;
    const workingStart = this.parseTime(prefs.workingHours.start);
    const workingEnd = this.parseTime(prefs.workingHours.end);

    // Sort tasks by priority and deadline
    const sortedTasks = [...request.tasks].sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

    const timeRange = request.timeRange || {
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: next 7 days
    };

    // Build availability map
    const availability = this.calculateAvailability(
      request.existingEvents,
      prefs,
      timeRange
    );

    // Schedule tasks in available slots
    for (const task of sortedTasks) {
      const duration = task.estimatedDuration || 60; // Default 1 hour
      const slot = this.findBestSlot(availability, duration, task.deadline);

      if (slot) {
        const scheduledTime = slot.start;
        const calendarEvent: CalendarEvent = {
          summary: task.title,
          description: task.description,
          startTime: scheduledTime,
          endTime: new Date(scheduledTime.getTime() + duration * 60 * 1000),
          status: "CONFIRMED",
        };

        scheduledTasks.push({
          task,
          scheduledTime,
          calendarEvent,
        });

        // Mark slot as used
        slot.used = true;
      } else {
        if (task.deadline && task.deadline < timeRange.end) {
          conflicts.push({
            task,
            reason: "No available time slots before deadline",
          });
        } else {
          unscheduledTasks.push(task);
        }
      }
    }

    return {
      scheduledTasks,
      conflicts,
      unscheduledTasks,
    };
  }

  private calculateAvailability(
    events: CalendarEvent[],
    preferences: SchedulePreferences,
    timeRange: { start: Date; end: Date }
  ): Array<{ start: Date; end: Date; used?: boolean }> {
    const slots: Array<{ start: Date; end: Date; used?: boolean }> = [];
    const buffer = (preferences.bufferTime || 0) * 60 * 1000;

    // Create daily slots within working hours
    let currentDate = new Date(timeRange.start);
    while (currentDate <= timeRange.end) {
      const dayOfWeek = currentDate.getDay();
      if (preferences.workingHours.daysOfWeek.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
        const dayStart = new Date(currentDate);
        const [hours, minutes] = preferences.workingHours.start.split(":").map(Number);
        dayStart.setHours(hours, minutes, 0, 0);

        const dayEnd = new Date(currentDate);
        const [endHours, endMinutes] = preferences.workingHours.end.split(":").map(Number);
        dayEnd.setHours(endHours, endMinutes, 0, 0);

        // Remove time blocked by existing events
        const freeSlots = this.extractFreeSlots(dayStart, dayEnd, events, buffer);
        slots.push(...freeSlots);
      }

      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    return slots;
  }

  private extractFreeSlots(
    dayStart: Date,
    dayEnd: Date,
    events: CalendarEvent[],
    buffer: number
  ): Array<{ start: Date; end: Date; used?: boolean }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    let currentStart = new Date(dayStart);

    // Sort events by start time
    const dayEvents = events
      .filter((e) => {
        const eventStart = new Date(e.startTime);
        return eventStart >= dayStart && eventStart < dayEnd;
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (const event of dayEvents) {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      // Add slot before event (if there's space)
      if (eventStart.getTime() - buffer > currentStart.getTime()) {
        slots.push({
          start: new Date(currentStart),
          end: new Date(eventStart.getTime() - buffer),
        });
      }

      // Move current start to after event
      currentStart = new Date(eventEnd.getTime() + buffer);
    }

    // Add remaining slot after last event
    if (currentStart < dayEnd) {
      slots.push({
        start: new Date(currentStart),
        end: new Date(dayEnd),
      });
    }

    return slots;
  }

  private findBestSlot(
    availability: Array<{ start: Date; end: Date; used?: boolean }>,
    duration: number,
    deadline?: Date
  ): { start: Date; end: Date; used?: boolean } | null {
    const durationMs = duration * 60 * 1000;

    // Filter available slots that fit the duration
    const suitableSlots = availability.filter(
      (slot) => !slot.used && slot.end.getTime() - slot.start.getTime() >= durationMs
    );

    if (suitableSlots.length === 0) {
      return null;
    }

    // If deadline exists, prioritize slots before deadline
    if (deadline) {
      const beforeDeadline = suitableSlots.filter((slot) => slot.start <= deadline);
      if (beforeDeadline.length > 0) {
        return beforeDeadline[0];
      }
    }

    // Return first suitable slot
    return suitableSlots[0];
  }

  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return { hours, minutes };
  }

  private convertMotionSchedule(motionResult: any, tasks: Task[]): ScheduleOptimizationResult {
    // Convert Motion API response to our format
    // This is a placeholder - actual implementation depends on Motion API structure
    return {
      scheduledTasks: [],
      conflicts: [],
      unscheduledTasks: [],
    };
  }

  isEnabled(): boolean {
    return !!this.config.apiKey;
  }
}
