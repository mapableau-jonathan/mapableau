/**
 * MapAble Core - Messaging API
 * GET /api/core/messages - Get user messages
 * POST /api/core/messages - Send message
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { messagingService } from "@/lib/services/core";
import { MessageType, MessagePriority, ServiceType } from "@prisma/client";
import { logger } from "@/lib/logger";

const createMessageSchema = z.object({
  threadId: z.string().optional(),
  type: z.nativeEnum(MessageType),
  subject: z.string().optional(),
  content: z.string().min(1),
  priority: z.nativeEnum(MessagePriority).optional(),
  serviceType: z.nativeEnum(ServiceType).optional(),
  metadata: z.record(z.unknown()).optional(),
  sendImmediately: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const serviceType = searchParams.get("serviceType");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const messages = await messagingService.getUserMessages(session.user.id, {
      ...(threadId && { threadId }),
      ...(type && { type: type as MessageType }),
      ...(status && { status: status as any }),
      ...(serviceType && { serviceType: serviceType as ServiceType }),
      ...(limit && { limit: parseInt(limit) }),
      ...(offset && { offset: parseInt(offset) }),
    });

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error("Failed to get messages", error);
    return NextResponse.json(
      { error: "Failed to get messages" },
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
    const data = createMessageSchema.parse(body);

    const message = await messagingService.sendMessage({
      userId: session.user.id,
      threadId: data.threadId,
      type: data.type,
      subject: data.subject,
      content: data.content,
      priority: data.priority,
      serviceType: data.serviceType,
      metadata: data.metadata,
      sendImmediately: data.sendImmediately,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to send message", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
