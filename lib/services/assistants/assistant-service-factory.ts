/**
 * Assistant Service Factory
 * Centralizes assistant service instantiation
 */

import { ScheduleOptimizationService, ScheduleOptimizationServiceConfig } from "./schedule-optimization-service";
import { getEnv } from "@/lib/config/env";

// Singleton instance
let scheduleOptimizationServiceInstance: ScheduleOptimizationService | null = null;

/**
 * Get ScheduleOptimizationService instance (singleton)
 */
export function getScheduleOptimizationService(): ScheduleOptimizationService {
  if (!scheduleOptimizationServiceInstance) {
    const env = getEnv();
    
    const config: ScheduleOptimizationServiceConfig = {
      provider: env.MOTION_API_KEY ? "motion" : "basic",
      motionApiKey: env.MOTION_API_KEY,
      motionApiUrl: env.MOTION_API_URL,
    };

    scheduleOptimizationServiceInstance = new ScheduleOptimizationService(config);
  }
  
  return scheduleOptimizationServiceInstance;
}
