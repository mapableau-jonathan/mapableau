/**
 * POST /api/reports/venue - Report inaccurate accessibility or misleading sponsorship
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

const reportSchema = z.object({
  businessId: z.string().cuid(),
  sponsorshipId: z.string().cuid().optional(),
  type: z.enum(["accessibility", "sponsorship"]),
  description: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = reportSchema.parse(body);

    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (data.sponsorshipId) {
      const sponsorship = await prisma.sponsorship.findFirst({
        where: {
          id: data.sponsorshipId,
          businessId: data.businessId,
        },
      });
      if (!sponsorship) {
        return NextResponse.json(
          { error: "Sponsorship not found for this business" },
          { status: 404 }
        );
      }
    }

    const report = await prisma.venueReport.create({
      data: {
        userId: session.user.id,
        businessId: data.businessId,
        sponsorshipId: data.sponsorshipId ?? null,
        type: data.type === "accessibility" ? "ACCESSIBILITY" : "SPONSORSHIP",
        description: data.description,
        status: "OPEN",
      },
    });

    return NextResponse.json({
      id: report.id,
      businessId: report.businessId,
      type: report.type,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    logger.error("Error creating venue report", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit report" },
      { status: 500 }
    );
  }
}
