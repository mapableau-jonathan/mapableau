/**
 * Ad Click Tracking API
 */

import { NextRequest, NextResponse } from "next/server";
import { AdServer } from "@/lib/services/advertising/ad-server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

const trackSchema = z.object({
  requestId: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = trackSchema.parse({
      requestId: searchParams.get("requestId"),
    });

    const adServer = new AdServer();
    await adServer.markAdClicked(data.requestId);

    // Get ad URL for redirect
    const adRequest = await prisma.adRequest.findUnique({
      where: { requestId: data.requestId },
      include: { winningAd: true },
    });

    if (adRequest?.winningAd?.linkUrl) {
      return NextResponse.redirect(adRequest.winningAd.linkUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error tracking click", error);
    return NextResponse.json(
      { error: error.message || "Failed to track click" },
      { status: 500 }
    );
  }
}
