/**
 * Ad Campaign Management API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/security/authorization-utils";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { Decimal } from "@prisma/client/runtime/library";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  advertiserId: z.string(),
  biddingStrategy: z.enum(["CPC", "CPM", "CPA", "TARGET_CPA", "MAXIMIZE_CONVERSIONS"]).optional(),
  maxBid: z.number().positive().optional(),
  totalBudget: z.number().positive(),
  dailyBudget: z.number().positive().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  frequencyCapping: z.number().int().positive().optional(),
  deviceTargeting: z.array(z.enum(["mobile", "desktop", "tablet"])).optional(),
  geoTargeting: z.record(z.any()).optional(),
  contextualTargeting: z.record(z.any()).optional(),
  audienceTargeting: z.record(z.any()).optional(),
  targetCategories: z.array(z.string()).optional(),
  targetKeywords: z.array(z.string()).optional(),
  dayParting: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const data = createCampaignSchema.parse(body);

    // Verify advertiser ownership
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: data.advertiserId },
    });

    if (!advertiser || advertiser.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: Advertiser not found or access denied" },
        { status: 403 }
      );
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: user.id,
        advertiserId: data.advertiserId,
        biddingStrategy: data.biddingStrategy || "CPC",
        maxBid: data.maxBid ? new Decimal(data.maxBid) : undefined,
        totalBudget: new Decimal(data.totalBudget),
        dailyBudget: data.dailyBudget ? new Decimal(data.dailyBudget) : undefined,
        startDate: data.startDate,
        endDate: data.endDate,
        frequencyCapping: data.frequencyCapping,
        deviceTargeting: data.deviceTargeting || [],
        geoTargeting: data.geoTargeting,
        contextualTargeting: data.contextualTargeting,
        audienceTargeting: data.audienceTargeting,
        targetCategories: data.targetCategories || [],
        targetKeywords: data.targetKeywords || [],
        dayParting: data.dayParting,
        status: "DRAFT",
        spentAmount: new Decimal(0),
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error creating campaign", error);
    return NextResponse.json(
      { error: error.message || "Failed to create campaign" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const advertiserId = searchParams.get("advertiserId");

    if (!advertiserId) {
      return NextResponse.json(
        { error: "advertiserId parameter required" },
        { status: 400 }
      );
    }

    // Verify advertiser ownership
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser || advertiser.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: Advertiser not found or access denied" },
        { status: 403 }
      );
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: { advertiserId },
      include: {
        advertisements: {
          select: {
            id: true,
            title: true,
            status: true,
            currentImpressions: true,
            currentClicks: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    logger.error("Error fetching campaigns", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
