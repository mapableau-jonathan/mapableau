/**
 * Notion Sync Status Endpoint
 * GET /api/notion/status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getNotionConfig } from "@/lib/config/notion";
import { prisma } from "@/lib/prisma";
import { ConflictResolver } from "@/lib/services/notion/conflict-resolver";

/**
 * GET /api/notion/status
 * Get Notion sync status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getNotionConfig();

    if (!config.enabled) {
      return NextResponse.json({
        enabled: false,
        message: "Notion sync is disabled",
      });
    }

    // Get sync statistics
    const totalMappings = await prisma.notionSyncMapping.count();
    const pendingConflicts = await prisma.notionSyncMapping.count({
      where: { conflictState: "pending" },
    });

    const mappingsByType = await prisma.notionSyncMapping.groupBy({
      by: ["entityType"],
      _count: true,
    });

    const conflictResolver = new ConflictResolver();
    const conflicts = await conflictResolver.getPendingConflicts();

    // Get recent sync activity
    const recentSyncs = await prisma.notionSyncMapping.findMany({
      orderBy: { lastSyncedAt: "desc" },
      take: 10,
      select: {
        entityType: true,
        systemId: true,
        lastSyncedAt: true,
        conflictState: true,
      },
    });

    return NextResponse.json({
      enabled: true,
      config: {
        conflictStrategy: config.conflictStrategy,
        syncSettings: config.syncSettings,
      },
      statistics: {
        totalMappings,
        pendingConflicts,
        mappingsByType: mappingsByType.reduce(
          (acc, item) => {
            acc[item.entityType] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      conflicts: conflicts.length,
      recentSyncs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get status" },
      { status: 500 }
    );
  }
}
