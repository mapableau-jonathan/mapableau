/**
 * MapAble Core - Support API
 * GET /api/core/support/tickets/[id] - Get support ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supportService } from "@/lib/services/core";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await supportService.getTicket(params.id);

    if (!ticket) {
      return NextResponse.json(
        { error: "Support ticket not found" },
        { status: 404 }
      );
    }

    // Verify ticket belongs to user or user is assigned staff
    if (
      ticket.userId !== session.user.id &&
      ticket.assignedTo !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    logger.error("Failed to get support ticket", error);
    return NextResponse.json(
      { error: "Failed to get support ticket" },
      { status: 500 }
    );
  }
}
