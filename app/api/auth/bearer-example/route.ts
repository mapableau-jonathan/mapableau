/**
 * Example API route protected by Passport Bearer strategy.
 * Set API_BEARER_TOKEN in env, then: GET /api/auth/bearer-example
 *   with header: Authorization: Bearer <API_BEARER_TOKEN>
 *
 * Web app auth remains NextAuth (session/OAuth). Use this pattern for
 * machine-to-machine or API token auth.
 */

import { NextResponse } from "next/server";

import { requireBearer } from "@/lib/passport";

export async function GET(request: Request) {
  const [user, err] = await requireBearer(request);
  if (err) return err;
  return NextResponse.json({
    message: "Authenticated via Passport Bearer",
    user: user?.id,
  });
}
