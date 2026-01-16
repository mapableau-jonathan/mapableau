import axios, { type AxiosInstance } from "axios";
import { BaseVerificationService } from "./base";
import type {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
} from "./base";
import type { VEVOVerificationData } from "./types";
import { providerConfig, verificationConfig } from "../../config/verification";

export class VEVOService extends BaseVerificationService {
  private client: AxiosInstance;
  private provider: "vsure" | "checkworkrights";

  constructor() {
    super("vevo");
    this.provider = verificationConfig.vevoProvider;
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

    const data = request.data as VEVOVerificationData;

    try {
      if (this.provider === "vsure") {
        return await this.verifyWithVSure(data);
      } else {
        return await this.verifyWithCheckWorkRights(data);
      }
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  private async verifyWithVSure(
    data: VEVOVerificationData
  ): Promise<VerificationResponse> {
    const requestBody = {
      passportNumber: data.passportNumber,
      dateOfBirth: data.dateOfBirth,
      firstName: data.firstName,
      lastName: data.lastName,
      visaGrantNumber: data.visaGrantNumber,
      transactionReferenceNumber: data.transactionReferenceNumber,
    };

    const response = await this.retry(() =>
      this.client.post("/api/v1/vevo/check", requestBody)
    );

    const responseData = response.data;

    if (responseData.status === "valid" || responseData.workRights === true) {
      const expiresAt = responseData.visaExpiryDate
        ? new Date(responseData.visaExpiryDate)
        : undefined;

      return this.createSuccessResponse(
        responseData.requestId || responseData.transactionId,
        expiresAt,
        {
          visaType: responseData.visaType,
          visaSubclass: responseData.visaSubclass,
          workRights: responseData.workRights,
          workRestrictions: responseData.workRestrictions,
          visaExpiryDate: responseData.visaExpiryDate,
        }
      );
    } else {
      return {
        success: false,
        status: "FAILED",
        errorMessage: responseData.reason || "VEVO check failed",
        providerResponse: responseData,
      };
    }
  }

  private async verifyWithCheckWorkRights(
    data: VEVOVerificationData
  ): Promise<VerificationResponse> {
    const requestBody = {
      passport_number: data.passportNumber,
      date_of_birth: data.dateOfBirth,
      first_name: data.firstName,
      last_name: data.lastName,
      visa_grant_number: data.visaGrantNumber,
      transaction_reference_number: data.transactionReferenceNumber,
    };

    const response = await this.retry(() =>
      this.client.post("/api/v3/work-rights/check", requestBody)
    );

    const responseData = response.data;

    if (
      responseData.status === "verified" ||
      responseData.work_rights === true
    ) {
      const expiresAt = responseData.visa_expiry_date
        ? new Date(responseData.visa_expiry_date)
        : undefined;

      return this.createSuccessResponse(
        responseData.request_id || responseData.id,
        expiresAt,
        {
          visaType: responseData.visa_type,
          visaSubclass: responseData.visa_subclass,
          workRights: responseData.work_rights,
          workRestrictions: responseData.work_restrictions,
          visaExpiryDate: responseData.visa_expiry_date,
        }
      );
    } else {
      return {
        success: false,
        status: "FAILED",
        errorMessage: responseData.message || "VEVO check failed",
        providerResponse: responseData,
      };
    }
  }

  async getStatus(providerRequestId: string): Promise<VerificationStatusResponse> {
    try {
      const endpoint =
        this.provider === "vsure"
          ? `/api/v1/vevo/status/${providerRequestId}`
          : `/api/v3/work-rights/status/${providerRequestId}`;

      const response = await this.retry(() =>
        this.client.get(endpoint)
      );

      const data = response.data;

      return {
        status:
          data.workRights || data.work_rights
            ? "VERIFIED"
            : data.status?.toUpperCase() || "IN_PROGRESS",
        providerRequestId,
        verifiedAt: data.verifiedAt
          ? new Date(data.verifiedAt)
          : data.verified_at
          ? new Date(data.verified_at)
          : undefined,
        expiresAt: data.visaExpiryDate
          ? new Date(data.visaExpiryDate)
          : data.visa_expiry_date
          ? new Date(data.visa_expiry_date)
          : undefined,
        metadata: {
          visaType: data.visaType || data.visa_type,
          visaSubclass: data.visaSubclass || data.visa_subclass,
          workRights: data.workRights || data.work_rights,
        },
        errorMessage: data.error || data.reason || data.message,
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
      const endpoint =
        this.provider === "vsure"
          ? `/api/v1/vevo/recheck/${providerRequestId}`
          : `/api/v3/work-rights/recheck/${providerRequestId}`;

      const response = await this.retry(() =>
        this.client.post(endpoint)
      );

      const data = response.data;

      if (data.workRights || data.work_rights) {
        return this.createSuccessResponse(
          providerRequestId,
          data.visaExpiryDate
            ? new Date(data.visaExpiryDate)
            : data.visa_expiry_date
            ? new Date(data.visa_expiry_date)
            : undefined
        );
      } else {
        return {
          success: false,
          status: "FAILED",
          errorMessage: data.reason || data.message || "Recheck failed",
        };
      }
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  /**
   * Monitor visa status changes (for webhook processing)
   */
  async monitorVisaStatus(providerRequestId: string): Promise<{
    statusChanged: boolean;
    newStatus?: string;
    metadata?: Record<string, unknown>;
  }> {
    try {
      const currentStatus = await this.getStatus(providerRequestId);
      return {
        statusChanged: currentStatus.status === "VERIFIED",
        newStatus: currentStatus.status,
        metadata: currentStatus.metadata,
      };
    } catch (error) {
      return {
        statusChanged: false,
      };
    }
  }
}
