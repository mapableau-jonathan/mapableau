import { hash } from "argon2";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  console.log("Registering user");
  const { email, password, name } = await req.json();
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("Name:", name);

  if (!email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  console.log("Existing user:", existing);

  // todo: return generic error so we don't leak information
  if (existing) {
    return NextResponse.json({ error: "Failed to register" }, { status: 400 });
  }

  const passwordHash = await hash(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  return NextResponse.json({ id: user.id });
}
