/**
 * NDIS Provider Finder Ingest
 * POST /api/ndis/provider-finder/ingest
 * Fetches list-providers.json from ndis.gov.au and upserts into NdisFinderProvider.
 * Protect this route in production (e.g. cron secret or admin-only).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestNdisProviderFinder } from "@/lib/services/ndis/provider-finder-ingest";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    logger.info("NDIS provider-finder ingest started");
    const result = await ingestNdisProviderFinder(prisma);
    logger.info("NDIS provider-finder ingest completed", result);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("NDIS provider-finder ingest failed", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ingest failed",
      },
      { status: 500 }
    );
  }
}
