/**
 * Outlook Calendar Events API
 * POST /api/calendar/outlook/events - Create event in Outlook Calendar
 * GET /api/calendar/outlook/events - List events from Outlook Calendar
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { OutlookCalendarAdapter } from "@/lib/services/communication/adapters/outlook-calendar-adapter";
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
 * POST /api/calendar/outlook/events
 * Create event in Outlook Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { event, accessToken, calendarId } = createEventSchema.parse(body);

    const adapter = new OutlookCalendarAdapter();

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
        { error: result.error || "Failed to create Outlook Calendar event" },
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

    logger.error("Error creating Outlook Calendar event", { error });
    return NextResponse.json(
      { error: error.message || "Failed to create Outlook Calendar event" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/outlook/events
 * List events from Outlook Calendar
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken");
    const calendarId = searchParams.get("calendarId") || "calendar";
    const startDateTime = searchParams.get("startDateTime");
    const endDateTime = searchParams.get("endDateTime");

    if (!accessToken) {
      return NextResponse.json(
        { error: "accessToken query parameter is required" },
        { status: 400 }
      );
    }

    const adapter = new OutlookCalendarAdapter();

    const result = await adapter.fetchEvents(
      accessToken,
      calendarId,
      startDateTime ? new Date(startDateTime) : undefined,
      endDateTime ? new Date(endDateTime) : undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch Outlook Calendar events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: result.event,
    });
  } catch (error: any) {
    logger.error("Error fetching Outlook Calendar events", { error });
    return NextResponse.json(
      { error: error.message || "Failed to fetch Outlook Calendar events" },
      { status: 500 }
    );
  }
}
