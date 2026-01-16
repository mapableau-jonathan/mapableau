import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { PolicyService } from "@/lib/services/compliance/policy-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const service = new PolicyService();
    const policy = await service.getPolicy(params.id);

    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Error fetching policy:", error);
    return NextResponse.json(
      { error: "Failed to fetch policy" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = updatePolicySchema.parse(body);

    const service = new PolicyService();
    const policy = await service.updatePolicy(params.id, data);

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Error updating policy:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update policy" },
      { status: 500 }
    );
  }
}
