/**
 * Transport ETA Notification Endpoint
 * POST /api/transport/notifications/eta
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { transportSMSNotificationService } from "@/lib/services/transport/sms-notification-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const sendETASchema = z.object({
  bookingId: z.string(),
  currentLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

/**
 * POST /api/transport/notifications/eta
 * Send ETA notification to participant
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, currentLocation } = sendETASchema.parse(body);

    // Get booking to verify permissions
    const { TransportBookingService } = await import("@/lib/services/transport/booking-service");
    const bookingService = new TransportBookingService();
    const booking = await bookingService.getBooking(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Only driver, admin, or automated system can trigger ETA
    const isDriver = booking.driverId === session.user.id;
    const isAdmin = session.user.role === "NDIA_ADMIN";
    const isSystem = session.user.id === "system"; // For automated systems

    if (!isDriver && !isAdmin && !isSystem) {
      return NextResponse.json(
        { error: "Forbidden: Only driver or admin can send ETA notifications" },
        { status: 403 }
      );
    }

    const result = await transportSMSNotificationService.sendETANotification(
      bookingId,
      currentLocation
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    }

    return NextResponse.json(
      { error: result.error || "Failed to send ETA notification" },
      { status: 500 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error sending ETA notification", { error });
    return NextResponse.json(
      { error: error.message || "Failed to send ETA notification" },
      { status: 500 }
    );
  }
}
