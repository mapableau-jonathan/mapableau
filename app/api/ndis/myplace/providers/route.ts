/**
 * NDIS myplace Providers Endpoint
 * GET /api/ndis/myplace/providers
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NDISMyplaceApiService } from "@/lib/services/ndis/myplace-api-service";
import { getNDISMyplaceConfig } from "@/lib/config/ndis-myplace";
import { logger } from "@/lib/logger";

/**
 * GET /api/ndis/myplace/providers
 * Search for providers or get my providers
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getNDISMyplaceConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "NDIS myplace integration is disabled" },
        { status: 400 }
      );
    }

    const apiService = new NDISMyplaceApiService();
    
    // Check if getting my providers or searching
    const myProviders = request.nextUrl.searchParams.get("my") === "true";
    
    if (myProviders) {
      const providers = await apiService.getMyProviders(session.user.id);
      return NextResponse.json({ providers });
    } else {
      // Search providers
      const location = request.nextUrl.searchParams.get("location") || undefined;
      const category = request.nextUrl.searchParams.get("category") || undefined;
      const name = request.nextUrl.searchParams.get("name") || undefined;
      const postcode = request.nextUrl.searchParams.get("postcode") || undefined;

      const providers = await apiService.searchProviders(session.user.id, {
        location,
        category,
        name,
        postcode,
      });
      
      return NextResponse.json({ providers });
    }
  } catch (error: any) {
    logger.error("Error fetching providers from myplace", { error });
    return NextResponse.json(
      { error: error.message || "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
