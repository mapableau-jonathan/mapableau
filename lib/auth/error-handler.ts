/**
 * Unified Authentication Error Handler
 * Simplifies error handling across Passport and NextAuth
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export interface AuthError {
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Create standardized authentication error response
 */
export function createAuthErrorResponse(
  error: unknown,
  defaultMessage: string = "Authentication failed",
  statusCode: number = 401
): NextResponse {
  let message = defaultMessage;
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message || defaultMessage;
    code = error.name;
  } else if (typeof error === "string") {
    message = error;
  }

  // Log error for debugging (without sensitive data)
  logger.error("Authentication error", {
    message,
    code,
    statusCode,
  });

  return NextResponse.json(
    {
      error: message,
      ...(code && { code }),
    },
    { status: statusCode }
  );
}

/**
 * Create redirect response with error
 */
export function createAuthErrorRedirect(
  baseUrl: string,
  error: unknown,
  defaultMessage: string = "Authentication failed"
): NextResponse {
  let message = defaultMessage;

  if (error instanceof Error) {
    message = error.message || defaultMessage;
  } else if (typeof error === "string") {
    message = error;
  }

  // Log error
  logger.error("Authentication redirect error", { message });

  const url = new URL("/login", baseUrl);
  url.searchParams.set("error", encodeURIComponent(message));

  return NextResponse.redirect(url);
}

/**
 * Handle authentication promise with error handling
 */
export async function handleAuthPromise<T>(
  promise: Promise<T>,
  errorMessage: string = "Authentication failed"
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : errorMessage;
    logger.error("Auth promise error", error);
    return { data: null, error: message };
  }
}
