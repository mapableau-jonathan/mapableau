/**
 * Jobs Analytics Service
 * Provides analytics and insights for the jobs module
 */

import { JobService } from "./job-service";
import { BaseAnalyticsService } from "../analytics/base-analytics-service";

export interface JobAnalytics {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgApplicationsPerJob: number;
  applicationSuccessRate: number;
  topCategories: Array<{ category: string; count: number }>;
}

export class JobsAnalyticsService {
  private jobService: JobService;
  private baseAnalytics: BaseAnalyticsService;

  constructor() {
    this.jobService = new JobService();
    this.baseAnalytics = new BaseAnalyticsService();
  }

  /**
   * Get comprehensive job analytics
   */
  async getAnalytics(): Promise<JobAnalytics> {
    const allJobs = await this.jobService.getJobListings({});

    const analytics: JobAnalytics = {
      totalJobs: allJobs.length,
      activeJobs: allJobs.filter((j: any) => j.status === "ACTIVE").length,
      closedJobs: allJobs.filter((j: any) => j.status === "CLOSED").length,
      byCategory: {},
      byType: {},
      byStatus: {},
      avgApplicationsPerJob: 0,
      applicationSuccessRate: 0,
      topCategories: [],
    };

    // Calculate breakdowns
    allJobs.forEach((job: any) => {
      analytics.byCategory[job.category] =
        (analytics.byCategory[job.category] || 0) + 1;
      analytics.byType[job.jobType] = (analytics.byType[job.jobType] || 0) + 1;
      analytics.byStatus[job.status] =
        (analytics.byStatus[job.status] || 0) + 1;
    });

    // Calculate top categories
    analytics.topCategories = Object.entries(analytics.byCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    /**
     * TODO: Calculate application metrics when application data is available
     * 
     * Future implementation:
     * - Fetch all applications via jobService.getAllApplications()
     * - Calculate avgApplicationsPerJob = totalApplications / totalJobs
     * - Calculate applicationSuccessRate from application outcomes
     */

    return analytics;
  }

  /**
   * Get application success rates by category
   */
  async getSuccessRatesByCategory(): Promise<
    Record<string, { applied: number; successful: number; rate: number }>
  > {
    // TODO: Implement when application tracking is available
    return {};
  }

  /**
   * Get skills gap analysis
   */
  async getSkillsGapAnalysis(): Promise<{
    inDemand: string[];
    oversupplied: string[];
  }> {
    // TODO: Analyze required skills vs applicant skills
    return {
      inDemand: [],
      oversupplied: [],
    };
  }
}
