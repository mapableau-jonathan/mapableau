/**
 * Export Transport Booking as iCalendar
 * GET /api/transport/calendar/export/[bookingId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { transportCalendarIntegrationService } from "@/lib/services/transport/calendar-integration-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/transport/calendar/export/[bookingId]
 * Export booking as .ics file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;

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

    const canExport =
      booking.participantId === session.user.id ||
      booking.driverId === session.user.id ||
      session.user.role === "NDIA_ADMIN";

    if (!canExport) {
      return NextResponse.json(
        { error: "Forbidden: Not authorized to export this booking" },
        { status: 403 }
      );
    }

    const exportData = await transportCalendarIntegrationService.exportBookingAsICal(bookingId);

    if (!exportData) {
      return NextResponse.json(
        { error: "Failed to generate calendar file" },
        { status: 500 }
      );
    }

    return new NextResponse(exportData.icalContent, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="${exportData.filename}"`,
      },
    });
  } catch (error: any) {
    logger.error("Error exporting booking as iCal", { error });
    return NextResponse.json(
      { error: error.message || "Failed to export booking" },
      { status: 500 }
    );
  }
}
