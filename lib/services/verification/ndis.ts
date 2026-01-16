import axios, { type AxiosInstance } from "axios";
import { BaseVerificationService } from "./base";
import type {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
} from "./base";
import type { NDISVerificationData } from "./types";
import { providerConfig } from "../../config/verification";

export class NDISService extends BaseVerificationService {
  private client: AxiosInstance;
  private portalCredentials: {
    username: string;
    password: string;
    employerId: string;
    portalUrl: string;
  };

  constructor() {
    super("ndis");
    const config = providerConfig.ndis;

    this.portalCredentials = {
      username: config.username,
      password: config.password,
      employerId: config.employerId,
      portalUrl: config.portalUrl,
    };

    // Create client for potential future API access
    this.client = axios.create({
      baseURL: config.portalUrl,
      timeout: 30000,
    });
  }

  async verify(request: VerificationRequest): Promise<VerificationResponse> {
    this.validateRequest(request);

    const data = request.data as NDISVerificationData;

    try {
      // Since there's no public API, we initiate the check process
      // and store the screening ID for manual verification
      return await this.initiateCheck(data);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  /**
   * Initiate NDIS worker screening check
   * Since there's no API, this creates a record for manual verification
   */
  private async initiateCheck(
    data: NDISVerificationData
  ): Promise<VerificationResponse> {
    // If screening ID is provided, we can check status
    if (data.screeningId) {
      return await this.checkPortalStatus(data.screeningId);
    }

    // Otherwise, create a pending verification record
    // The actual verification must be done through the NDIS portal
    return {
      success: true,
      status: "PENDING",
      providerRequestId: data.applicationId || `ndis-${Date.now()}`,
      metadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        employerId: data.employerId,
        requiresManualVerification: true,
        portalUrl: this.portalCredentials.portalUrl,
      },
      errorMessage:
        "NDIS verification requires manual portal verification. Please complete the check through the NDIS portal and provide the Screening ID.",
    };
  }

  /**
   * Check status via portal (simulated - actual implementation would require portal scraping or API access)
   */
  private async checkPortalStatus(
    screeningId: string
  ): Promise<VerificationResponse> {
    // In a real implementation, this would:
    // 1. Login to NDIS portal
    // 2. Query the screening database
    // 3. Return the status

    // For now, we return a status that indicates manual verification is needed
    return {
      success: true,
      status: "IN_PROGRESS",
      providerRequestId: screeningId,
      metadata: {
        screeningId,
        requiresManualVerification: true,
        message:
          "Please verify status manually through NDIS Worker Screening Database portal",
      },
    };
  }

  /**
   * Manual verification workflow
   * This is called when an admin manually verifies through the portal
   */
  async manualVerification(
    screeningId: string,
    status: "cleared" | "excluded" | "pending",
    expiresAt?: Date,
    metadata?: Record<string, unknown>
  ): Promise<VerificationResponse> {
    let verificationStatus: VerificationResponse["status"] = "PENDING";

    if (status === "cleared") {
      verificationStatus = "VERIFIED";
    } else if (status === "excluded") {
      verificationStatus = "FAILED";
    }

    return {
      success: status === "cleared",
      status: verificationStatus,
      providerRequestId: screeningId,
      expiresAt: expiresAt || this.getDefaultNDISExpiry(),
      metadata: {
        ...metadata,
        manuallyVerified: true,
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get default NDIS expiry (5 years from now)
   */
  private getDefaultNDISExpiry(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 5);
    return expiry;
  }

  async getStatus(providerRequestId: string): Promise<VerificationStatusResponse> {
    try {
      // Since there's no API, we can only return stored status
      // In a real implementation, this might query a cached database
      return {
        status: "IN_PROGRESS",
        providerRequestId,
        metadata: {
          requiresManualVerification: true,
          message:
            "NDIS status must be checked manually through the portal. Please provide the Screening ID for status lookup.",
        },
      };
    } catch (error) {
      return {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Failed to get status",
      };
    }
  }

  async recheck(providerRequestId: string): Promise<VerificationResponse> {
    // For NDIS, recheck means checking the portal again
    return this.checkPortalStatus(providerRequestId);
  }

  /**
   * Check portal status (for admin use)
   * This would require portal authentication and scraping
   */
  async checkPortalStatus(screeningId: string): Promise<VerificationResponse> {
    // This is a placeholder - actual implementation would:
    // 1. Authenticate with NDIS portal
    // 2. Query screening database
    // 3. Parse response

    // For now, return a response indicating manual check is needed
    return {
      success: false,
      status: "PENDING",
      providerRequestId: screeningId,
      metadata: {
        screeningId,
        requiresManualVerification: true,
        portalUrl: this.portalCredentials.portalUrl,
      },
      errorMessage:
        "NDIS portal verification requires manual access. Please check the NDIS Worker Screening Database portal directly.",
    };
  }
}
