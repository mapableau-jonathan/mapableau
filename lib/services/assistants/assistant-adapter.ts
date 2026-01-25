/**
 * Assistant Adapter Interface
 * Abstraction for AI calendar assistants (Motion, Reclaim, etc.)
 */

import { CalendarEvent } from "../communication/ical-service";

export interface SchedulePreferences {
  workingHours: {
    start: string; // "09:00"
    end: string; // "17:00"
    daysOfWeek: number[]; // [1,2,3,4,5] Monday-Friday
  };
  bufferTime?: number; // Minutes between meetings
  focusBlocks?: Array<{
    start: string;
    end: string;
    daysOfWeek: number[];
  }>;
  maxMeetingsPerDay?: number;
  preferredMeetingTimes?: Array<{
    start: string;
    end: string;
  }>;
}

export interface Task {
  id?: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  deadline?: Date;
  estimatedDuration?: number; // Minutes
  calendarEvent?: CalendarEvent;
  metadata?: Record<string, any>;
}

export interface ScheduleOptimizationRequest {
  tasks: Task[];
  existingEvents: CalendarEvent[];
  preferences: SchedulePreferences;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface ScheduleOptimizationResult {
  scheduledTasks: Array<{
    task: Task;
    scheduledTime: Date;
    calendarEvent: CalendarEvent;
  }>;
  conflicts: Array<{
    task: Task;
    reason: string;
  }>;
  unscheduledTasks: Task[];
}

export interface AssistantResult {
  success: boolean;
  scheduleId?: string;
  messageId?: string;
  error?: string;
}

/**
 * Assistant Adapter Interface
 */
export interface AssistantAdapter {
  /**
   * Optimize schedule based on tasks and preferences
   */
  optimizeSchedule(request: ScheduleOptimizationRequest): Promise<ScheduleOptimizationResult>;

  /**
   * Create task in assistant system
   */
  createTask(task: Task, userId: string): Promise<AssistantResult>;

  /**
   * Update task in assistant system
   */
  updateTask(taskId: string, updates: Partial<Task>): Promise<AssistantResult>;

  /**
   * Reschedule task automatically when conflicts occur
   */
  rescheduleTask(taskId: string, reason: string): Promise<AssistantResult>;

  /**
   * Get schedule recommendations
   */
  getRecommendations(userId: string, date: Date): Promise<CalendarEvent[]>;

  /**
   * Check if adapter is enabled/configured
   */
  isEnabled(): boolean;
}
