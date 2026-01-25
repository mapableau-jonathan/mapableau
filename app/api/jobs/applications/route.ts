import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { JobService } from "@/lib/services/jobs/job-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const createApplicationSchema = z.object({
  jobId: z.string().min(1),
  applicantId: z.string().min(1),
  coverLetter: z.string().optional(),
  resumeUrl: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const body = await req.json();
    const data = createApplicationSchema.parse(body);

    // Verify applicant is the current user
    if (data.applicantId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const service = new JobService();
    const application = await service.createApplication(data);

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating job application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const applicantId = searchParams.get("applicantId");

    const service = new JobService();

    if (jobId) {
      const applications = await service.getJobApplications(jobId);
      return NextResponse.json({ applications });
    } else if (applicantId) {
      // Verify user can access these applications
      if (applicantId !== user.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      const applications = await service.getApplicantApplications(applicantId);
      return NextResponse.json({ applications });
    } else {
      return NextResponse.json(
        { error: "jobId or applicantId required" },
        { status: 400 }
      );
    }
  } catch (error) {
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
