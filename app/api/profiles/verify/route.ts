import { NextResponse } from "next/server";

import { verifyClaimToken } from "@/lib/claim-verify";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL(ROUTES.providerFinder, request.url));
  }

  const payload = verifyClaimToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL(ROUTES.providerFinder, request.url));
  }

  const claimed = await prisma.claimedProvider.findUnique({
    where: { id: payload.claimedProviderId },
  });
  if (!claimed) {
    return NextResponse.redirect(new URL(ROUTES.providerFinder, request.url));
  }

  await prisma.claimedProvider.update({
    where: { id: claimed.id },
    data: { verifiedAt: new Date() },
  });

  return NextResponse.redirect(
    new URL(ROUTES.claimedProfile(claimed.slug), request.url),
  );
}
