/**
 * Standardized error handling middleware
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
  statusCode: number;
}

/**
 * Standard error response format
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage = "An error occurred"
): NextResponse {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    logger.warn("Validation error", { errors: error.errors });
    return NextResponse.json(
      {
        error: "Validation error",
        details: error.errors,
      },
      { status: 400 }
    );
  }

  // Known API errors
  if (error instanceof Error) {
    // Authorization errors
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Forbidden errors
    if (error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    // Not found errors
    if (error.message.includes("not found") || error.message.includes("Not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    // Log and return generic error for unknown errors
    logger.error(defaultMessage, error);
    return NextResponse.json(
      { error: defaultMessage },
      { status: 500 }
    );
  }

  // Unknown error type
  logger.error(defaultMessage, error);
  return NextResponse.json(
    { error: defaultMessage },
    { status: 500 }
  );
}

/**
 * Wrap API route handler with error handling
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}
