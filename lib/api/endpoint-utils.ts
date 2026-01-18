/**
 * Endpoint Utilities
 * Shared utilities for consistent API endpoint implementation
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { requireAuth, UserRole } from "@/lib/security/authorization-utils";
import { apiRateLimit, strictRateLimit, authRateLimit, paymentRateLimit } from "@/lib/security/rate-limit";
import crypto from "crypto";

/**
 * Request context with common utilities
 */
export interface RequestContext {
  request: NextRequest;
  user?: Awaited<ReturnType<typeof requireAuth>>;
  requestId: string;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    timestamp?: string;
    requestId?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  options?: {
    status?: number;
    meta?: ApiResponse<T>["meta"];
    requestId?: string;
  }
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options?.requestId || generateRequestId(),
      ...options?.meta,
    },
  };

  return NextResponse.json(response, { status: options?.status || 200 });
}

/**
 * Create error response
 */
export function errorResponse(
  code: string,
  message: string,
  options?: {
    status?: number;
    details?: any;
    requestId?: string;
  }
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    error: {
      code,
      message,
      details: options?.details,
      requestId: options?.requestId || generateRequestId(),
    },
  };

  return NextResponse.json(response, { status: options?.status || 400 });
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  options: {
    page: number;
    limit: number;
    total: number;
    requestId?: string;
  }
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(options.total / options.limit);

  return successResponse(data, {
    status: 200,
    meta: {
      page: options.page,
      limit: options.limit,
      total: options.total,
      totalPages,
      requestId: options.requestId,
    },
  });
}

/**
 * Rate limit type
 */
export type RateLimitType = "api" | "strict" | "auth" | "payment" | "none";

/**
 * Get rate limiter by type
 */
export function getRateLimiter(type: RateLimitType) {
  switch (type) {
    case "api":
      return apiRateLimit;
    case "strict":
      return strictRateLimit;
    case "auth":
      return authRateLimit;
    case "payment":
      return paymentRateLimit;
    case "none":
      return null;
    default:
      return apiRateLimit;
  }
}

/**
 * Endpoint handler options
 */
export interface EndpointOptions {
  rateLimit?: RateLimitType;
  requireAuth?: boolean;
  requireRoles?: UserRole[];
  validateInput?: z.ZodSchema;
  cacheControl?: string;
}

/**
 * Create endpoint handler wrapper with common functionality
 */
export function createEndpointHandler<T = any>(
  handler: (context: RequestContext, body?: any) => Promise<NextResponse<ApiResponse<T>>>,
  options: EndpointOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const context: RequestContext = {
      request,
      requestId,
    };

    try {
      // Apply rate limiting
      if (options.rateLimit && options.rateLimit !== "none") {
        const rateLimiter = getRateLimiter(options.rateLimit);
        if (rateLimiter) {
          const rateLimitResponse = await rateLimiter(request);
          if (rateLimitResponse) {
            return rateLimitResponse;
          }
        }
      }

      // Authenticate if required
      if (options.requireAuth) {
        try {
          context.user = await requireAuth(request);
        } catch (error) {
          return errorResponse(
            "UNAUTHORIZED",
            "Authentication required",
            { status: 401, requestId }
          );
        }
      }

      // Check roles if required
      if (options.requireRoles && context.user) {
        const userRole = context.user.role as UserRole;
        if (!options.requireRoles.includes(userRole)) {
          return errorResponse(
            "FORBIDDEN",
            `Requires one of: ${options.requireRoles.join(", ")}`,
            { status: 403, requestId }
          );
        }
      }

      // Parse and validate input
      let body: any = undefined;
      if (request.method !== "GET" && options.validateInput) {
        try {
          const rawBody = await request.json();
          body = options.validateInput.parse(rawBody);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return errorResponse(
              "VALIDATION_ERROR",
              "Invalid input data",
              {
                status: 400,
                details: error.errors,
                requestId,
              }
            );
          }
          throw error;
        }
      }

      // Call handler
      const response = await handler(context, body);

      // Add cache control headers if specified
      if (options.cacheControl) {
        response.headers.set("Cache-Control", options.cacheControl);
      }

      // Add request ID header
      response.headers.set("X-Request-ID", requestId);

      // Note: Request ID is already included in response body by handler functions
      // (successResponse, errorResponse, etc. all include requestId in their responses)
      
      return response;
    } catch (error) {
      logger.error("Endpoint error", { error, requestId, path: request.nextUrl.pathname });

      // Handle known error types
      if (error instanceof Error) {
        if (error.message.includes("Unauthorized")) {
          return errorResponse("UNAUTHORIZED", error.message, { status: 401, requestId });
        }
        if (error.message.includes("Forbidden")) {
          return errorResponse("FORBIDDEN", error.message, { status: 403, requestId });
        }
        if (error.message.includes("Not found")) {
          return errorResponse("NOT_FOUND", error.message, { status: 404, requestId });
        }
      }

      // Generic error response
      return errorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        {
          status: 500,
          requestId,
        }
      );
    }
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parse pagination from query string
 */
export function parsePagination(request: NextRequest): PaginationParams {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Field selection parameters
 */
export function parseFields(request: NextRequest): string[] | undefined {
  const fields = request.nextUrl.searchParams.get("fields");
  return fields ? fields.split(",").map((f) => f.trim()) : undefined;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  order: "asc" | "desc";
}

/**
 * Parse sort from query string
 */
export function parseSort(request: NextRequest, defaultField = "createdAt"): SortParams {
  const sort = request.nextUrl.searchParams.get("sort") || defaultField;
  const [field, order] = sort.split(":");
  return {
    field: field || defaultField,
    order: (order === "desc" ? "desc" : "asc") as "asc" | "desc",
  };
}

/**
 * Filter parameters (generic)
 */
export function parseFilters(request: NextRequest): Record<string, any> {
  const filters: Record<string, any> = {};
  const searchParams = request.nextUrl.searchParams;

  // Extract filter parameters (exclude pagination, sorting, fields)
  const excludeParams = ["page", "limit", "sort", "fields", "search"];
  for (const [key, value] of searchParams.entries()) {
    if (!excludeParams.includes(key)) {
      filters[key] = value;
    }
  }

  return filters;
}
