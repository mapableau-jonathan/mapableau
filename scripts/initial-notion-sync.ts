#!/usr/bin/env tsx
/**
 * Initial Notion Sync Script
 * Performs bulk sync of all existing participant data to Notion
 * 
 * Usage:
 *   pnpm tsx scripts/initial-notion-sync.ts [--dry-run]
 */

import { NotionSyncService } from "../lib/services/notion/notion-sync-service";
import { getNotionConfig, validateNotionConfig } from "../lib/config/notion";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

interface SyncStats {
  participants: { synced: number; failed: number };
  ndisPlans: { synced: number; failed: number };
  carePlans: { synced: number; failed: number };
  incidents: { synced: number; failed: number };
  complaints: { synced: number; failed: number };
  risks: { synced: number; failed: number };
  payments: { synced: number; failed: number };
}

/**
 * Sync all entities of a type
 */
async function syncEntities<T>(
  entityType: string,
  findMany: () => Promise<T[]>,
  getIds: (entity: T) => string[],
  syncMethods: Array<(id: string) => Promise<void>>,
  dryRun: boolean
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  try {
    const entities = await findMany();
    console.log(`\n📦 Found ${entities.length} ${entityType} entities`);

    for (const entity of entities) {
      const ids = getIds(entity);
      
      for (let i = 0; i < ids.length && i < syncMethods.length; i++) {
        const id = ids[i];
        if (!id) continue;

        try {
          if (dryRun) {
            console.log(`  [DRY RUN] Would sync ${entityType} ${id}`);
            synced++;
          } else {
            await syncMethods[i](id);
            synced++;
            process.stdout.write(".");
          }
        } catch (error: any) {
          failed++;
          logger.error(`Failed to sync ${entityType}`, { error, id });
          process.stdout.write("F");
        }
      }
    }

    if (!dryRun) {
      console.log(`\n  ✅ Synced: ${synced}, ❌ Failed: ${failed}`);
    }
  } catch (error) {
    logger.error(`Error syncing ${entityType}`, { error });
    throw error;
  }

  return { synced, failed };
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Initial Notion Sync - Bulk Import\n");

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  try {
    const config = getNotionConfig();
    validateNotionConfig(config);

    if (!config.enabled) {
      console.error("❌ Notion sync is disabled. Enable it in configuration first.");
      process.exit(1);
    }

    const syncService = new NotionSyncService();
    const stats: SyncStats = {
      participants: { synced: 0, failed: 0 },
      ndisPlans: { synced: 0, failed: 0 },
      carePlans: { synced: 0, failed: 0 },
      incidents: { synced: 0, failed: 0 },
      complaints: { synced: 0, failed: 0 },
      risks: { synced: 0, failed: 0 },
      payments: { synced: 0, failed: 0 },
    };

    console.log("Starting bulk sync...\n");

    // 1. Sync Participants
    if (config.syncSettings.syncParticipants) {
      console.log("👥 Syncing Participants...");
      stats.participants = await syncEntities(
        "Participants",
        () => prisma.user.findMany({ where: { role: "PARTICIPANT" } }),
        (user) => [user.id],
        [(id) => syncService.syncParticipantToNotion(id)],
        dryRun
      );
    }

    // 2. Sync NDIS Plans
    if (config.syncSettings.syncNDISPlans) {
      console.log("\n📋 Syncing NDIS Plans...");
      stats.ndisPlans = await syncEntities(
        "NDIS Plans",
        () => prisma.nDISPlan.findMany(),
        (plan) => [plan.id],
        [(id) => syncService.syncNDISPlanToNotion(id)],
        dryRun
      );
    }

    // 3. Sync Care Plans
    if (config.syncSettings.syncCarePlans) {
      console.log("\n💼 Syncing Care Plans...");
      stats.carePlans = await syncEntities(
        "Care Plans",
        () => prisma.carePlan.findMany(),
        (plan) => [plan.id],
        [(id) => syncService.syncCarePlanToNotion(id)],
        dryRun
      );
    }

    // 4. Sync Incidents
    if (config.syncSettings.syncIncidents) {
      console.log("\n⚠️  Syncing Incidents...");
      stats.incidents = await syncEntities(
        "Incidents",
        () => prisma.incident.findMany(),
        (incident) => [incident.id],
        [(id) => syncService.syncIncidentToNotion(id)],
        dryRun
      );
    }

    // 5. Sync Complaints
    if (config.syncSettings.syncComplaints) {
      console.log("\n📢 Syncing Complaints...");
      stats.complaints = await syncEntities(
        "Complaints",
        () => prisma.complaint.findMany(),
        (complaint) => [complaint.id],
        [(id) => syncService.syncComplaintToNotion(id)],
        dryRun
      );
    }

    // 6. Sync Risks
    if (config.syncSettings.syncRisks) {
      console.log("\n🔴 Syncing Risks...");
      stats.risks = await syncEntities(
        "Risks",
        () => prisma.risk.findMany(),
        (risk) => [risk.id],
        [(id) => syncService.syncRiskToNotion(id)],
        dryRun
      );
    }

    // 7. Sync Payment Transactions
    if (config.syncSettings.syncPayments) {
      console.log("\n💰 Syncing Payment Transactions...");
      stats.payments = await syncEntities(
        "Payment Transactions",
        () => prisma.paymentTransaction.findMany(),
        (payment) => [payment.id],
        [(id) => syncService.syncPaymentToNotion(id)],
        dryRun
      );
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Sync Summary\n");
    console.log(`Participants:  ${stats.participants.synced} synced, ${stats.participants.failed} failed`);
    console.log(`NDIS Plans:    ${stats.ndisPlans.synced} synced, ${stats.ndisPlans.failed} failed`);
    console.log(`Care Plans:    ${stats.carePlans.synced} synced, ${stats.carePlans.failed} failed`);
    console.log(`Incidents:     ${stats.incidents.synced} synced, ${stats.incidents.failed} failed`);
    console.log(`Complaints:   ${stats.complaints.synced} synced, ${stats.complaints.failed} failed`);
    console.log(`Risks:         ${stats.risks.synced} synced, ${stats.risks.failed} failed`);
    console.log(`Payments:      ${stats.payments.synced} synced, ${stats.payments.failed} failed`);

    const totalSynced =
      stats.participants.synced +
      stats.ndisPlans.synced +
      stats.carePlans.synced +
      stats.incidents.synced +
      stats.complaints.synced +
      stats.risks.synced +
      stats.payments.synced;

    const totalFailed =
      stats.participants.failed +
      stats.ndisPlans.failed +
      stats.carePlans.failed +
      stats.incidents.failed +
      stats.complaints.failed +
      stats.risks.failed +
      stats.payments.failed;

    console.log("\n" + "-".repeat(60));
    console.log(`Total: ${totalSynced} synced, ${totalFailed} failed`);
    console.log("=".repeat(60));

    if (dryRun) {
      console.log("\n💡 This was a dry run. Remove --dry-run to perform actual sync.");
    } else if (totalFailed > 0) {
      console.log("\n⚠️  Some items failed to sync. Check logs for details.");
      process.exit(1);
    } else {
      console.log("\n✨ All data synced successfully!");
    }
  } catch (error: any) {
    console.error("\n❌ Error during sync:", error.message);
    logger.error("Initial sync failed", { error });
    process.exit(1);
  }
}

main();
