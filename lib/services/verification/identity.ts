import axios, { type AxiosInstance } from "axios";
import { BaseVerificationService } from "./base";
import type {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
} from "./base";
import type { IdentityVerificationData } from "./types";
import { providerConfig, verificationConfig } from "../../config/verification";

export class IdentityVerificationService extends BaseVerificationService {
  private client: AxiosInstance;
  private provider: "chandler" | "privy";

  constructor() {
    super("identity");
    this.provider = verificationConfig.identityProvider;
    const config = providerConfig[this.provider];

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

    const data = request.data as IdentityVerificationData;
    const documents = request.documents || [];

    try {
      if (this.provider === "chandler") {
        return await this.verifyWithChandler(data, documents);
      } else {
        return await this.verifyWithPrivy(data, documents);
      }
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  private async verifyWithChandler(
    data: IdentityVerificationData,
    documents: Array<{ type: string; fileUrl: string; metadata?: Record<string, unknown> }>
  ): Promise<VerificationResponse> {
    // Find document URLs
    const driversLicenceFront = documents.find(
      (d) => d.type === "drivers_licence_front"
    )?.fileUrl;
    const passport = documents.find((d) => d.type === "passport")?.fileUrl;

    const requestBody: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
    };

    if (data.documentType === "drivers_licence") {
      requestBody.state = data.state;
      requestBody.expiryDate = data.expiryDate;
      if (driversLicenceFront) {
        requestBody.documentImage = driversLicenceFront;
      }
    } else if (data.documentType === "passport") {
      if (passport) {
        requestBody.documentImage = passport;
      }
    }

    const response = await this.retry(() =>
      this.client.post("/api/v1/verify", requestBody)
    );

    const responseData = response.data;

    if (responseData.verified === true) {
      return this.createSuccessResponse(
        responseData.requestId || responseData.transactionId,
        responseData.expiryDate
          ? new Date(responseData.expiryDate)
          : undefined,
        {
          matchScore: responseData.matchScore,
          dvsVerified: responseData.dvsVerified,
          biometricVerified: responseData.biometricVerified,
        }
      );
    } else {
      return {
        success: false,
        status: "FAILED",
        errorMessage: responseData.reason || "Identity verification failed",
        providerResponse: responseData,
      };
    }
  }

  private async verifyWithPrivy(
    data: IdentityVerificationData,
    documents: Array<{ type: string; fileUrl: string; metadata?: Record<string, unknown> }>
  ): Promise<VerificationResponse> {
    const driversLicenceFront = documents.find(
      (d) => d.type === "drivers_licence_front"
    )?.fileUrl;
    const passport = documents.find((d) => d.type === "passport")?.fileUrl;

    const requestBody: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
    };

    if (data.documentType === "drivers_licence") {
      requestBody.state = data.state;
      requestBody.expiryDate = data.expiryDate;
      if (driversLicenceFront) {
        requestBody.documentImage = driversLicenceFront;
      }
    } else if (data.documentType === "passport") {
      if (passport) {
        requestBody.documentImage = passport;
      }
    }

    const response = await this.retry(() =>
      this.client.post("/api/verify", requestBody)
    );

    const responseData = response.data;

    if (responseData.status === "verified" || responseData.verified === true) {
      return this.createSuccessResponse(
        responseData.requestId || responseData.id,
        responseData.expiryDate
          ? new Date(responseData.expiryDate)
          : undefined,
        {
          confidence: responseData.confidence,
          dvsMatch: responseData.dvsMatch,
        }
      );
    } else {
      return {
        success: false,
        status: "FAILED",
        errorMessage: responseData.message || "Identity verification failed",
        providerResponse: responseData,
      };
    }
  }

  async getStatus(providerRequestId: string): Promise<VerificationStatusResponse> {
    try {
      const response = await this.retry(() =>
        this.client.get(`/api/v1/status/${providerRequestId}`)
      );

      const data = response.data;

      return {
        status: data.verified ? "VERIFIED" : data.status?.toUpperCase() || "IN_PROGRESS",
        providerRequestId,
        verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : undefined,
        expiresAt: data.expiryDate ? new Date(data.expiryDate) : undefined,
        metadata: {
          matchScore: data.matchScore,
          dvsVerified: data.dvsVerified,
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
        this.client.post(`/api/v1/recheck/${providerRequestId}`)
      );

      const data = response.data;

      if (data.verified === true) {
        return this.createSuccessResponse(
          providerRequestId,
          data.expiryDate ? new Date(data.expiryDate) : undefined
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
}
