/**
 * POST /api/sponsorships - Apply for sponsorship (create PENDING)
 * GET /api/sponsorships - List sponsorships (admin: all with filters; user: own)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAdmin, UserRole } from "@/lib/security/authorization-utils";
import { sponsoredMarkersConfig } from "@/lib/config/sponsored-markers";
import type { PlaceVerificationTier, SponsorshipTier } from "@prisma/client";
import { logger } from "@/lib/logger";

const applySchema = z.object({
  businessId: z.string().cuid(),
  tier: z.enum([
    "COMMUNITY_SUPPORTER",
    "FEATURED_ACCESSIBLE_VENUE",
    "ACCESSIBILITY_LEADER",
  ]),
  startAt: z.string().datetime().or(z.date()),
  endAt: z.string().datetime().optional().or(z.date().optional()),
  targetingRules: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = applySchema.parse(body);

    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      include: {
        placeVerifications: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { verifiedAt: "desc" },
          take: 1,
        },
        owner: { select: { id: true } },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Require applicant to be business owner or admin
    const isAdmin = session.user.role === UserRole.NDIA_ADMIN;
    if (business.ownerId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: "Only the business owner or admin can apply for sponsorship" },
        { status: 403 }
      );
    }

    const allowedTiers =
      sponsoredMarkersConfig.minVerificationTierForSponsorshipTier[
        data.tier as SponsorshipTier
      ];
    const verificationTier = business.placeVerifications[0]?.tier ?? null;
    if (!verificationTier || !allowedTiers.includes(verificationTier as PlaceVerificationTier)) {
      return NextResponse.json(
        {
          error: `Business must have verification tier ${allowedTiers.join(" or ")} for ${data.tier} sponsorship`,
        },
        { status: 400 }
      );
    }

    const startAt = typeof data.startAt === "string" ? new Date(data.startAt) : data.startAt;
    const endAt = data.endAt
      ? typeof data.endAt === "string"
        ? new Date(data.endAt)
        : data.endAt
      : null;

    const sponsorship = await prisma.sponsorship.create({
      data: {
        businessId: data.businessId,
        sponsorOrgId: session.user.id,
        tier: data.tier as SponsorshipTier,
        startAt,
        endAt,
        status: "PENDING",
        targetingRules: data.targetingRules ?? undefined,
      },
      include: {
        business: { select: { id: true, name: true, category: true } },
      },
    });

    return NextResponse.json({
      id: sponsorship.id,
      businessId: sponsorship.businessId,
      tier: sponsorship.tier,
      status: sponsorship.status,
      startAt: sponsorship.startAt.toISOString(),
      endAt: sponsorship.endAt?.toISOString() ?? null,
      business: sponsorship.business,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    logger.error("Error applying for sponsorship", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const businessId = searchParams.get("businessId");
    const sponsorOrgId = searchParams.get("sponsorOrgId");

    let isAdmin = false;
    try {
      await requireAdmin(request);
      isAdmin = true;
    } catch {
      // not admin
    }

    const where: Parameters<typeof prisma.sponsorship.findMany>[0]["where"] = {};
    if (!isAdmin) {
      where.sponsorOrgId = session.user.id;
    }
    if (status) {
      const valid = ["PENDING", "ACTIVE", "SUSPENDED", "ENDED"];
      if (valid.includes(status)) {
        where.status = status as "PENDING" | "ACTIVE" | "SUSPENDED" | "ENDED";
      }
    }
    if (businessId) where.businessId = businessId;
    if (sponsorOrgId && isAdmin) where.sponsorOrgId = sponsorOrgId;

    const sponsorships = await prisma.sponsorship.findMany({
      where,
      include: {
        business: { select: { id: true, name: true, category: true, verified: true } },
        sponsorOrg: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      sponsorships: sponsorships.map((s) => ({
        id: s.id,
        businessId: s.businessId,
        sponsorOrgId: s.sponsorOrgId,
        tier: s.tier,
        status: s.status,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        business: s.business,
        sponsorOrg: s.sponsorOrg,
      })),
    });
  } catch (error) {
    logger.error("Error listing sponsorships", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list" },
      { status: 500 }
    );
  }
}
