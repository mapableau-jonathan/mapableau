/**
 * Coinbase Commerce Adapter
 * Integration with Coinbase Commerce API for cryptocurrency payments
 * 
 * Documentation: https://docs.commerce.coinbase.com/
 * 
 * Note: This adapter requires @coinbase/coinbase-sdk to be installed:
 * npm install @coinbase/coinbase-sdk
 * 
 * Or use the REST API directly with axios
 */

import axios from "axios";
import crypto from "crypto";

export interface CoinbaseCharge {
  id: string;
  resource: "charge";
  code: string;
  name: string;
  description?: string;
  logo_url?: string;
  hosted_url: string;
  created_at: string;
  expires_at: string;
  confirmed_at?: string;
  checkout?: {
    id: string;
  };
  timeline: Array<{
    time: string;
    status: string;
    payment?: {
      network: string;
      transaction_id: string;
      value: {
        local: {
          amount: string;
          currency: string;
        };
        crypto: {
          amount: string;
          currency: string;
        };
      };
    };
  }>;
  pricing: {
    local: {
      amount: string;
      currency: string;
    };
    ethereum?: {
      amount: string;
      currency: string;
    };
    bitcoin?: {
      amount: string;
      currency: string;
    };
    usdc?: {
      amount: string;
      currency: string;
    };
  };
  payments: Array<{
    network: string;
    transaction_id: string;
    status: string;
    value: {
      local: {
        amount: string;
        currency: string;
      };
      crypto: {
        amount: string;
        currency: string;
      };
    };
    block: {
      height: number;
      hash: string;
      confirmations: number;
      confirmations_required: number;
    };
  }>;
  addresses: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface CreateChargeRequest {
  name: string;
  description?: string;
  local_price: {
    amount: string;
    currency: string; // AUD, USD, etc.
  };
  pricing_type: "fixed_price" | "no_price";
  metadata?: Record<string, any>;
  redirect_url?: string;
  cancel_url?: string;
}

export interface CoinbaseWebhookEvent {
  id: string;
  resource: "event";
  type: "charge:created" | "charge:confirmed" | "charge:failed" | "charge:delayed" | "charge:pending" | "charge:resolved";
  api_version: string;
  created_at: string;
  data: {
    code: string;
    name: string;
    description?: string;
    hosted_url: string;
    created_at: string;
    expires_at: string;
    confirmed_at?: string;
    checkout?: {
      id: string;
    };
    timeline: Array<{
      time: string;
      status: string;
      payment?: any;
    }>;
    pricing: {
      local: {
        amount: string;
        currency: string;
      };
    };
    payments: Array<any>;
    addresses: Record<string, string>;
    metadata?: Record<string, any>;
  };
}

export interface CoinbasePaymentResult {
  chargeId: string;
  hostedUrl: string;
  code: string;
  expiresAt: Date;
  status: "NEW" | "PENDING" | "COMPLETED" | "EXPIRED" | "UNRESOLVED" | "RESOLVED";
}

export class CoinbaseAdapter {
  private apiKey: string;
  private apiSecret: string;
  private apiUrl: string;
  private webhookSecret: string;

  constructor(config?: {
    apiKey?: string;
    apiSecret?: string;
    apiUrl?: string;
    webhookSecret?: string;
  }) {
    this.apiKey = config?.apiKey || process.env.COINBASE_API_KEY || "";
    this.apiSecret = config?.apiSecret || process.env.COINBASE_API_SECRET || "";
    this.apiUrl = config?.apiUrl || process.env.COINBASE_API_URL || "https://api.commerce.coinbase.com";
    this.webhookSecret = config?.webhookSecret || process.env.COINBASE_WEBHOOK_SECRET || "";
  }

  /**
   * Create a charge (payment request) in Coinbase Commerce
   */
  async createCharge(request: CreateChargeRequest): Promise<CoinbaseCharge> {
    if (!this.apiKey) {
      throw new Error("Coinbase API key not configured");
    }

    try {
      const response = await axios.post<{ data: CoinbaseCharge }>(
        `${this.apiUrl}/charges`,
        {
          name: request.name,
          description: request.description,
          local_price: request.local_price,
          pricing_type: request.pricing_type,
          metadata: request.metadata,
          redirect_url: request.redirect_url,
          cancel_url: request.cancel_url,
        },
        {
          headers: {
            "X-CC-Api-Key": this.apiKey,
            "X-CC-Version": "2018-03-22",
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Coinbase charge creation failed: ${error.response.data?.error?.message || error.message}`
        );
      }
      throw new Error(`Coinbase API error: ${error.message}`);
    }
  }

  /**
   * Get charge details by ID
   */
  async getCharge(chargeId: string): Promise<CoinbaseCharge> {
    if (!this.apiKey) {
      throw new Error("Coinbase API key not configured");
    }

    try {
      const response = await axios.get<{ data: CoinbaseCharge }>(
        `${this.apiUrl}/charges/${chargeId}`,
        {
          headers: {
            "X-CC-Api-Key": this.apiKey,
            "X-CC-Version": "2018-03-22",
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Coinbase charge retrieval failed: ${error.response.data?.error?.message || error.message}`
        );
      }
      throw new Error(`Coinbase API error: ${error.message}`);
    }
  }

  /**
   * Get charge by code (public identifier)
   */
  async getChargeByCode(code: string): Promise<CoinbaseCharge> {
    if (!this.apiKey) {
      throw new Error("Coinbase API key not configured");
    }

    try {
      const response = await axios.get<{ data: CoinbaseCharge }>(
        `${this.apiUrl}/charges/${code}`,
        {
          headers: {
            "X-CC-Api-Key": this.apiKey,
            "X-CC-Version": "2018-03-22",
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Coinbase charge retrieval failed: ${error.response.data?.error?.message || error.message}`
        );
      }
      throw new Error(`Coinbase API error: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string
  ): boolean {
    if (!this.webhookSecret) {
      console.warn("Webhook secret not configured, skipping signature verification");
      return true; // In development, allow without verification
    }

    try {
      const signedPayload = `${timestamp}${payload}`;
      const hmac = crypto.createHmac("sha256", this.webhookSecret);
      hmac.update(signedPayload);
      const expectedSignature = hmac.digest("hex");

      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("Webhook signature verification error:", error);
      return false;
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string, signature: string, timestamp: string): CoinbaseWebhookEvent | null {
    if (!this.verifyWebhookSignature(payload, signature, timestamp)) {
      throw new Error("Invalid webhook signature");
    }

    try {
      return JSON.parse(payload) as CoinbaseWebhookEvent;
    } catch (error) {
      throw new Error("Invalid webhook payload");
    }
  }

  /**
   * Get payment status from charge
   */
  getPaymentStatus(charge: CoinbaseCharge): "PENDING" | "COMPLETED" | "EXPIRED" | "FAILED" {
    const latestTimeline = charge.timeline[charge.timeline.length - 1];
    
    if (!latestTimeline) {
      return "PENDING";
    }

    const status = latestTimeline.status.toUpperCase();
    
    if (status === "COMPLETED" || status === "CONFIRMED") {
      return "COMPLETED";
    }
    
    if (status === "EXPIRED") {
      return "EXPIRED";
    }
    
    if (status === "FAILED" || status === "UNRESOLVED") {
      return "FAILED";
    }
    
    return "PENDING";
  }

  /**
   * Check if charge is paid
   */
  isChargePaid(charge: CoinbaseCharge): boolean {
    return this.getPaymentStatus(charge) === "COMPLETED";
  }

  /**
   * Get total amount paid for a charge
   */
  getTotalPaid(charge: CoinbaseCharge): number {
    if (!charge.payments || charge.payments.length === 0) {
      return 0;
    }

    // Sum all completed payments
    const completedPayments = charge.payments.filter(
      (p) => p.status === "COMPLETED" || p.status === "CONFIRMED"
    );

    return completedPayments.reduce((sum, payment) => {
      return sum + parseFloat(payment.value.local.amount);
    }, 0);
  }

  /**
   * Cancel a charge
   */
  async cancelCharge(chargeId: string): Promise<CoinbaseCharge> {
    if (!this.apiKey) {
      throw new Error("Coinbase API key not configured");
    }

    try {
      const response = await axios.post<{ data: CoinbaseCharge }>(
        `${this.apiUrl}/charges/${chargeId}/cancel`,
        {},
        {
          headers: {
            "X-CC-Api-Key": this.apiKey,
            "X-CC-Version": "2018-03-22",
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Coinbase charge cancellation failed: ${error.response.data?.error?.message || error.message}`
        );
      }
      throw new Error(`Coinbase API error: ${error.message}`);
    }
  }

  /**
   * Resolve a charge (mark as resolved after manual review)
   */
  async resolveCharge(chargeId: string): Promise<CoinbaseCharge> {
    if (!this.apiKey) {
      throw new Error("Coinbase API key not configured");
    }

    try {
      const response = await axios.post<{ data: CoinbaseCharge }>(
        `${this.apiUrl}/charges/${chargeId}/resolve`,
        {},
        {
          headers: {
            "X-CC-Api-Key": this.apiKey,
            "X-CC-Version": "2018-03-22",
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Coinbase charge resolution failed: ${error.response.data?.error?.message || error.message}`
        );
      }
      throw new Error(`Coinbase API error: ${error.message}`);
    }
  }
}
