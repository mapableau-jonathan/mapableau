import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { PolicyService } from "@/lib/services/compliance/policy-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth, hasAdminOrPlanManagerAccess } from "@/lib/security/authorization-utils";
import type { PolicyCategory, PolicyStatus } from "@prisma/client";

const createPolicySchema = z.object({
  title: z.string().min(1),
  category: z.enum([
    "CORE",
    "CARE",
    "TRANSPORT",
    "WORKFORCE",
    "PRIVACY",
    "WHS",
    "OTHER",
  ]),
  version: z.string().min(1),
  content: z.record(z.unknown()),
  effectiveDate: z.string().transform((str) => new Date(str)),
  reviewDate: z.string().transform((str) => new Date(str)).optional(),
});

const updatePolicySchema = z.object({
  title: z.string().min(1).optional(),
  content: z.record(z.unknown()).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "UNDER_REVIEW"]).optional(),
  effectiveDate: z.string().transform((str) => new Date(str)).optional(),
  reviewDate: z.string().transform((str) => new Date(str)).optional(),
  nextReviewDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as PolicyCategory | null;
    const status = searchParams.get("status") as PolicyStatus | null;
    const search = searchParams.get("search") || undefined;

    const service = new PolicyService();
    const policies = await service.getPolicies({
      category: category || undefined,
      status: status || undefined,
      search,
    });

    return NextResponse.json({ policies });
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // SECURITY: Require admin or plan manager role to create policies
    // Optimized: Single function call instead of multiple try-catch blocks
    const { hasAccess, user } = await hasAdminOrPlanManagerAccess(req);

    if (!hasAccess || !user) {
      return NextResponse.json(
        { error: "Forbidden: Admin or Plan Manager access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = createPolicySchema.parse(body);

    const service = new PolicyService();
    const policy = await service.createPolicy({
      ...data,
      createdBy: user.id,
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error("Error creating policy:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin or Plan Manager access required" },
        { status: 403 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    );
  }
}
