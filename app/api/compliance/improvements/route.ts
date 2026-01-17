import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ImprovementService } from "@/lib/services/compliance/improvement-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const createImprovementSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  source: z.string().optional(),
  relatedIncidentId: z.string().optional(),
  relatedComplaintId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const priority = searchParams.get("priority") || undefined;

    const service = new ImprovementService();
    const improvements = await service.getImprovements({
      status,
      category,
      priority,
    });

    return NextResponse.json({ improvements });
  } catch (error) {
    console.error("Error fetching improvements:", error);
    return NextResponse.json(
      { error: "Failed to fetch improvements" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = createImprovementSchema.parse(body);

    const service = new ImprovementService();
    const improvement = await service.createImprovement({
      ...data,
      identifiedBy: user.id,
    });

    return NextResponse.json(improvement, { status: 201 });
  } catch (error) {
    console.error("Error creating improvement:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create improvement" },
      { status: 500 }
    );
  }
}
