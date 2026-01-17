import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { RedemptionService } from "@/lib/services/abilitypay/redemption-service";
import { NPPAdapter } from "@/lib/services/abilitypay/banking/npp-adapter";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";
import { getNPPConfig } from "@/lib/config/npp-config";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get redemption to verify ownership
    const { prisma } = await import("@/lib/prisma");
    const redemption = await prisma.redemptionRequest.findUnique({
      where: { id: params.id },
    });

    if (!redemption) {
      return NextResponse.json(
        { error: "Redemption not found" },
        { status: 404 }
      );
    }

    // Verify user owns this redemption
    if (redemption.providerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Initialize NPP adapter and redemption service
    const nppConfig = getNPPConfig();
    const nppAdapter = new NPPAdapter({
      apiUrl: nppConfig.apiUrl,
      apiKey: nppConfig.apiKey,
      merchantId: nppConfig.merchantId,
    });
    const redemptionService = new RedemptionService(nppAdapter);

    // Process redemption (execute NPP payment)
    const result = await redemptionService.processRedemption(params.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error settling redemption:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to settle redemption",
      },
      { status: 500 }
    );
  }
}
