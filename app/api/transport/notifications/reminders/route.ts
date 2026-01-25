/**
 * Transport Reminder Management Endpoint
 * GET /api/transport/notifications/reminders - Get reminder status
 * POST /api/transport/notifications/reminders - Schedule reminders
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { reminderScheduler } from "@/lib/services/transport/reminder-scheduler";
import { transportSMSNotificationService } from "@/lib/services/transport/sms-notification-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const sendReminderSchema = z.object({
  bookingId: z.string(),
  reminderType: z.enum(["24_HOURS", "2_HOURS", "30_MINUTES"]),
});

/**
 * GET /api/transport/notifications/reminders
 * Get reminder status for booking
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookingId = request.nextUrl.searchParams.get("bookingId");
    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId parameter is required" },
        { status: 400 }
      );
    }

    // Verify user has permission
    const { TransportBookingService } = await import("@/lib/services/transport/booking-service");
    const bookingService = new TransportBookingService();
    const booking = await bookingService.getBooking(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const canView =
      booking.participantId === session.user.id ||
      booking.driverId === session.user.id ||
      session.user.role === "NDIA_ADMIN";

    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Not authorized to view reminders" },
        { status: 403 }
      );
    }

    const status = await reminderScheduler.getReminderStatus(bookingId);
    return NextResponse.json({ reminders: status });
  } catch (error: any) {
    logger.error("Error getting reminder status", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get reminder status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transport/notifications/reminders
 * Schedule reminders or send immediate reminder
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action; // "schedule" | "send"

    if (action === "schedule") {
      const bookingId = body.bookingId;
      if (!bookingId) {
        return NextResponse.json(
          { error: "bookingId is required" },
          { status: 400 }
        );
      }

      await reminderScheduler.scheduleReminders(bookingId);
      return NextResponse.json({ success: true });
    }

    if (action === "send") {
      const { bookingId, reminderType } = sendReminderSchema.parse(body);

      // Verify permissions (admin or system only)
      if (session.user.role !== "NDIA_ADMIN" && session.user.id !== "system") {
        return NextResponse.json(
          { error: "Forbidden: Only admin can manually send reminders" },
          { status: 403 }
        );
      }

      const result = await transportSMSNotificationService.sendReminder(
        bookingId,
        reminderType
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          messageId: result.messageId,
        });
      }

      return NextResponse.json(
        { error: result.error || "Failed to send reminder" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'schedule' or 'send'" },
      { status: 400 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error managing reminders", { error });
    return NextResponse.json(
      { error: error.message || "Failed to manage reminders" },
      { status: 500 }
    );
  }
}
