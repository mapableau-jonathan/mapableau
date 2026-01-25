/**
 * Export Calendar Events as ICS
 * GET /api/calendar/export/ics
 * POST /api/calendar/export/ics
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCommunicationService } from "@/lib/services/communication/communication-factory";
import { CalendarEvent } from "@/lib/services/communication/ical-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const exportSchema = z.object({
  events: z.array(z.object({
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    attendees: z.array(z.object({
      name: z.string(),
      email: z.string().email(),
    })).optional(),
  })),
  provider: z.enum(["google", "outlook", "icalendar"]).optional(),
  filename: z.string().optional(),
});

/**
 * POST /api/calendar/export/ics
 * Export calendar events as ICS file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { events, provider, filename } = exportSchema.parse(body);

    const commService = getCommunicationService();

    // Convert events to CalendarEvent format
    const calendarEvents: CalendarEvent[] = events.map((e) => ({
      summary: e.summary,
      description: e.description,
      location: e.location,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      attendees: e.attendees,
      status: "CONFIRMED",
    }));

    const result = await commService.exportCalendar({
      event: calendarEvents.length === 1 ? calendarEvents[0] : calendarEvents,
      filename,
    });

    if (!result.success || !result.icalContent) {
      return NextResponse.json(
        { error: result.error || "Failed to export calendar" },
        { status: 500 }
      );
    }

    return new NextResponse(result.icalContent, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="${result.filename || `calendar-${Date.now()}.ics`}"`,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error exporting calendar as ICS", { error });
    return NextResponse.json(
      { error: error.message || "Failed to export calendar" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/export/ics?events=...
 * Simple GET endpoint for ICS export (limited functionality)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "Please use POST method for calendar export" },
    { status: 405 }
  );
}
