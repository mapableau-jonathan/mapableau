import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ProviderRegistryService } from "@/lib/services/ndia/provider-registry";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const verifyProviderSchema = z.object({
  providerNumber: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const body = await req.json();
    const { providerNumber } = verifyProviderSchema.parse(body);

    const registryService = new ProviderRegistryService();
    const result = await registryService.verifyProvider(providerNumber);

    return NextResponse.json(result);
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

    console.error("Error verifying provider:", error);
    return NextResponse.json(
      { error: "Failed to verify provider" },
      { status: 500 }
    );
  }
}
