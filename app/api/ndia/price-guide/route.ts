import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PriceGuideService } from "@/lib/services/ndia/price-guide";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
    console.error("Error fetching price guide:", error);
    return NextResponse.json(
      { error: "Failed to fetch price guide" },
      { status: 500 }
    );
  }
}
