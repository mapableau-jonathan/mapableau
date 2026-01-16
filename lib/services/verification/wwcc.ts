import axios, { type AxiosInstance } from "axios";
import { BaseVerificationService } from "./base";
import type {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
} from "./base";
import type { WWCCVerificationData } from "./types";
import { providerConfig } from "../../config/verification";

export class WWCCService extends BaseVerificationService {
  private client: AxiosInstance;

  constructor() {
    super("wwcc");
    const config = providerConfig.oho;

    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      timeout: 30000,
    });
  }

  async verify(request: VerificationRequest): Promise<VerificationResponse> {
    this.validateRequest(request);

    const data = request.data as WWCCVerificationData;

    try {
      return await this.verifyWWCC(data);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  private async verifyWWCC(
    data: WWCCVerificationData
  ): Promise<VerificationResponse> {
    // Oho API expects state-specific format
    const requestBody = {
      type: "statewwc",
      state: data.state.toLowerCase(),
      identifier: data.wwccNumber,
      first_name: data.firstName,
      surname: data.lastName,
      birth_date: data.dateOfBirth,
      expiry: data.expiryDate,
    };

    // Oho API uses /api/scan endpoint
    const response = await this.retry(() =>
      this.client.post("/api/scan", requestBody)
    );

    const responseData = response.data;

    // Oho returns results via webhook, but we can check initial status
    if (responseData.status === "submitted" || responseData.request_id) {
      return {
        success: true,
        status: "IN_PROGRESS",
        providerRequestId: responseData.request_id || responseData.id,
        metadata: {
          state: data.state,
          submittedAt: new Date().toISOString(),
        },
      };
    }

    // If we get immediate result
    if (responseData.verified === true || responseData.status === "cleared") {
      const expiresAt = responseData.expiry_date
        ? new Date(responseData.expiry_date)
        : data.expiryDate
        ? new Date(data.expiryDate)
        : undefined;

      return this.createSuccessResponse(
        responseData.request_id || responseData.id,
        expiresAt,
        {
          state: data.state,
          status: responseData.status,
          cardNumber: responseData.card_number,
          expiryDate: responseData.expiry_date,
          cardType: responseData.card_type, // employee/volunteer
        }
      );
    } else if (responseData.status === "barred" || responseData.barred === true) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: "Worker is barred from working with children",
        providerResponse: responseData,
      };
    } else {
      return {
        success: false,
        status: "FAILED",
        errorMessage: responseData.reason || "WWCC verification failed",
        providerResponse: responseData,
      };
    }
  }

  async getStatus(providerRequestId: string): Promise<VerificationStatusResponse> {
    try {
      const response = await this.retry(() =>
        this.client.get(`/api/status/${providerRequestId}`)
      );

      const data = response.data;

      let status: VerificationStatusResponse["status"] = "IN_PROGRESS";

      if (data.status === "cleared" || data.verified === true) {
        status = "VERIFIED";
      } else if (data.status === "barred" || data.barred === true) {
        status = "FAILED";
      } else if (data.status === "expired") {
        status = "EXPIRED";
      } else if (data.status === "suspended") {
        status = "SUSPENDED";
      }

      return {
        status,
        providerRequestId,
        verifiedAt: data.verified_at
          ? new Date(data.verified_at)
          : data.verifiedAt
          ? new Date(data.verifiedAt)
          : undefined,
        expiresAt: data.expiry_date
          ? new Date(data.expiry_date)
          : data.expiryDate
          ? new Date(data.expiryDate)
          : undefined,
        metadata: {
          state: data.state,
          cardNumber: data.card_number,
          cardType: data.card_type,
          status: data.status,
        },
        errorMessage: data.error || data.reason,
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
    try {
      const response = await this.retry(() =>
        this.client.post(`/api/recheck/${providerRequestId}`)
      );

      const data = response.data;

      if (data.verified === true || data.status === "cleared") {
        return this.createSuccessResponse(
          providerRequestId,
          data.expiry_date ? new Date(data.expiry_date) : undefined
        );
      } else {
        return {
          success: false,
          status: "FAILED",
          errorMessage: data.reason || "Recheck failed",
        };
      }
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  /**
   * Verify WWCC for a specific state
   */
  async verifyWWCC(
    state: string,
    details: WWCCVerificationData
  ): Promise<VerificationResponse> {
    const request: VerificationRequest = {
      workerId: "", // Will be set by caller
      verificationType: "WWCC",
      data: { ...details, state },
    };

    return this.verify(request);
  }
}
