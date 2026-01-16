import axios, { type AxiosInstance } from "axios";
import { BaseVerificationService } from "./base";
import type {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
} from "./base";
import type { FirstAidVerificationData } from "./types";
import { providerConfig } from "../../config/verification";

export class FirstAidService extends BaseVerificationService {
  private client: AxiosInstance;

  constructor() {
    super("firstaid");
    const config = providerConfig.usi;

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

    const data = request.data as FirstAidVerificationData;
    const documents = request.documents || [];

    try {
      // Try USI transcript first if USI number is provided
      if (data.usiNumber) {
        const usiResult = await this.verifyUSITranscript(data.usiNumber);
        if (usiResult.success) {
          return usiResult;
        }
      }

      // Fallback to certificate verification
      if (data.certificateNumber || documents.length > 0) {
        return await this.verifyCertificate(data, documents);
      }

      return {
        success: false,
        status: "FAILED",
        errorMessage:
          "Either USI number or certificate details are required for First Aid verification",
      };
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  /**
   * Verify via USI transcript
   */
  private async verifyUSITranscript(
    usiNumber: string
  ): Promise<VerificationResponse> {
    try {
      // USI API endpoint for transcript (requires student consent)
      const response = await this.retry(() =>
        this.client.post("/api/v1/transcript/verify", {
          usi: usiNumber,
          unitCode: "HLTAID011", // Provide First Aid
        })
      );

      const data = response.data;

      if (data.verified === true && data.completed === true) {
        const completionDate = data.completionDate
          ? new Date(data.completionDate)
          : undefined;

        // First Aid certificates typically expire 3 years from issue
        const expiresAt = completionDate
          ? new Date(completionDate.getTime() + 3 * 365 * 24 * 60 * 60 * 1000)
          : undefined;

        return this.createSuccessResponse(
          `usi-${usiNumber}`,
          expiresAt,
          {
            usiNumber,
            unitCode: data.unitCode,
            unitName: data.unitName,
            completionDate: data.completionDate,
            rtoNumber: data.rtoNumber,
            rtoName: data.rtoName,
            verifiedVia: "usi",
          }
        );
      } else {
        return {
          success: false,
          status: "FAILED",
          errorMessage: "First Aid unit not found in USI transcript",
          providerResponse: data,
        };
      }
    } catch (error) {
      // If USI verification fails, return error but don't throw
      // We'll fall back to manual verification
      return {
        success: false,
        status: "FAILED",
        errorMessage:
          error instanceof Error
            ? error.message
            : "USI transcript verification failed",
      };
    }
  }

  /**
   * Verify certificate manually (requires document upload)
   */
  private async verifyCertificate(
    data: FirstAidVerificationData,
    documents: Array<{ type: string; fileUrl: string; metadata?: Record<string, unknown> }>
  ): Promise<VerificationResponse> {
    const certificateDocument = documents.find(
      (d) => d.type === "first_aid_certificate"
    );

    if (!certificateDocument && !data.certificateNumber) {
      return {
        success: false,
        status: "FAILED",
        errorMessage:
          "Certificate document or certificate number is required for manual verification",
      };
    }

    // For manual verification, we:
    // 1. Extract data from certificate (OCR if image provided)
    // 2. Validate RTO is registered
    // 3. Check unit code is valid
    // 4. Verify expiry date

    const metadata: Record<string, unknown> = {
      verifiedVia: "manual",
      certificateNumber: data.certificateNumber,
      rtoNumber: data.rtoNumber,
      unitCode: data.unitCode,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
    };

    // Validate unit code (HLTAID011 is the standard First Aid unit)
    const validUnitCodes = ["HLTAID011", "HLTAID012", "HLTAID009"];
    if (data.unitCode && !validUnitCodes.includes(data.unitCode)) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: `Invalid unit code: ${data.unitCode}. Must be one of: ${validUnitCodes.join(", ")}`,
      };
    }

    // Calculate expiry if not provided (3 years from issue or current date)
    let expiresAt: Date | undefined;
    if (data.expiryDate) {
      expiresAt = new Date(data.expiryDate);
    } else if (data.issueDate) {
      expiresAt = new Date(data.issueDate);
      expiresAt.setFullYear(expiresAt.getFullYear() + 3);
    } else {
      // Default to 3 years from now if no dates provided
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 3);
    }

    // Check if expired
    if (expiresAt < new Date()) {
      return {
        success: false,
        status: "EXPIRED",
        errorMessage: "First Aid certificate has expired",
        expiresAt,
      };
    }

    // Manual verification requires admin review
    return {
      success: true,
      status: "PENDING", // Requires manual admin verification
      providerRequestId: `manual-${data.certificateNumber || Date.now()}`,
      expiresAt,
      metadata: {
        ...metadata,
        requiresManualReview: true,
        documentUrl: certificateDocument?.fileUrl,
      },
    };
  }

  async getStatus(providerRequestId: string): Promise<VerificationStatusResponse> {
    try {
      // If it's a USI verification, try to get status
      if (providerRequestId.startsWith("usi-")) {
        const usiNumber = providerRequestId.replace("usi-", "");
        const response = await this.retry(() =>
          this.client.get(`/api/v1/transcript/${usiNumber}/status`)
        );

        const data = response.data;

        return {
          status: data.verified ? "VERIFIED" : "IN_PROGRESS",
          providerRequestId,
          verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : undefined,
          expiresAt: data.expiryDate ? new Date(data.expiryDate) : undefined,
          metadata: {
            usiNumber,
            unitCode: data.unitCode,
          },
        };
      }

      // For manual verifications, status is stored in database
      return {
        status: "PENDING",
        providerRequestId,
        metadata: {
          requiresManualReview: true,
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
    // For USI, recheck the transcript
    if (providerRequestId.startsWith("usi-")) {
      const usiNumber = providerRequestId.replace("usi-", "");
      return this.verifyUSITranscript(usiNumber);
    }

    // For manual, return error (requires new verification)
    return {
      success: false,
      status: "FAILED",
      errorMessage: "Manual verifications cannot be rechecked automatically",
    };
  }

  /**
   * Verify certificate (public method)
   */
  async verifyCertificate(
    data: FirstAidVerificationData,
    documentUrl?: string
  ): Promise<VerificationResponse> {
    const request: VerificationRequest = {
      workerId: "", // Will be set by caller
      verificationType: "FIRST_AID",
      data,
      documents: documentUrl
        ? [{ type: "first_aid_certificate", fileUrl: documentUrl }]
        : undefined,
    };

    return this.verify(request);
  }

  /**
   * Verify USI transcript (public method)
   */
  async verifyUSITranscript(usiNumber: string): Promise<VerificationResponse> {
    const request: VerificationRequest = {
      workerId: "", // Will be set by caller
      verificationType: "FIRST_AID",
      data: { usiNumber },
    };

    return this.verify(request);
  }
}
