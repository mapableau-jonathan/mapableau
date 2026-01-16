/**
 * Ad Impression Tracking API
 */

import { NextRequest, NextResponse } from "next/server";
import { AdServer } from "@/lib/services/advertising/ad-server";
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
    await adServer.markAdServed(data.requestId);

    // Return 1x1 pixel for tracking
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );

    return new NextResponse(pixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    logger.error("Error tracking impression", error);
    // Return empty pixel on error
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    return new NextResponse(pixel, {
      headers: {
        "Content-Type": "image/gif",
      },
    });
  }
}
