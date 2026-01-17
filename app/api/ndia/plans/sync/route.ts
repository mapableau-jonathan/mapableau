import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PlanSyncService } from "@/lib/services/ndia/plan-sync";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: "participantId is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this participant
    // (Participant themselves, plan manager, or admin)
    const participant = await requireAuth();
    // TODO: Add proper access control check

    const syncService = new PlanSyncService();
    const result = await syncService.syncPlan(participantId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error syncing NDIS plan:", error);
    return NextResponse.json(
      { error: "Failed to sync NDIS plan" },
      { status: 500 }
    );
  }
}
