import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { RiskService } from "@/lib/services/compliance/risk-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { RiskLevel, RiskStatus } from "@prisma/client";

const createRiskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  category: z.string().min(1),
  participantId: z.string().optional(),
  owner: z.string().optional(),
  mitigationPlan: z.string().optional(),
  mitigationDate: z.string().transform((str) => new Date(str)).optional(),
  reviewDate: z.string().transform((str) => new Date(str)).optional(),
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
    const riskLevel = searchParams.get("riskLevel") as RiskLevel | null;
    const status = searchParams.get("status") as RiskStatus | null;
    const category = searchParams.get("category") || undefined;
    const participantId = searchParams.get("participantId") || undefined;

    const service = new RiskService();
    const risks = await service.getRisks({
      riskLevel: riskLevel || undefined,
      status: status || undefined,
      category,
      participantId,
    });

    return NextResponse.json({ risks });
  } catch (error) {
    console.error("Error fetching risks:", error);
    return NextResponse.json(
      { error: "Failed to fetch risks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = createRiskSchema.parse(body);

    const service = new RiskService();
    const risk = await service.createRisk({
      ...data,
      identifiedBy: session.user.id,
    });

    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    console.error("Error creating risk:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create risk" },
      { status: 500 }
    );
  }
}
