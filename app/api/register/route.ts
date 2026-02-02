// Force Node.js runtime (required for argon2 native module)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// #region agent log
fetch('http://127.0.0.1:7244/ingest/510e022a-f6c2-4922-b4b2-86241c2b89fa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register/route.ts:1',message:'Register route loading with argon2',data:{hasArgon2Import:true},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
// #endregion
import { hash } from "argon2";
// #region agent log
fetch('http://127.0.0.1:7244/ingest/510e022a-f6c2-4922-b4b2-86241c2b89fa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register/route.ts:8',message:'argon2 hash import attempt',data:{moduleName:'argon2'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
// #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/510e022a-f6c2-4922-b4b2-86241c2b89fa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register/route.ts:47',message:'Before argon2 hash',data:{hasPassword:!!password},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const passwordHash = await hash(password);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/510e022a-f6c2-4922-b4b2-86241c2b89fa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'register/route.ts:49',message:'After argon2 hash',data:{hasHash:!!passwordHash},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
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
