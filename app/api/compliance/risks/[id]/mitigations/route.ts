import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { RiskService } from "@/lib/services/compliance/risk-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const createMitigationSchema = z.object({
  action: z.string().min(1),
  responsible: z.string().min(1),
  dueDate: z.string().transform((str) => new Date(str)),
  status: z.string().optional(),
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
    const data = createMitigationSchema.parse(body);

    const service = new RiskService();
    const mitigation = await service.addMitigation(params.id, data);

    return NextResponse.json(mitigation, { status: 201 });
  } catch (error) {
    console.error("Error adding mitigation:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add mitigation" },
      { status: 500 }
    );
  }
}
