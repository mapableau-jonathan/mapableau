/**
 * Response Helpers
 * Standardized response creation utilities
 */

import { NextResponse } from "next/server";
import { ApiResponse } from "./endpoint-utils";

/**
 * HTTP Status Codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

/**
 * Create validation error response
 */
export function validationError(
  errors: Array<{ field: string; message: string }>,
  requestId?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Validation failed",
        details: errors,
        requestId,
      },
    },
    { status: HttpStatus.BAD_REQUEST }
  );
}

/**
 * Create unauthorized error response
 */
export function unauthorizedError(message = "Authentication required", requestId?: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message,
        requestId,
      },
    },
    { status: HttpStatus.UNAUTHORIZED }
  );
}

/**
 * Create forbidden error response
 */
export function forbiddenError(message = "Access denied", requestId?: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.FORBIDDEN,
        message,
        requestId,
      },
    },
    { status: HttpStatus.FORBIDDEN }
  );
}

/**
 * Create not found error response
 */
export function notFoundError(resource = "Resource", requestId?: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.NOT_FOUND,
        message: `${resource} not found`,
        requestId,
      },
    },
    { status: HttpStatus.NOT_FOUND }
  );
}

/**
 * Create conflict error response
 */
export function conflictError(message: string, requestId?: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.CONFLICT,
        message,
        requestId,
      },
    },
    { status: HttpStatus.CONFLICT }
  );
}

/**
 * Create rate limit error response
 */
export function rateLimitError(retryAfter: number, requestId?: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: "Too many requests",
        details: { retryAfter },
        requestId,
      },
    },
    {
      status: HttpStatus.TOO_MANY_REQUESTS,
      headers: {
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

/**
 * Create internal error response
 */
export function internalError(message = "An unexpected error occurred", requestId?: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message,
        requestId,
      },
    },
    { status: HttpStatus.INTERNAL_SERVER_ERROR }
  );
}
