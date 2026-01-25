/**
 * Ad Serving API
 * Real-time ad request endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { AdServer } from "@/lib/services/advertising/ad-server";
import type { AdRequestContext } from "@/lib/services/advertising/types";
import { z } from "zod";
import { logger } from "@/lib/logger";

const adRequestSchema = z.object({
  adUnitId: z.string(),
  userId: z.string().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      radius: z.number().optional(),
    })
    .optional(),
  pageContext: z
    .object({
      url: z.string().url().optional(),
      referrer: z.string().url().optional(),
      category: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
  device: z
    .object({
      type: z.enum(["mobile", "desktop", "tablet"]),
      os: z.string().optional(),
      browser: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = adRequestSchema.parse(body);

    // Get request metadata
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;

    const context: AdRequestContext = {
      adUnitId: data.adUnitId,
      userId: data.userId,
      userAgent,
      ipAddress,
      location: data.location,
      pageContext: data.pageContext,
      device: data.device,
    };

    const adServer = new AdServer();
    const result = await adServer.selectAd(context);

    if (!result.advertisement) {
      return NextResponse.json({
        ad: null,
        tracking: {
          impressionUrl: null,
          clickUrl: null,
        },
      });
    }

    // Get request ID from result (stored in recordAdRequest)
    const requestId = (result as any).requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const adResponse = await adServer.generateAdResponse(result, requestId);

    return NextResponse.json(adResponse);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error serving ad", error);
    return NextResponse.json(
      { error: error.message || "Failed to serve ad" },
      { status: 500 }
    );
  }
}
