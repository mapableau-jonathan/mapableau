import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ProviderRegistryService } from "@/lib/services/ndia/provider-registry";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";
import { prisma } from "@/lib/prisma";

const registerProviderSchema = z.object({
  providerNumber: z.string().min(1),
  serviceCategories: z.array(z.string()),
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

    const body = await registerProviderSchema.parse(await req.json());
    
    // Verify provider with NDIA
    const registryService = new ProviderRegistryService();
    const verification = await registryService.verifyProvider(body.providerNumber);

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.message || "Provider verification failed" },
        { status: 400 }
      );
    }

    // Sync provider registration
    const syncResult = await registryService.syncProviderRegistration(
      user.id,
      body.providerNumber
    );

    if (!syncResult.success) {
      return NextResponse.json(
        { error: syncResult.error || "Failed to sync provider registration" },
        { status: 500 }
      );
    }

    // Update service categories
    if (body.serviceCategories.length > 0) {
      await prisma.providerRegistration.update({
        where: { userId: user.id },
        data: {
          serviceCategories: body.serviceCategories,
        },
      });
    }

    return NextResponse.json(syncResult.registration, { status: 201 });
  } catch (error) {
    console.error("Error registering provider:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to register provider" },
      { status: 500 }
    );
  }
}
