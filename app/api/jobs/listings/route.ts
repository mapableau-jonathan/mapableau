import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { JobService } from "@/lib/services/jobs/job-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const createJobSchema = z.object({
  employerId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.object({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  jobType: z.string(),
  category: z.string(),
  salaryRange: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    })
    .optional(),
  accessibilityRequirements: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()).optional(),
  applicationDeadline: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
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
    const category = searchParams.get("category") || undefined;
    const location = searchParams.get("location") || undefined;
    const jobType = searchParams.get("jobType") || undefined;
    const search = searchParams.get("search") || undefined;

    const service = new JobService();
    const jobs = await service.getJobListings({
      category,
      location,
      jobType,
      search,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching job listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch job listings" },
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
    const data = createJobSchema.parse(body);

    const service = new JobService();
    const job = await service.createJobListing(data);

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Error creating job listing:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create job listing" },
      { status: 500 }
    );
  }
}
