/**
 * Security Audit Logger
 * Logs security-relevant events for monitoring and forensics
 */

import { logger } from "@/lib/logger";

export enum SecurityEventType {
  TOKEN_ISSUED = "token_issued",
  TOKEN_REVOKED = "token_revoked",
  TOKEN_REFRESHED = "token_refreshed",
  TOKEN_EXCHANGED = "token_exchanged",
  TOKEN_VALIDATION_FAILED = "token_validation_failed",
  TOKEN_BLACKLISTED = "token_blacklisted",
  AUTHENTICATION_FAILED = "authentication_failed",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  CSRF_VIOLATION = "csrf_violation",
  TOKEN_BINDING_MISMATCH = "token_binding_mismatch",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  UNAUTHORIZED_ACCESS_ATTEMPT = "unauthorized_access_attempt",
}

export interface SecurityAuditEvent {
  type: SecurityEventType;
  userId?: string;
  serviceId?: string;
  ip?: string;
  userAgent?: string;
  tokenId?: string;
  details?: Record<string, unknown>;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
}

/**
 * Log security event
 */
export function logSecurityEvent(event: Omit<SecurityAuditEvent, "timestamp">): void {
  const fullEvent: SecurityAuditEvent = {
    ...event,
    timestamp: new Date(),
  };

  // Log based on severity
  const logData = {
    event: fullEvent.type,
    severity: fullEvent.severity,
    userId: fullEvent.userId,
    serviceId: fullEvent.serviceId,
    ip: fullEvent.ip,
    userAgent: fullEvent.userAgent,
    tokenId: fullEvent.tokenId,
    details: fullEvent.details,
    timestamp: fullEvent.timestamp.toISOString(),
  };

  switch (fullEvent.severity) {
    case "critical":
    case "high":
      logger.error("Security event", logData);
      break;
    case "medium":
      logger.warn("Security event", logData);
      break;
    case "low":
      logger.info("Security event", logData);
      break;
  }

  // In production, you might also:
  // - Send to SIEM system
  // - Store in database for audit trail
  // - Trigger alerts for critical events
}

/**
 * Helper functions for common security events
 */
export const securityAudit = {
  tokenIssued: (data: {
    userId: string;
    serviceId: string;
    tokenId: string;
    ip?: string;
    userAgent?: string;
  }) => {
    logSecurityEvent({
      type: SecurityEventType.TOKEN_ISSUED,
      userId: data.userId,
      serviceId: data.serviceId,
      tokenId: data.tokenId,
      ip: data.ip,
      userAgent: data.userAgent,
      severity: "low",
    });
  },

  tokenRevoked: (data: {
    userId: string;
    serviceId: string;
    tokenId: string;
    reason?: string;
    ip?: string;
  }) => {
    logSecurityEvent({
      type: SecurityEventType.TOKEN_REVOKED,
      userId: data.userId,
      serviceId: data.serviceId,
      tokenId: data.tokenId,
      ip: data.ip,
      details: { reason: data.reason },
      severity: "medium",
    });
  },

  tokenValidationFailed: (data: {
    tokenId?: string;
    reason: string;
    ip?: string;
    userAgent?: string;
  }) => {
    logSecurityEvent({
      type: SecurityEventType.TOKEN_VALIDATION_FAILED,
      tokenId: data.tokenId,
      ip: data.ip,
      userAgent: data.userAgent,
      details: { reason: data.reason },
      severity: "medium",
    });
  },

  tokenBindingMismatch: (data: {
    userId: string;
    tokenId: string;
    expectedBinding: string;
    actualBinding: string;
    ip?: string;
  }) => {
    logSecurityEvent({
      type: SecurityEventType.TOKEN_BINDING_MISMATCH,
      userId: data.userId,
      tokenId: data.tokenId,
      ip: data.ip,
      details: {
        expectedBinding: data.expectedBinding,
        actualBinding: data.actualBinding,
      },
      severity: "high",
    });
  },

  rateLimitExceeded: (data: {
    identifier: string;
    endpoint: string;
    ip?: string;
  }) => {
    logSecurityEvent({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      ip: data.ip,
      details: {
        identifier: data.identifier,
        endpoint: data.endpoint,
      },
      severity: "medium",
    });
  },

  csrfViolation: (data: {
    endpoint: string;
    ip?: string;
    userAgent?: string;
  }) => {
    logSecurityEvent({
      type: SecurityEventType.CSRF_VIOLATION,
      ip: data.ip,
      userAgent: data.userAgent,
      details: { endpoint: data.endpoint },
      severity: "high",
    });
  },

  suspiciousActivity: (data: {
    userId?: string;
    description: string;
    ip?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }) => {
    logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId: data.userId,
      ip: data.ip,
      userAgent: data.userAgent,
      details: {
        description: data.description,
        ...data.details,
      },
      severity: "high",
    });
  },

  unauthorizedAccessAttempt: (data: {
    endpoint: string;
    method: string;
    ip?: string;
    userAgent?: string;
    reason?: string;
  }) => {
    logSecurityEvent({
      type: SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
      ip: data.ip,
      userAgent: data.userAgent,
      details: {
        endpoint: data.endpoint,
        method: data.method,
        reason: data.reason,
      },
      severity: "high",
    });
  },
};
