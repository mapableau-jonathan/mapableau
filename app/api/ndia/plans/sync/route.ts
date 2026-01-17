import { NextResponse } from "next/server";
import { PlanSyncService } from "@/lib/services/ndia/plan-sync";
import { requireAuth, UserRole } from "@/lib/security/authorization-utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

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
    const isParticipant = user.id === participantId;
    const isAdmin = user.role === UserRole.NDIA_ADMIN;
    
    // Check if user is a plan manager for this participant's plan
    let isPlanManager = false;
    if (!isParticipant && !isAdmin) {
      const plan = await prisma.nDISPlan.findUnique({
        where: { participantId },
        select: { planManagerId: true },
      });
      isPlanManager = plan?.planManagerId === user.id;
    }

    if (!isParticipant && !isAdmin && !isPlanManager) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this participant's plan" },
        { status: 403 }
      );
    }

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
