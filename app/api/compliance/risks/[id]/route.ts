import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { RiskService } from "@/lib/services/compliance/risk-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const updateRiskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z
    .enum(["IDENTIFIED", "ASSESSED", "MITIGATED", "MONITORED", "CLOSED"])
    .optional(),
  owner: z.string().optional(),
  mitigationPlan: z.string().optional(),
  mitigationDate: z.string().transform((str) => new Date(str)).optional(),
  reviewDate: z.string().transform((str) => new Date(str)).optional(),
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

    const service = new RiskService();
    const risk = await service.getRisk(params.id);

    if (!risk) {
      return NextResponse.json(
        { error: "Risk not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(risk);
  } catch (error) {
    console.error("Error fetching risk:", error);
    return NextResponse.json(
      { error: "Failed to fetch risk" },
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
    const data = updateRiskSchema.parse(body);

    const service = new RiskService();
    const risk = await service.updateRisk(params.id, data);

    return NextResponse.json(risk);
  } catch (error) {
    console.error("Error updating risk:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update risk" },
      { status: 500 }
    );
  }
}
