/**
 * Google Calendar Events API
 * POST /api/calendar/google/events - Create event in Google Calendar
 * GET /api/calendar/google/events - List events from Google Calendar
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GoogleCalendarAdapter } from "@/lib/services/communication/adapters/google-calendar-adapter";
import { CalendarEvent } from "@/lib/services/communication/ical-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createEventSchema = z.object({
  event: z.object({
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    attendees: z.array(z.object({
      name: z.string(),
      email: z.string().email(),
    })).optional(),
  }),
  accessToken: z.string(),
  calendarId: z.string().optional(),
});

/**
 * POST /api/calendar/google/events
 * Create event in Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { event, accessToken, calendarId } = createEventSchema.parse(body);

    const adapter = new GoogleCalendarAdapter();

    const calendarEvent: CalendarEvent = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      attendees: event.attendees,
      status: "CONFIRMED",
    };

    const result = await adapter.createEvent(calendarEvent, accessToken, calendarId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create Google Calendar event" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventId: result.messageId,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error creating Google Calendar event", { error });
    return NextResponse.json(
      { error: error.message || "Failed to create Google Calendar event" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/google/events
 * List events from Google Calendar
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken");
    const calendarId = searchParams.get("calendarId") || "primary";
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    if (!accessToken) {
      return NextResponse.json(
        { error: "accessToken query parameter is required" },
        { status: 400 }
      );
    }

    const adapter = new GoogleCalendarAdapter();

    const result = await adapter.fetchEvents(
      accessToken,
      calendarId,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch Google Calendar events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: result.event,
    });
  } catch (error: any) {
    logger.error("Error fetching Google Calendar events", { error });
    return NextResponse.json(
      { error: error.message || "Failed to fetch Google Calendar events" },
      { status: 500 }
    );
  }
}
