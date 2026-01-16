import type { VerificationType, VerificationStatus } from "@prisma/client";

export interface VerificationRequest {
  workerId: string;
  verificationType: VerificationType;
  data: Record<string, unknown>;
  documents?: Array<{
    type: string;
    fileUrl: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface VerificationResponse {
  success: boolean;
  status: VerificationStatus;
  providerRequestId?: string;
  providerResponse?: Record<string, unknown>;
  expiresAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface VerificationStatusResponse {
  status: VerificationStatus;
  providerRequestId?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}

export abstract class BaseVerificationService {
  protected providerName: string;
  protected maxRetries: number = 3;
  protected retryDelay: number = 1000; // milliseconds

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  /**
   * Verify a worker's credentials
   */
  abstract verify(request: VerificationRequest): Promise<VerificationResponse>;

  /**
   * Get the current status of a verification
   */
  abstract getStatus(providerRequestId: string): Promise<VerificationStatusResponse>;

  /**
   * Recheck an existing verification
   */
  abstract recheck(providerRequestId: string): Promise<VerificationResponse>;

  /**
   * Retry logic with exponential backoff
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      await this.delay(this.retryDelay * (this.maxRetries - retries + 1));
      return this.retry(fn, retries - 1);
    }
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate request data
   */
  protected validateRequest(request: VerificationRequest): void {
    if (!request.workerId) {
      throw new Error("Worker ID is required");
    }
    if (!request.verificationType) {
      throw new Error("Verification type is required");
    }
  }

  /**
   * Create error response
   */
  protected createErrorResponse(
    error: unknown,
    status: VerificationStatus = "FAILED"
  ): VerificationResponse {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      status,
      errorMessage,
    };
  }

  /**
   * Create success response
   */
  protected createSuccessResponse(
    providerRequestId: string,
    expiresAt?: Date,
    metadata?: Record<string, unknown>
  ): VerificationResponse {
    return {
      success: true,
      status: "VERIFIED",
      providerRequestId,
      expiresAt,
      metadata,
    };
  }
}
