/**
 * Elegant API route handler utilities
 * Reduces boilerplate and improves consistency
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, UserRole } from "@/lib/security/authorization-utils";
import { validateRequestBody } from "@/lib/security/sanitize";
import { withRateLimit } from "@/lib/security/rate-limit";
import { createErrorResponse } from "@/lib/middleware/error-handler";
import { logger } from "@/lib/logger";

type RouteHandler<T = unknown> = (
  request: NextRequest,
  context: { user: { id: string; email: string; name?: string | null; role: string } }
) => Promise<NextResponse<T>>;

interface RouteOptions {
  /** Require authentication */
  requireAuth?: boolean;
  /** Require specific role(s) */
  requireRole?: UserRole[];
  /** Rate limiting: max requests per window */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Request body validation schema */
  schema?: z.ZodSchema;
  /** Max request body size in bytes */
  maxBodySize?: number;
}

/**
 * Elegant route handler wrapper
 * Handles common concerns: auth, validation, rate limiting, error handling
 */
export function createRouteHandler<T = unknown>(
  handler: RouteHandler<T>,
  options: RouteOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const rateLimitResponse = await withRateLimit(
          options.rateLimit.maxRequests,
          options.rateLimit.windowMs
        )(request);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // Request body validation
      if (options.schema || options.maxBodySize) {
        const maxSize = options.maxBodySize ?? 50 * 1024; // Default 50KB
        const bodyValidation = await validateRequestBody(request, maxSize);
        
        if (!bodyValidation.valid) {
          return NextResponse.json(
            { error: bodyValidation.error || "Invalid request" },
            { status: 400 }
          );
        }

        // Schema validation
        if (options.schema && bodyValidation.body) {
          try {
            bodyValidation.body = options.schema.parse(bodyValidation.body);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
              );
            }
            throw error;
          }
        }
      }

      // Authentication
      let user: { id: string; email: string; name?: string | null; role: string } | null = null;
      
      if (options.requireAuth || options.requireRole) {
        try {
          user = await requireAuth();
        } catch (error) {
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }
      }

      // Role-based authorization
      if (options.requireRole && user) {
        try {
          user = await requireRole(options.requireRole);
        } catch (error) {
          return NextResponse.json(
            { error: `Forbidden: Requires one of: ${options.requireRole.join(", ")}` },
            { status: 403 }
          );
        }
      }

      // Execute handler
      if (!user && (options.requireAuth || options.requireRole)) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      return await handler(request, { user: user! });
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

/**
 * GET route handler (simplified - no body validation)
 */
export function createGetHandler<T = unknown>(
  handler: RouteHandler<T>,
  options: Omit<RouteOptions, "schema" | "maxBodySize"> = {}
): (request: NextRequest) => Promise<NextResponse> {
  return createRouteHandler(handler, options);
}

/**
 * POST route handler (with body validation)
 */
export function createPostHandler<T = unknown>(
  handler: RouteHandler<T>,
  schema: z.ZodSchema,
  options: Omit<RouteOptions, "schema"> = {}
): (request: NextRequest) => Promise<NextResponse> {
  return createRouteHandler(handler, { ...options, schema });
}

/**
 * Extract query parameters with validation
 */
export function getQueryParams<T extends Record<string, z.ZodTypeAny>>(
  request: NextRequest,
  schema: z.ZodObject<T>
): z.infer<z.ZodObject<T>> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return schema.parse(params);
}

/**
 * Extract validated body from request
 */
export async function getValidatedBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  maxSize = 50 * 1024
): Promise<T> {
  const bodyValidation = await validateRequestBody(request, maxSize);
  
  if (!bodyValidation.valid) {
    throw new Error(bodyValidation.error || "Invalid request body");
  }

  return schema.parse(bodyValidation.body);
}
