/**
 * NDIS myplace Bookings Endpoint
 * GET /api/ndis/myplace/bookings
 * POST /api/ndis/myplace/bookings
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NDISMyplaceApiService } from "@/lib/services/ndis/myplace-api-service";
import { getNDISMyplaceConfig } from "@/lib/config/ndis-myplace";
import { logger } from "@/lib/logger";

/**
 * GET /api/ndis/myplace/bookings
 * Get service bookings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getNDISMyplaceConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "NDIS myplace integration is disabled" },
        { status: 400 }
      );
    }

    const apiService = new NDISMyplaceApiService();

    const status = request.nextUrl.searchParams.get("status") || undefined;
    const fromDate = request.nextUrl.searchParams.get("fromDate") || undefined;
    const toDate = request.nextUrl.searchParams.get("toDate") || undefined;

    const bookings = await apiService.getBookings(session.user.id, {
      status,
      fromDate,
      toDate,
    });

    return NextResponse.json({ bookings });
  } catch (error: any) {
    logger.error("Error fetching bookings from myplace", { error });
    return NextResponse.json(
      { error: error.message || "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ndis/myplace/bookings
 * Create a new service booking
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getNDISMyplaceConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "NDIS myplace integration is disabled" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { providerNumber, serviceCode, bookingDate, amount, notes } = body;

    if (!providerNumber || !serviceCode || !bookingDate || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: providerNumber, serviceCode, bookingDate, amount" },
        { status: 400 }
      );
    }

    const apiService = new NDISMyplaceApiService();
    const booking = await apiService.createBooking(session.user.id, {
      providerNumber,
      serviceCode,
      bookingDate,
      amount,
      notes,
    });

    return NextResponse.json({ booking });
  } catch (error: any) {
    logger.error("Error creating booking in myplace", { error });
    return NextResponse.json(
      { error: error.message || "Failed to create booking" },
      { status: 500 }
    );
  }
}
