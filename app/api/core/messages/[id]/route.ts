/**
 * MapAble Core - Messaging API
 * GET /api/core/messages/[id] - Get message
 * PATCH /api/core/messages/[id]/read - Mark as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { messagingService } from "@/lib/services/core";
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

    const message = await messagingService.getMessage(params.id);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    logger.error("Failed to get message", error);
    return NextResponse.json(
      { error: "Failed to get message" },
      { status: 500 }
    );
  }
}
