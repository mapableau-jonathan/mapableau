/**
 * Goal Tracking Service
 * Tracks progress towards care plan goals
 */

import { CarePlanService } from "./care-plan-service";

export interface GoalProgress {
  goalIndex: number;
  progress: number; // 0-100
  milestones: Array<{
    description: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  notes?: string;
}

export class GoalTrackingService {
  private carePlanService: CarePlanService;

  constructor() {
    this.carePlanService = new CarePlanService();
  }

  /**
   * Update goal progress
   */
  async updateProgress(
    planId: string,
    goalIndex: number,
    progress: number,
    notes?: string
  ) {
    // Ensure progress is between 0 and 100
    const clampedProgress = Math.max(0, Math.min(100, progress));

    // If progress is 100%, mark as achieved
    const status = clampedProgress >= 100 ? "ACHIEVED" : "ACTIVE";

    await this.carePlanService.updateGoal(planId, {
      goalIndex,
      progress: clampedProgress,
      status,
    });

    return {
      goalIndex,
      progress: clampedProgress,
      status,
      notes,
    };
  }

  /**
   * Calculate goal progress based on milestones
   */
  calculateProgressFromMilestones(milestones: Array<{ completed: boolean }>): number {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter((m) => m.completed).length;
    return (completed / milestones.length) * 100;
  }

  /**
   * Get goals due soon (within 30 days)
   */
  async getGoalsDueSoon(planId: string) {
    const carePlan = await this.carePlanService.getCarePlan(planId);
    if (!carePlan) return [];

    const goals = carePlan.goals as Array<{
      description: string;
      targetDate: string;
      status?: string;
    }>;

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return goals
      .map((goal, index) => ({
        index,
        ...goal,
        targetDate: new Date(goal.targetDate),
      }))
      .filter(
        (goal) =>
          goal.status === "ACTIVE" &&
          goal.targetDate >= now &&
          goal.targetDate <= thirtyDaysFromNow
      )
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
  }

  /**
   * Get overdue goals
   */
  async getOverdueGoals(planId: string) {
    const carePlan = await this.carePlanService.getCarePlan(planId);
    if (!carePlan) return [];

    const goals = carePlan.goals as Array<{
      description: string;
      targetDate: string;
      status?: string;
    }>;

    const now = new Date();

    return goals
      .map((goal, index) => ({
        index,
        ...goal,
        targetDate: new Date(goal.targetDate),
      }))
      .filter(
        (goal) =>
          goal.status === "ACTIVE" && goal.targetDate < now
      )
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
  }
}
