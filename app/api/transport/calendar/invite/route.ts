/**
 * Transport Calendar Invite Endpoint
 * POST /api/transport/calendar/invite
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { transportCalendarIntegrationService } from "@/lib/services/transport/calendar-integration-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const sendInviteSchema = z.object({
  bookingId: z.string(),
  recipientEmail: z.string().email().optional(),
});

/**
 * POST /api/transport/calendar/invite
 * Send calendar invite for transport booking
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, recipientEmail } = sendInviteSchema.parse(body);

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

    // Participant, admin, or system can send invites
    const canSend =
      booking.participantId === session.user.id ||
      session.user.role === "NDIA_ADMIN" ||
      session.user.id === "system";

    if (!canSend) {
      return NextResponse.json(
        { error: "Forbidden: Not authorized to send calendar invites" },
        { status: 403 }
      );
    }

    const result = await transportCalendarIntegrationService.sendCalendarInvite(
      bookingId,
      recipientEmail
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    }

    return NextResponse.json(
      { error: result.error || "Failed to send calendar invite" },
      { status: 500 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error sending calendar invite", { error });
    return NextResponse.json(
      { error: error.message || "Failed to send calendar invite" },
      { status: 500 }
    );
  }
}
