/**
 * Import Calendar Event as Transport Booking
 * POST /api/transport/calendar/import
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { transportCalendarIntegrationService } from "@/lib/services/transport/calendar-integration-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const importCalendarSchema = z.object({
  icalContent: z.string().min(1),
  participantId: z.string().optional(),
});

/**
 * POST /api/transport/calendar/import
 * Import calendar event (.ics file content) and create transport booking
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { icalContent, participantId } = importCalendarSchema.parse(body);

    // Use provided participantId or session user's ID
    const targetParticipantId = participantId || session.user.id;

    // Verify user can create bookings for this participant
    if (participantId && participantId !== session.user.id && session.user.role !== "NDIA_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Cannot create bookings for other participants" },
        { status: 403 }
      );
    }

    const result = await transportCalendarIntegrationService.importCalendarEvent(
      icalContent,
      targetParticipantId
    );

    if (result.bookingId) {
      return NextResponse.json({
        success: true,
        bookingId: result.bookingId,
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: result.error || "Failed to import calendar event" },
      { status: 400 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error importing calendar event", { error });
    return NextResponse.json(
      { error: error.message || "Failed to import calendar event" },
      { status: 500 }
    );
  }
}
