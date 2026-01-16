/**
 * NPP Adapter
 * Interface with New Payments Platform (NPP) for real-time AUD transfers
 */

import axios from "axios";

export interface PayeeDetails {
  accountNumber: string;
  bsb: string;
  accountName: string;
  payId?: string; // Optional PayID for NPP
}

export interface PaymentRequest {
  payeeDetails: PayeeDetails;
  amount: number; // AUD
  reference: string; // Payment reference
  description?: string;
}

export interface PaymentStatus {
  paymentId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  amount: number;
  reference: string;
  completedAt?: Date;
  error?: string;
}

export interface AccountVerificationResult {
  valid: boolean;
  accountName?: string;
  error?: string;
}

export class NPPAdapter {
  private apiUrl: string;
  private apiKey?: string;
  private merchantId?: string;

  constructor(config?: {
    apiUrl?: string;
    apiKey?: string;
    merchantId?: string;
  }) {
    this.apiUrl =
      config?.apiUrl ||
      process.env.NPP_API_URL ||
      "https://api.npp.example.com";
    this.apiKey = config?.apiKey || process.env.NPP_API_KEY;
    this.merchantId = config?.merchantId || process.env.NPP_MERCHANT_ID;
  }

  /**
   * Initiate an NPP payment
   */
  async initiatePayment(
    request: PaymentRequest
  ): Promise<{ paymentId: string; status: string }> {
    if (!this.apiKey) {
      throw new Error("NPP API key not configured");
    }

    try {
      const response = await axios.post<{ paymentId: string; status: string }>(
        `${this.apiUrl}/payments`,
        {
          payee: {
            accountNumber: request.payeeDetails.accountNumber,
            bsb: request.payeeDetails.bsb,
            accountName: request.payeeDetails.accountName,
            payId: request.payeeDetails.payId,
          },
          amount: request.amount,
          reference: request.reference,
          description: request.description,
          merchantId: this.merchantId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `NPP payment failed: ${error.response.data?.message || error.message}`
        );
      }
      throw new Error(`NPP payment error: ${error.message}`);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    if (!this.apiKey) {
      throw new Error("NPP API key not configured");
    }

    try {
      const response = await axios.get<PaymentStatus>(
        `${this.apiUrl}/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `NPP status check failed: ${error.response.data?.message || error.message}`
        );
      }
      throw new Error(`NPP status check error: ${error.message}`);
    }
  }

  /**
   * Verify bank account details
   */
  async verifyAccount(
    accountDetails: PayeeDetails
  ): Promise<AccountVerificationResult> {
    if (!this.apiKey) {
      // In development, return mock verification
      return {
        valid: true,
        accountName: accountDetails.accountName,
      };
    }

    try {
      const response = await axios.post<AccountVerificationResult>(
        `${this.apiUrl}/accounts/verify`,
        {
          accountNumber: accountDetails.accountNumber,
          bsb: accountDetails.bsb,
          payId: accountDetails.payId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      // If verification fails, return invalid
      return {
        valid: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Batch payment processing (for multiple redemptions)
   */
  async batchPayments(
    requests: PaymentRequest[]
  ): Promise<Array<{ paymentId: string; status: string; request: PaymentRequest }>> {
    if (!this.apiKey) {
      throw new Error("NPP API key not configured");
    }

    try {
      const response = await axios.post<
        Array<{ paymentId: string; status: string }>
      >(
        `${this.apiUrl}/payments/batch`,
        {
          payments: requests.map((req) => ({
            payee: {
              accountNumber: req.payeeDetails.accountNumber,
              bsb: req.payeeDetails.bsb,
              accountName: req.payeeDetails.accountName,
              payId: req.payeeDetails.payId,
            },
            amount: req.amount,
            reference: req.reference,
            description: req.description,
          })),
          merchantId: this.merchantId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.map((result, index) => ({
        ...result,
        request: requests[index],
      }));
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `NPP batch payment failed: ${error.response.data?.message || error.message}`
        );
      }
      throw new Error(`NPP batch payment error: ${error.message}`);
    }
  }
}
