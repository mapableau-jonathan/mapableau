import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { PredictiveAnalyticsService } from "@/lib/services/quality/predictive-analytics";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const predictionSchema = z.object({
  type: z.enum(["incident", "care_plan", "provider", "budget", "demand"]),
  participantId: z.string().optional(),
  workerId: z.string().optional(),
  carePlanId: z.string().optional(),
  providerId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  days: z.number().optional(),
});

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
    const data = predictionSchema.parse(body);

    const predictiveService = new PredictiveAnalyticsService();

    let prediction;

    switch (data.type) {
      case "incident":
        prediction = await predictiveService.predictIncidentRisk(
          data.participantId,
          data.workerId
        );
        break;
      case "care_plan":
        if (!data.carePlanId) {
          return NextResponse.json(
            { error: "carePlanId required for care plan prediction" },
            { status: 400 }
          );
        }
        prediction = await predictiveService.predictCarePlanSuccess(
          data.carePlanId
        );
        break;
      case "provider":
        if (!data.providerId) {
          return NextResponse.json(
            { error: "providerId required for provider forecast" },
            { status: 400 }
          );
        }
        prediction = await predictiveService.forecastProviderPerformance(
          data.providerId
        );
        break;
      case "budget":
        if (!data.planId) {
          return NextResponse.json(
            { error: "planId required for budget prediction" },
            { status: 400 }
          );
        }
        prediction = await predictiveService.predictBudgetUtilization(
          data.planId
        );
        break;
      case "demand":
        if (!data.category) {
          return NextResponse.json(
            { error: "category required for demand forecast" },
            { status: 400 }
          );
        }
        prediction = await predictiveService.forecastServiceDemand(
          data.category,
          data.days
        );
        break;
      default:
        return NextResponse.json(
          { error: "Invalid prediction type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error("Error generating prediction:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate prediction" },
      { status: 500 }
    );
  }
}
