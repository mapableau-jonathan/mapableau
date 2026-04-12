import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// import {
//   mapPrismaOutletToProvider,
//   providerOutletFinderInclude,
// } from "@/lib/provider-finder-map";

/** Single outlet by id (for profile deep links). */
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const outlet = await prisma.providerOutlet.findFirst({
      where: {
        id,
        isActive: true,
        provider: { isActive: true },
      },
      // include: providerOutletFinderInclude,
    });

    if (!outlet) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const provider = 2 as any;
    if (!provider) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ provider });
  } catch (err) {
    console.error("provider-finder outlet:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
