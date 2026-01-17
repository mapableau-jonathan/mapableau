/**
 * MapAble Core - Support API
 * GET /api/core/support/tickets - Get user support tickets
 * POST /api/core/support/tickets - Create support ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supportService } from "@/lib/services/core";
import {
  SupportTicketCategory,
  SupportTicketPriority,
  ServiceType,
} from "@prisma/client";
import { logger } from "@/lib/logger";

const createTicketSchema = z.object({
  serviceType: z.nativeEnum(ServiceType).optional(),
  category: z.nativeEnum(SupportTicketCategory),
  priority: z.nativeEnum(SupportTicketPriority).optional(),
  subject: z.string().min(1),
  description: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const serviceType = searchParams.get("serviceType");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const tickets = await supportService.getUserTickets(session.user.id, {
      ...(status && { status: status as any }),
      ...(category && { category: category as SupportTicketCategory }),
      ...(serviceType && { serviceType: serviceType as ServiceType }),
      ...(limit && { limit: parseInt(limit) }),
      ...(offset && { offset: parseInt(offset) }),
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    logger.error("Failed to get support tickets", error);
    return NextResponse.json(
      { error: "Failed to get support tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createTicketSchema.parse(body);

    const ticket = await supportService.createTicket({
      userId: session.user.id,
      serviceType: data.serviceType,
      category: data.category,
      priority: data.priority,
      subject: data.subject,
      description: data.description,
      metadata: data.metadata,
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to create support ticket", error);
    return NextResponse.json(
      { error: "Failed to create support ticket" },
      { status: 500 }
    );
  }
}
