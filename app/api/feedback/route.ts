import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { FeedbackService } from "@/lib/services/feedback/feedback-service";
import { ImprovementService } from "@/lib/services/compliance/improvement-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const createFeedbackSchema = z.object({
  source: z.enum(["PARTICIPANT", "FAMILY", "WORKER", "ANONYMOUS"]),
  participantId: z.string().optional(),
  workerId: z.string().optional(),
  category: z.string(),
  feedback: z.string().min(1),
  rating: z.number().min(1).max(5).optional(),
  anonymous: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = createFeedbackSchema.parse(body);

    const feedbackService = new FeedbackService();
    const feedback = await feedbackService.createFeedback(data);
    const processed = await feedbackService.processFeedback(feedback);

    // If negative feedback, create improvement record
    if (processed.sentiment === "negative" && !data.anonymous) {
      const improvementService = new ImprovementService();
      await improvementService.createImprovement({
        title: `Improvement from ${data.category} feedback`,
        description: data.feedback,
        category: data.category,
        identifiedBy: data.participantId || "system",
        priority: data.rating && data.rating <= 2 ? "HIGH" : "MEDIUM",
        source: "Feedback",
      });
    }

    return NextResponse.json(processed, { status: 201 });
  } catch (error) {
    console.error("Error creating feedback:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 }
    );
  }
}
