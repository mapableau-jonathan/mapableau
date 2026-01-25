/**
 * Transport Tracking Endpoint
 * GET /api/transport/tracking/[bookingId]
 * POST /api/transport/tracking/[bookingId] - Update tracking status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { deliveryTrackingService } from "@/lib/services/transport/delivery-tracking-service";
import { TransportBookingService } from "@/lib/services/transport/booking-service";
import { logger } from "@/lib/logger";

const bookingService = new TransportBookingService();

/**
 * GET /api/transport/tracking/[bookingId]
 * Get delivery tracking information
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

    // Verify user has permission to view tracking
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Participant, driver, or admin can view tracking
    const canView =
      booking.participantId === session.user.id ||
      booking.driverId === session.user.id ||
      session.user.role === "NDIA_ADMIN";

    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Not authorized to view tracking" },
        { status: 403 }
      );
    }

    const tracking = await deliveryTrackingService.getTracking(bookingId);
    return NextResponse.json({ tracking });
  } catch (error: any) {
    logger.error("Error getting transport tracking", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get tracking" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transport/tracking/[bookingId]
 * Update delivery status/location
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
    const { status, location, notes } = body;

    // Verify user is driver or admin
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.driverId !== session.user.id && session.user.role !== "NDIA_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only driver can update tracking" },
        { status: 403 }
      );
    }

    // Update status
    if (status) {
      await deliveryTrackingService.updateStatus({
        bookingId,
        status,
        location,
        timestamp: new Date(),
        notes,
      });
    }

    // Update location separately if provided
    if (location && booking.status === "IN_PROGRESS") {
      await deliveryTrackingService.updateDriverLocation(bookingId, location);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error updating transport tracking", { error });
    return NextResponse.json(
      { error: error.message || "Failed to update tracking" },
      { status: 500 }
    );
  }
}
