import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { TransportBookingService } from "@/lib/services/transport/booking-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const createBookingSchema = z.object({
  participantId: z.string().min(1),
  pickupLocation: z.object({
    address: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  }),
  dropoffLocation: z.object({
    address: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  }),
  scheduledTime: z.string().transform((str) => new Date(str)),
  accessibilityRequirements: z.array(z.string()),
  passengerCount: z.number().min(1),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participantId");

    const service = new TransportBookingService();

    if (participantId) {
      const bookings = await service.getParticipantBookings(participantId);
      return NextResponse.json({ bookings });
    }

    // Return empty for now (would filter by user role in production)
    return NextResponse.json({ bookings: [] });
  } catch (error) {
    console.error("Error fetching transport bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = createBookingSchema.parse(body);

    const service = new TransportBookingService();
    const booking = await service.createBooking(data);

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Error creating transport booking:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
