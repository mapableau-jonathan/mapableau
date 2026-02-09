import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/routes";
import { parseBody, registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, registerSchema);
  if (err) return err;

  const { email, password, name, role, suburb, state, postcode } = body;
  const displayName = (name ?? "").trim();
  const hasPlace = [suburb, state, postcode].some((v) => v != null && String(v).trim() !== "");

  const existing = await prisma.user.findUnique({
    where: { email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: displayName || null,
      email,
      passwordHash,
      ...(role === "provider" && { userType: "provider" }),
    },
  });

  if (role === "provider") {
    const baseSlug = slugify(displayName || "provider");
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    await prisma.claimedProvider.create({
      data: {
        slug,
        userId: user.id,
        name: displayName || "My practice",
        categories: [],
        onboardingStatus: "in_progress",
        ...(hasPlace && {
          suburb: suburb?.trim() || null,
          state: state?.trim() || null,
          postcode: postcode?.trim() || null,
        }),
      },
    });
  } else if (hasPlace) {
    await prisma.participantProfile.create({
      data: {
        userId: user.id,
        visibility: "private",
        suburb: suburb?.trim() || null,
        state: state?.trim() || null,
        postcode: postcode?.trim() || null,
        preferredCategories: [],
      },
    });
  }

  return NextResponse.json({ id: user.id });
}
