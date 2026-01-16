/**
 * Elegant response utilities
 * Consistent API response formatting
 */

import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

/**
 * Success response
 */
export function successResponse<T>(
  data: T,
  status = 200,
  meta?: ApiResponse<T>["meta"]
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      data,
      ...(meta && { meta }),
    },
    { status }
  );
}

/**
 * Created response (201)
 */
export function createdResponse<T>(
  data: T,
  meta?: ApiResponse<T>["meta"]
): NextResponse<ApiResponse<T>> {
  return successResponse(data, 201, meta);
}

/**
 * Error response
 */
export function errorResponse(
  error: string,
  status = 400,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiResponse<T[]>> {
  return successResponse(data, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
