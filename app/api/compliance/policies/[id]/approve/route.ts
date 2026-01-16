import { NextResponse } from "next/server";
import { PolicyService } from "@/lib/services/compliance/policy-service";
import { requireAdmin, requirePlanManager, requireAuth } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require admin or plan manager role to approve policies
    try {
      await requireAdmin();
    } catch {
      // If not admin, try plan manager
      await requirePlanManager();
    }

    const user = await requireAuth();
    const service = new PolicyService();
    const policy = await service.approvePolicy(params.id, user.id);

    return NextResponse.json(policy);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin or Plan Manager access required" },
        { status: 403 }
      );
    }
    logger.error("Error approving policy", error);
    return NextResponse.json(
      { error: "Failed to approve policy" },
      { status: 500 }
    );
  }
}
