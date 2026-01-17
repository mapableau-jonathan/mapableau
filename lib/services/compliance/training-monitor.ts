/**
 * Training Monitor Service
 * Monitors training expiry dates and sends alerts
 */

import { TrainingService } from "./training-service";
import { AlertService } from "../alerts/alert-service";
import { logger } from "@/lib/logger";
import type { AlertType } from "@prisma/client";

export class TrainingMonitorService {
  private trainingService: TrainingService;
  private alertService: AlertService;

  constructor() {
    this.trainingService = new TrainingService();
    this.alertService = new AlertService();
  }

  /**
   * Check for expiring training records and create alerts
   */
  async checkExpiringTraining() {
    try {
      // Check for training expiring in 90, 60, and 30 days
      const daysToCheck = [90, 60, 30];

      for (const days of daysToCheck) {
        const expiringRecords = await this.trainingService.getExpiringTrainingRecords(
          days
        );

        for (const record of expiringRecords) {
          // Determine alert type based on days until expiry
          let alertType: AlertType;
          if (days === 90) {
            alertType = "VERIFICATION_EXPIRING_90_DAYS";
          } else if (days === 60) {
            alertType = "VERIFICATION_EXPIRING_60_DAYS";
          } else {
            alertType = "VERIFICATION_EXPIRING_30_DAYS";
          }

          // Check if alert already exists
          const existingAlerts = await this.alertService.getWorkerAlerts(
            record.workerId,
            alertType
          );

          // Only create alert if it doesn't exist
          if (existingAlerts.length === 0) {
            const daysUntilExpiry = Math.ceil(
              (record.expiryDate!.getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );

            await this.alertService.createAlert({
              workerId: record.workerId,
              alertType,
              message: `Training "${record.trainingName}" expires in ${daysUntilExpiry} days. Please renew.`,
            });

            logger.info(
              `Created training expiry alert for worker ${record.workerId}`,
              {
                trainingId: record.id,
                trainingName: record.trainingName,
                daysUntilExpiry,
              }
            );
          }
        }
      }

      // Check for expired training
      const expiredRecords = await this.trainingService.getExpiringTrainingRecords(
        0
      );

      for (const record of expiredRecords) {
        if (record.expiryDate && record.expiryDate < new Date()) {
          const existingAlerts = await this.alertService.getWorkerAlerts(
            record.workerId,
            "VERIFICATION_EXPIRED"
          );

          if (existingAlerts.length === 0) {
            await this.alertService.createAlert({
              workerId: record.workerId,
              alertType: "VERIFICATION_EXPIRED",
              message: `Training "${record.trainingName}" has expired. Please renew immediately.`,
            });

            logger.warn(
              `Created expired training alert for worker ${record.workerId}`,
              {
                trainingId: record.id,
                trainingName: record.trainingName,
              }
            );
          }
        }
      }
    } catch (error) {
      logger.error("Error checking expiring training", error);
      throw error;
    }
  }

  /**
   * Run monitoring (to be called by cron job)
   */
  async runMonitoring() {
    logger.info("Starting training expiry monitoring");
    await this.checkExpiringTraining();
    logger.info("Completed training expiry monitoring");
  }
}
