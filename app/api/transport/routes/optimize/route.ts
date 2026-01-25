import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { RouteOptimizerService } from "@/lib/services/transport/route-optimizer";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const optimizeRouteSchema = z.object({
  start: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  end: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  waypoints: z
    .array(
      z.object({
        address: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .optional(),
  options: z
    .object({
      prioritizeAccessibility: z.boolean().optional(),
      avoidTolls: z.boolean().optional(),
      avoidHighways: z.boolean().optional(),
      maxDetour: z.number().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const body = await req.json();
    const data = optimizeRouteSchema.parse(body);

    const optimizer = new RouteOptimizerService();
    const route = await optimizer.optimizeRoute(
      data.start,
      data.end,
      data.waypoints || [],
      data.options
    );

    return NextResponse.json({ route });
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

    console.error("Error optimizing route:", error);
    return NextResponse.json(
      { error: "Failed to optimize route" },
      { status: 500 }
    );
  }
}
