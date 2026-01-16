/**
 * Centralized logging service
 * Replaces console.log with structured logging
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    };

    return JSON.stringify(logEntry);
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }

    // In production, only log warn and error
    return level === "warn" || level === "error";
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized: LogContext = {};
    const sensitiveKeys = [
      "password",
      "passwordHash",
      "token",
      "secret",
      "apiKey",
      "privateKey",
      "access_token",
      "refresh_token",
    ];

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeContext(value as LogContext);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;
    const sanitized = this.sanitizeContext(context);
    const formatted = this.formatMessage("debug", message, sanitized);
    console.debug(formatted);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;
    const sanitized = this.sanitizeContext(context);
    const formatted = this.formatMessage("info", message, sanitized);
    console.info(formatted);
  }

  warn(message: string, context?: LogContext): void {
    const sanitized = this.sanitizeContext(context);
    const formatted = this.formatMessage("warn", message, sanitized);
    console.warn(formatted);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const sanitized = this.sanitizeContext(context);
    const errorContext: LogContext = {
      ...sanitized,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      } : String(error),
    };
    const formatted = this.formatMessage("error", message, errorContext);
    console.error(formatted);
  }
}

export const logger = new Logger();
