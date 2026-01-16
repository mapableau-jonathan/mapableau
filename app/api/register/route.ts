import { hash } from "argon2";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRegisterData } from "@/lib/auth-utils";
import { createPostHandler } from "@/lib/api/route-handler";
import { createdResponse, errorResponse } from "@/lib/utils/response";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

/**
 * Elegant registration API route
 * Uses route handler utilities for cleaner code
 */
export const POST = createPostHandler(
  async (request) => {
    // Body is already validated by route handler
    const { email, password, name } = await request.json();

    // Additional validation using shared utilities
    const validation = validateRegisterData({ email, password, name });
    if (!validation.valid) {
      return errorResponse(
        validation.errors[0]?.message || "Invalid input",
        400
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }, // Only select id for efficiency
    });

    if (existing) {
      return errorResponse("Registration failed", 400);
    }

    // Hash password and create user
    const passwordHash = await hash(password);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
      select: { id: true }, // Only return id
    });

    return createdResponse({ id: user.id });
  },
  registerSchema,
  {
    rateLimit: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
    maxBodySize: 10 * 1024,
  }
);
