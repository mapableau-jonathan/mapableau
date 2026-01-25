import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PriceGuideService } from "@/lib/services/ndia/price-guide";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function GET(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const version = searchParams.get("version") || undefined;
    const serviceCode = searchParams.get("serviceCode");

    const priceGuideService = new PriceGuideService();

    if (serviceCode) {
      // Get price for specific service code
      const price = await priceGuideService.getPrice(serviceCode, version);
      if (price === null) {
        return NextResponse.json(
          { error: "Service code not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ serviceCode, price });
    }

    // Get full price guide
    const priceGuide = await priceGuideService.getPriceGuide(version);
    return NextResponse.json({ priceGuide });
  } catch (error) {
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Error fetching price guide:", error);
    return NextResponse.json(
      { error: "Failed to fetch price guide" },
      { status: 500 }
    );
  }
}
