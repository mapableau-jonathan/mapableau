import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { JobService } from "@/lib/services/jobs/job-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const service = new JobService();
    const allJobs = await service.getJobListings({});

    // Calculate analytics
    const analytics = {
      totalJobs: allJobs.length,
      activeJobs: allJobs.filter((j: any) => j.status === "ACTIVE").length,
      byCategory: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      avgApplications: 0, // Would calculate from applications
    };

    allJobs.forEach((job: any) => {
      analytics.byCategory[job.category] =
        (analytics.byCategory[job.category] || 0) + 1;
      analytics.byType[job.jobType] = (analytics.byType[job.jobType] || 0) + 1;
    });

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching job analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
