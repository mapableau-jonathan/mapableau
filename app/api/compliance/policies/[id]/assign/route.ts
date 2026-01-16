import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { PolicyService } from "@/lib/services/compliance/policy-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const assignSchema = z.object({
  userIds: z.array(z.string()),
});

export async function POST(
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
    const { userIds } = assignSchema.parse(body);

    const service = new PolicyService();
    const assignments = await service.assignPolicy(
      params.id,
      userIds,
      session.user.id
    );

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Error assigning policy:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to assign policy" },
      { status: 500 }
    );
  }
}
