/**
 * MapAble Core - Notifications API
 * GET /api/core/notifications - Get user notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notificationService } from "@/lib/services/core";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");
    const type = searchParams.get("type");
    const isRead = searchParams.get("isRead");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const notifications = await notificationService.getUserNotifications(
      session.user.id,
      {
        ...(channel && { channel: channel as NotificationChannel }),
        ...(type && { type: type as NotificationType }),
        ...(isRead !== null && { isRead: isRead === "true" }),
        ...(limit && { limit: parseInt(limit) }),
        ...(offset && { offset: parseInt(offset) }),
      }
    );

    const unreadCount = await notificationService.getUnreadCount(
      session.user.id
    );

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    logger.error("Failed to get notifications", error);
    return NextResponse.json(
      { error: "Failed to get notifications" },
      { status: 500 }
    );
  }
}
