/**
 * MapAble Core - Support API
 * POST /api/core/support/tickets/[id]/responses - Add response to ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supportService } from "@/lib/services/core";
import { logger } from "@/lib/logger";

const addResponseSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(z.string()).optional(),
});

export async function POST(
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

    // Verify user has access to ticket
    if (
      ticket.userId !== session.user.id &&
      ticket.assignedTo !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = addResponseSchema.parse(body);

    // Determine if this is a staff response
    const isStaffResponse = ticket.assignedTo === session.user.id;

    await supportService.addResponse({
      ticketId: params.id,
      userId: session.user.id,
      isStaffResponse,
      content: data.content,
      attachments: data.attachments,
    });

    const updatedTicket = await supportService.getTicket(params.id);

    return NextResponse.json({ ticket: updatedTicket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to add response to ticket", error);
    return NextResponse.json(
      { error: "Failed to add response to ticket" },
      { status: 500 }
    );
  }
}
