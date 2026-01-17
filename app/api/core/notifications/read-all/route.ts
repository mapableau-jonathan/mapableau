/**
 * MapAble Core - Notifications API
 * POST /api/core/notifications/read-all - Mark all notifications as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notificationService } from "@/lib/services/core";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await notificationService.markAllAsRead(session.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    logger.error("Failed to mark all notifications as read", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
