/**
 * Base Service Class
 * Provides standardized error handling, logging, and validation patterns
 * for all service classes
 */

import { logger } from "@/lib/logger";

/**
 * Base Service
 * Abstract base class that provides common service utilities
 * Services can extend this class or use its static methods
 */
export abstract class BaseService {
  /**
   * Handle service errors consistently
   * @param error - The error that occurred
   * @param context - Service context (e.g., "PaymentService")
   * @param operation - Operation name (e.g., "processPayment")
   * @returns Never returns (throws error)
   */
  protected handleError(
    error: unknown,
    context: string,
    operation: string
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in ${context}.${operation}`, {
      error: errorMessage,
      context,
      operation,
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error instanceof Error
      ? error
      : new Error(`Failed to ${operation}: ${errorMessage}`);
  }

  /**
   * Validate required fields in data object
   * @param data - Data object to validate
   * @param fields - Array of required field names
   * @throws Error if any required field is missing
   */
  protected validateRequired<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): void {
    const missing: string[] = [];

    for (const field of fields) {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        missing.push(String(field));
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`);
    }
  }

  /**
   * Log operation for debugging and monitoring
   * @param operation - Operation name
   * @param metadata - Additional metadata to log
   */
  protected logOperation(operation: string, metadata?: Record<string, any>): void {
    logger.info(`Service operation: ${operation}`, {
      operation,
      ...metadata,
    });
  }

  /**
   * Log warning for non-critical issues
   * @param message - Warning message
   * @param metadata - Additional metadata
   */
  protected logWarning(message: string, metadata?: Record<string, any>): void {
    logger.warn(message, metadata);
  }

  /**
   * Log error with context
   * @param message - Error message
   * @param error - Error object or message
   * @param metadata - Additional metadata
   */
  protected logError(
    message: string,
    error: unknown,
    metadata?: Record<string, any>
  ): void {
    logger.error(message, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...metadata,
    });
  }

  /**
   * Validate email format
   * @param email - Email address to validate
   * @returns True if valid email format
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate and sanitize string input
   * @param input - String to validate
   * @param maxLength - Maximum allowed length
   * @param fieldName - Field name for error messages
   * @returns Sanitized string
   * @throws Error if validation fails
   */
  protected validateString(
    input: unknown,
    maxLength: number = 1000,
    fieldName: string = "input"
  ): string {
    if (typeof input !== "string") {
      throw new Error(`${fieldName} must be a string`);
    }

    if (input.length > maxLength) {
      throw new Error(`${fieldName} exceeds maximum length of ${maxLength}`);
    }

    return input.trim();
  }

  /**
   * Validate and sanitize number input
   * @param input - Number to validate
   * @param min - Minimum value (optional)
   * @param max - Maximum value (optional)
   * @param fieldName - Field name for error messages
   * @returns Validated number
   * @throws Error if validation fails
   */
  protected validateNumber(
    input: unknown,
    min?: number,
    max?: number,
    fieldName: string = "number"
  ): number {
    const num = typeof input === "number" ? input : Number(input);

    if (isNaN(num)) {
      throw new Error(`${fieldName} must be a valid number`);
    }

    if (min !== undefined && num < min) {
      throw new Error(`${fieldName} must be at least ${min}`);
    }

    if (max !== undefined && num > max) {
      throw new Error(`${fieldName} must be at most ${max}`);
    }

    return num;
  }

  /**
   * Validate date input
   * @param input - Date to validate
   * @param fieldName - Field name for error messages
   * @returns Validated Date object
   * @throws Error if validation fails
   */
  protected validateDate(input: unknown, fieldName: string = "date"): Date {
    if (input instanceof Date) {
      if (isNaN(input.getTime())) {
        throw new Error(`${fieldName} must be a valid date`);
      }
      return input;
    }

    if (typeof input === "string" || typeof input === "number") {
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        throw new Error(`${fieldName} must be a valid date`);
      }
      return date;
    }

    throw new Error(`${fieldName} must be a valid date`);
  }
}
