/**
 * Complete Transport Booking Endpoint
 * POST /api/transport/bookings/[bookingId]/complete
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TransportBookingService } from "@/lib/services/transport/booking-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const completeBookingSchema = z.object({
  actualPickupTime: z.string().transform((str) => new Date(str)),
  actualDropoffTime: z.string().transform((str) => new Date(str)),
  mileage: z.number().positive(),
  duration: z.number().positive(), // Minutes
});

const bookingService = new TransportBookingService();

/**
 * POST /api/transport/bookings/[bookingId]/complete
 * Complete transport booking with trip data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const body = await request.json();
    const tripData = completeBookingSchema.parse(body);

    // Verify user has permission (driver or admin)
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Only driver assigned to booking or admin can complete
    if (booking.driverId !== session.user.id && session.user.role !== "NDIA_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Not authorized to complete this booking" },
        { status: 403 }
      );
    }

    const completed = await bookingService.completeBooking(bookingId, {
      actualPickupTime: tripData.actualPickupTime,
      actualDropoffTime: tripData.actualDropoffTime,
      mileage: tripData.mileage,
      duration: tripData.duration,
    });

    return NextResponse.json({ booking: completed });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error completing transport booking", { error });
    return NextResponse.json(
      { error: error.message || "Failed to complete booking" },
      { status: 500 }
    );
  }
}
