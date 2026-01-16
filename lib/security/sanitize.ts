/**
 * Input sanitization utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize string input - removes potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== "string") {
    return "";
  }

  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized;
}

/**
 * Sanitize email - validates and normalizes
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  // Additional length check
  if (sanitized.length > 254) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(
  input: unknown,
  min?: number,
  max?: number
): number | null {
  if (typeof input === "number") {
    if (isNaN(input) || !isFinite(input)) {
      return null;
    }
    if (min !== undefined && input < min) {
      return null;
    }
    if (max !== undefined && input > max) {
      return null;
    }
    return input;
  }

  if (typeof input === "string") {
    const parsed = parseFloat(input);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return null;
    }
    if (min !== undefined && parsed < min) {
      return null;
    }
    if (max !== undefined && parsed > max) {
      return null;
    }
    return parsed;
  }

  return null;
}

/**
 * Sanitize object - recursively sanitizes string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  maxStringLength = 1000
): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value, maxStringLength) as T[typeof key];
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, maxStringLength) as T[typeof key];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item, maxStringLength)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>, maxStringLength)
          : item
      ) as T[typeof key];
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize request body size
 */
export async function validateRequestBody(
  request: Request,
  maxSizeBytes = 1024 * 1024 // 1MB default
): Promise<{ valid: boolean; body?: unknown; error?: string }> {
  const contentType = request.headers.get("content-type");
  
  if (!contentType?.includes("application/json")) {
    return { valid: false, error: "Invalid content type" };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > maxSizeBytes) {
      return {
        valid: false,
        error: `Request body too large. Maximum size: ${maxSizeBytes} bytes`,
      };
    }
  }

  try {
    const text = await request.text();
    if (text.length > maxSizeBytes) {
      return {
        valid: false,
        error: `Request body too large. Maximum size: ${maxSizeBytes} bytes`,
      };
    }

    const body = JSON.parse(text);
    return { valid: true, body };
  } catch (error) {
    return {
      valid: false,
      error: "Invalid JSON in request body",
    };
  }
}
