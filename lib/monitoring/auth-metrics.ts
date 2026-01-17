/**
 * Authentication Metrics and Monitoring
 * Comprehensive metrics collection for authentication flows
 */

import { logger } from "@/lib/logger";

export interface AuthMetrics {
  tokenIssuance: {
    total: number;
    success: number;
    failed: number;
    averageLatency: number;
  };
  tokenValidation: {
    total: number;
    valid: number;
    invalid: number;
    expired: number;
    revoked: number;
    averageLatency: number;
  };
  tokenRevocation: {
    total: number;
    success: number;
    failed: number;
  };
  rateLimiting: {
    totalRequests: number;
    blockedRequests: number;
    topBlockedIPs: Array<{ ip: string; count: number }>;
  };
  blockchain: {
    eventsRecorded: number;
    eventsVerified: number;
    averageConfirmationTime: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

class AuthMetricsCollector {
  private metrics: Partial<AuthMetrics> = {};
  private latencyHistory: Map<string, number[]> = new Map();

  /**
   * Record token issuance metric
   */
  recordTokenIssuance(success: boolean, latency: number): void {
    if (!this.metrics.tokenIssuance) {
      this.metrics.tokenIssuance = {
        total: 0,
        success: 0,
        failed: 0,
        averageLatency: 0,
      };
    }

    this.metrics.tokenIssuance.total++;
    if (success) {
      this.metrics.tokenIssuance.success++;
    } else {
      this.metrics.tokenIssuance.failed++;
    }

    this.updateAverageLatency("tokenIssuance", latency);
  }

  /**
   * Record token validation metric
   */
  recordTokenValidation(
    result: "valid" | "invalid" | "expired" | "revoked",
    latency: number
  ): void {
    if (!this.metrics.tokenValidation) {
      this.metrics.tokenValidation = {
        total: 0,
        valid: 0,
        invalid: 0,
        expired: 0,
        revoked: 0,
        averageLatency: 0,
      };
    }

    this.metrics.tokenValidation.total++;
    this.metrics.tokenValidation[result]++;
    this.updateAverageLatency("tokenValidation", latency);
  }

  /**
   * Record token revocation metric
   */
  recordTokenRevocation(success: boolean): void {
    if (!this.metrics.tokenRevocation) {
      this.metrics.tokenRevocation = {
        total: 0,
        success: 0,
        failed: 0,
      };
    }

    this.metrics.tokenRevocation.total++;
    if (success) {
      this.metrics.tokenRevocation.success++;
    } else {
      this.metrics.tokenRevocation.failed++;
    }
  }

  /**
   * Record rate limit event
   */
  recordRateLimit(ip: string, blocked: boolean): void {
    if (!this.metrics.rateLimiting) {
      this.metrics.rateLimiting = {
        totalRequests: 0,
        blockedRequests: 0,
        topBlockedIPs: [],
      };
    }

    this.metrics.rateLimiting.totalRequests++;
    if (blocked) {
      this.metrics.rateLimiting.blockedRequests++;
      // Track blocked IPs
      const ipEntry = this.metrics.rateLimiting.topBlockedIPs.find(
        (e) => e.ip === ip
      );
      if (ipEntry) {
        ipEntry.count++;
      } else {
        this.metrics.rateLimiting.topBlockedIPs.push({ ip, count: 1 });
      }
    }
  }

  /**
   * Record blockchain event
   */
  recordBlockchainEvent(verified: boolean, confirmationTime?: number): void {
    if (!this.metrics.blockchain) {
      this.metrics.blockchain = {
        eventsRecorded: 0,
        eventsVerified: 0,
        averageConfirmationTime: 0,
      };
    }

    this.metrics.blockchain.eventsRecorded++;
    if (verified) {
      this.metrics.blockchain.eventsVerified++;
    }

    if (confirmationTime) {
      this.updateAverageLatency("blockchain", confirmationTime);
    }
  }

  /**
   * Record error
   */
  recordError(errorType: string): void {
    if (!this.metrics.errors) {
      this.metrics.errors = {
        total: 0,
        byType: {},
      };
    }

    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] =
      (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  /**
   * Update average latency
   */
  private updateAverageLatency(metric: string, latency: number): void {
    if (!this.latencyHistory.has(metric)) {
      this.latencyHistory.set(metric, []);
    }

    const history = this.latencyHistory.get(metric)!;
    history.push(latency);

    // Keep only last 100 measurements
    if (history.length > 100) {
      history.shift();
    }

    const average =
      history.reduce((sum, val) => sum + val, 0) / history.length;

    if (metric === "tokenIssuance" && this.metrics.tokenIssuance) {
      this.metrics.tokenIssuance.averageLatency = average;
    } else if (metric === "tokenValidation" && this.metrics.tokenValidation) {
      this.metrics.tokenValidation.averageLatency = average;
    } else if (metric === "blockchain" && this.metrics.blockchain) {
      this.metrics.blockchain.averageConfirmationTime = average;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): Partial<AuthMetrics> {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  resetMetrics(): void {
    this.metrics = {};
    this.latencyHistory.clear();
  }

  /**
   * Export metrics for monitoring systems (Prometheus format)
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    if (this.metrics.tokenIssuance) {
      lines.push(
        `# HELP auth_token_issuance_total Total token issuance requests`
      );
      lines.push(`# TYPE auth_token_issuance_total counter`);
      lines.push(
        `auth_token_issuance_total ${this.metrics.tokenIssuance.total}`
      );
      lines.push(
        `auth_token_issuance_success ${this.metrics.tokenIssuance.success}`
      );
      lines.push(
        `auth_token_issuance_failed ${this.metrics.tokenIssuance.failed}`
      );
      lines.push(
        `auth_token_issuance_latency_seconds ${
          this.metrics.tokenIssuance.averageLatency / 1000
        }`
      );
    }

    if (this.metrics.tokenValidation) {
      lines.push(`# HELP auth_token_validation_total Total token validations`);
      lines.push(`# TYPE auth_token_validation_total counter`);
      lines.push(
        `auth_token_validation_total ${this.metrics.tokenValidation.total}`
      );
      lines.push(
        `auth_token_validation_valid ${this.metrics.tokenValidation.valid}`
      );
      lines.push(
        `auth_token_validation_invalid ${this.metrics.tokenValidation.invalid}`
      );
    }

    return lines.join("\n");
  }
}

// Singleton instance
export const authMetricsCollector = new AuthMetricsCollector();

// Export metrics endpoint data
export function getMetricsEndpointData(): {
  metrics: Partial<AuthMetrics>;
  prometheus: string;
} {
  return {
    metrics: authMetricsCollector.getMetrics(),
    prometheus: authMetricsCollector.exportPrometheusMetrics(),
  };
}
