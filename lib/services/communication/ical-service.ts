/**
 * iCalendar Service
 * Generates and parses iCalendar (.ics) files for calendar integration
 */

export interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    rsvp?: boolean;
    role?: "REQ-PARTICIPANT" | "OPT-PARTICIPANT" | "CHAIR";
  }>;
  uid?: string;
  status?: "TENTATIVE" | "CONFIRMED" | "CANCELLED";
  url?: string;
  reminders?: Array<{
    minutes: number;
    method: "EMAIL" | "DISPLAY" | "AUDIO";
  }>;
}

/**
 * Escape text for iCalendar format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Format date for iCalendar (UTC format)
 */
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Format date-time for iCalendar
 */
function formatICalDateTime(date: Date): string {
  return formatICalDate(date);
}

/**
 * Generate iCalendar content from event data
 */
export function generateICalendar(event: CalendarEvent): string {
  const lines: string[] = [];
  
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//MapAble//Transport Booking//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:REQUEST");
  lines.push("BEGIN:VEVENT");

  // UID (unique identifier)
  const uid = event.uid || `transport-booking-${Date.now()}@mapable.com`;
  lines.push(`UID:${uid}`);

  // DTSTAMP (when this calendar event was created)
  lines.push(`DTSTAMP:${formatICalDateTime(new Date())}`);

  // DTSTART (event start time)
  lines.push(`DTSTART:${formatICalDateTime(event.startTime)}`);

  // DTEND (event end time)
  lines.push(`DTEND:${formatICalDateTime(event.endTime)}`);

  // SUMMARY (event title)
  lines.push(`SUMMARY:${escapeICalText(event.summary)}`);

  // DESCRIPTION
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  // LOCATION
  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  // STATUS
  if (event.status) {
    lines.push(`STATUS:${event.status}`);
  } else {
    lines.push("STATUS:CONFIRMED");
  }

  // ORGANIZER
  if (event.organizer) {
    const organizer = `ORGANIZER;CN="${escapeICalText(event.organizer.name)}":mailto:${event.organizer.email}`;
    lines.push(organizer);
  }

  // ATTENDEES
  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      const rsvp = attendee.rsvp !== false ? ";RSVP=TRUE" : ";RSVP=FALSE";
      const role = attendee.role ? `;ROLE=${attendee.role}` : "";
      const attendeeLine = `ATTENDEE;CN="${escapeICalText(attendee.name)}";CUTYPE=INDIVIDUAL${rsvp}${role}:mailto:${attendee.email}`;
      lines.push(attendeeLine);
    }
  }

  // URL
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  // REMINDERS (VALARM)
  if (event.reminders && event.reminders.length > 0) {
    for (const reminder of event.reminders) {
      lines.push("BEGIN:VALARM");
      lines.push(`ACTION:${reminder.method}`);
      lines.push(`TRIGGER:-PT${reminder.minutes}M`);
      if (reminder.method === "EMAIL") {
        lines.push(`DESCRIPTION:${escapeICalText(event.summary)}`);
      } else {
        lines.push(`DESCRIPTION:Reminder: ${escapeICalText(event.summary)}`);
      }
      lines.push("END:VALARM");
    }
  }

  // Default reminder (15 minutes before)
  if (!event.reminders || event.reminders.length === 0) {
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push("TRIGGER:-PT15M");
    lines.push(`DESCRIPTION:Reminder: ${escapeICalText(event.summary)}`);
    lines.push("END:VALARM");
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Parse iCalendar content to event data
 */
export function parseICalendar(icalContent: string): CalendarEvent | null {
  try {
    const lines = icalContent.split(/\r?\n/);
    let inEvent = false;
    let currentEvent: Partial<CalendarEvent> = {};
    let currentAlarm: any = null;
    const attendees: CalendarEvent["attendees"] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Handle line continuation (lines starting with space/tab)
      while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
        line += lines[i + 1].trim();
        i++;
      }

      if (line.startsWith("BEGIN:VEVENT")) {
        inEvent = true;
        currentEvent = {};
      } else if (line.startsWith("END:VEVENT")) {
        inEvent = false;
        if (attendees.length > 0) {
          currentEvent.attendees = attendees;
        }
        break;
      } else if (inEvent) {
        if (line.startsWith("UID:")) {
          currentEvent.uid = line.substring(4);
        } else if (line.startsWith("SUMMARY:")) {
          currentEvent.summary = line.substring(8).replace(/\\([\\;,n])/g, "$1");
        } else if (line.startsWith("DESCRIPTION:")) {
          currentEvent.description = line.substring(12).replace(/\\([\\;,n])/g, "$1");
        } else if (line.startsWith("LOCATION:")) {
          currentEvent.location = line.substring(9).replace(/\\([\\;,n])/g, "$1");
        } else if (line.startsWith("DTSTART:")) {
          const dateStr = line.substring(8);
          currentEvent.startTime = parseICalDate(dateStr);
        } else if (line.startsWith("DTEND:")) {
          const dateStr = line.substring(6);
          currentEvent.endTime = parseICalDate(dateStr);
        } else if (line.startsWith("STATUS:")) {
          const status = line.substring(7) as CalendarEvent["status"];
          currentEvent.status = status;
        } else if (line.startsWith("ORGANIZER")) {
          const match = line.match(/CN="([^"]+)":mailto:([^\s]+)/);
          if (match) {
            currentEvent.organizer = {
              name: match[1],
              email: match[2],
            };
          }
        } else if (line.startsWith("ATTENDEE")) {
          const match = line.match(/CN="([^"]+)":mailto:([^\s]+)/);
          if (match) {
            attendees.push({
              name: match[1],
              email: match[2],
            });
          }
        } else if (line.startsWith("URL:")) {
          currentEvent.url = line.substring(4);
        }
      }
    }

    if (currentEvent.summary && currentEvent.startTime && currentEvent.endTime) {
      return currentEvent as CalendarEvent;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse iCalendar date string to Date object
 */
function parseICalDate(dateStr: string): Date {
  // Remove timezone info if present
  const cleanDate = dateStr.replace(/Z$/, "");
  
  // Format: YYYYMMDDTHHMMSS or YYYYMMDD
  if (cleanDate.includes("T")) {
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1;
    const day = parseInt(cleanDate.substring(6, 8));
    const hour = parseInt(cleanDate.substring(9, 11) || "0");
    const minute = parseInt(cleanDate.substring(11, 13) || "0");
    const second = parseInt(cleanDate.substring(13, 15) || "0");
    
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  } else {
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1;
    const day = parseInt(cleanDate.substring(6, 8));
    
    return new Date(Date.UTC(year, month, day));
  }
}

/**
 * Generate calendar invite for transport booking
 */
export function generateTransportBookingCalendar(
  booking: {
    bookingNumber: string;
    participantName: string;
    participantEmail: string;
    pickupLocation: { address: string };
    dropoffLocation: { address: string };
    scheduledPickupTime: Date;
    scheduledDropoffTime?: Date;
    serviceType: string;
    accessibilityRequirements?: string[];
    notes?: string;
  },
  organizerEmail?: string
): CalendarEvent {
  const duration = booking.scheduledDropoffTime
    ? Math.round((booking.scheduledDropoffTime.getTime() - booking.scheduledPickupTime.getTime()) / (1000 * 60))
    : 60; // Default 1 hour

  const endTime = booking.scheduledDropoffTime || new Date(booking.scheduledPickupTime.getTime() + duration * 60 * 1000);

  const summary = `Transport Booking ${booking.bookingNumber}`;
  
  const description = [
    `Service Type: ${booking.serviceType}`,
    `From: ${booking.pickupLocation.address}`,
    `To: ${booking.dropoffLocation.address}`,
    ...(booking.accessibilityRequirements && booking.accessibilityRequirements.length > 0
      ? [`Accessibility Requirements: ${booking.accessibilityRequirements.join(", ")}`]
      : []),
    ...(booking.notes ? [`Notes: ${booking.notes}`] : []),
  ].join("\\n");

  const location = booking.pickupLocation.address;

  return {
    summary,
    description,
    location,
    startTime: booking.scheduledPickupTime,
    endTime,
    organizer: organizerEmail
      ? {
          name: "MapAble Transport",
          email: organizerEmail,
        }
      : undefined,
    attendees: [
      {
        name: booking.participantName,
        email: booking.participantEmail,
        rsvp: true,
        role: "REQ-PARTICIPANT",
      },
    ],
    uid: `transport-${booking.bookingNumber}@mapable.com`,
    status: "CONFIRMED",
    reminders: [
      { minutes: 30, method: "EMAIL" },
      { minutes: 15, method: "DISPLAY" },
    ],
  };
}
