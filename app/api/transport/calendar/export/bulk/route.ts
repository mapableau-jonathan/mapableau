/**
 * Bulk Export Transport Bookings as iCalendar
 * POST /api/transport/calendar/export/bulk
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { transportCalendarIntegrationService } from "@/lib/services/transport/calendar-integration-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const bulkExportSchema = z.object({
  bookingIds: z.array(z.string()).min(1).max(50),
});

/**
 * POST /api/transport/calendar/export/bulk
 * Export multiple bookings as single .ics file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingIds } = bulkExportSchema.parse(body);

    // Verify user has permission for all bookings
    const { TransportBookingService } = await import("@/lib/services/transport/booking-service");
    const bookingService = new TransportBookingService();

    for (const bookingId of bookingIds) {
      const booking = await bookingService.getBooking(bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: `Booking ${bookingId} not found` },
          { status: 404 }
        );
      }

      const canExport =
        booking.participantId === session.user.id ||
        booking.driverId === session.user.id ||
        session.user.role === "NDIA_ADMIN";

      if (!canExport) {
        return NextResponse.json(
          { error: `Not authorized to export booking ${bookingId}` },
          { status: 403 }
        );
      }
    }

    const exportData = await transportCalendarIntegrationService.exportMultipleBookingsAsICal(bookingIds);

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error bulk exporting bookings as iCal", { error });
    return NextResponse.json(
      { error: error.message || "Failed to export bookings" },
      { status: 500 }
    );
  }
}
