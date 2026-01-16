/**
 * PayPal Adapter
 * Integration with PayPal REST API for payment processing
 * 
 * Documentation: https://developer.paypal.com/docs/api/overview/
 * 
 * Note: This adapter requires @paypal/checkout-server-sdk to be installed:
 * npm install @paypal/checkout-server-sdk
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface PayPalOrder {
  id: string;
  status: string;
  intent: "CAPTURE" | "AUTHORIZE";
  amount: {
    currency_code: string;
    value: string;
  };
  create_time?: string;
  update_time?: string;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
  payer?: {
    email_address?: string;
    payer_id?: string;
  };
}

export interface CreateOrderRequest {
  amount: number; // AUD amount
  currency?: string; // Default: "AUD"
  description?: string;
  returnUrl: string; // URL to redirect after payment approval
  cancelUrl: string; // URL to redirect if payment cancelled
  metadata?: Record<string, string>;
  items?: Array<{
    name: string;
    quantity: number;
    unit_amount: {
      currency_code: string;
      value: string;
    };
  }>;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  resource: any;
  create_time: string;
  summary?: string;
}

export interface PayPalCapture {
  id: string;
  status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED";
  amount: {
    currency_code: string;
    value: string;
  };
  final_capture?: boolean;
  create_time?: string;
  update_time?: string;
}

export class PayPalAdapter {
  private clientId: string;
  private clientSecret: string;
  private environment: "sandbox" | "production";
  private baseUrl: string;
  private accessToken?: string;
  private accessTokenExpiry?: Date;

  constructor(config?: {
    clientId?: string;
    clientSecret?: string;
    environment?: "sandbox" | "production";
  }) {
    this.clientId = config?.clientId || process.env.PAYPAL_CLIENT_ID || "";
    this.clientSecret = config?.clientSecret || process.env.PAYPAL_CLIENT_SECRET || "";
    this.environment = (config?.environment || process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production";
    
    this.baseUrl = this.environment === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    if (!this.clientId || !this.clientSecret) {
      logger.warn("PayPal credentials not configured - PayPal adapter will not function");
    }
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.accessTokenExpiry && this.accessTokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
      
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${auth}`,
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PayPal OAuth failed: ${error}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.accessTokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);

      return this.accessToken;
    } catch (error: any) {
      logger.error("Failed to get PayPal access token", error);
      throw new Error(`PayPal authentication failed: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal API request failed: ${error}`);
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return null;
    }

    return await response.json();
  }

  /**
   * Create PayPal order
   */
  async createOrder(request: CreateOrderRequest): Promise<PayPalOrder> {
    try {
      const orderData = {
        intent: "CAPTURE",
        purchase_units: [
          {
            description: request.description || "NDIS Payment",
            amount: {
              currency_code: request.currency || "AUD",
              value: request.amount.toFixed(2),
            },
            items: request.items,
            custom_id: request.metadata?.transactionId || request.metadata?.reference,
            soft_descriptor: request.description?.substring(0, 22) || "NDIS Payment",
          },
        ],
        application_context: {
          brand_name: "AbilityPay Protocol",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: request.returnUrl,
          cancel_url: request.cancelUrl,
        },
      };

      const order = await this.apiRequest("POST", "/v2/checkout/orders", orderData);

      return {
        id: order.id,
        status: order.status,
        intent: order.intent,
        amount: {
          currency_code: order.purchase_units[0].amount.currency_code,
          value: order.purchase_units[0].amount.value,
        },
        create_time: order.create_time,
        update_time: order.update_time,
        links: order.links,
        payer: order.payer,
      };
    } catch (error: any) {
      logger.error("Failed to create PayPal order", error);
      throw new Error(`PayPal order creation failed: ${error.message}`);
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<PayPalOrder> {
    try {
      const order = await this.apiRequest("GET", `/v2/checkout/orders/${orderId}`);

      return {
        id: order.id,
        status: order.status,
        intent: order.intent,
        amount: {
          currency_code: order.purchase_units[0].amount.currency_code,
          value: order.purchase_units[0].amount.value,
        },
        create_time: order.create_time,
        update_time: order.update_time,
        links: order.links,
        payer: order.payer,
      };
    } catch (error: any) {
      logger.error("Failed to get PayPal order", error);
      throw new Error(`PayPal order retrieval failed: ${error.message}`);
    }
  }

  /**
   * Capture payment for an order
   */
  async captureOrder(orderId: string): Promise<PayPalCapture> {
    try {
      const capture = await this.apiRequest("POST", `/v2/checkout/orders/${orderId}/capture`);

      return {
        id: capture.id,
        status: capture.status,
        amount: {
          currency_code: capture.amount.currency_code,
          value: capture.amount.value,
        },
        final_capture: capture.final_capture,
        create_time: capture.create_time,
        update_time: capture.update_time,
      };
    } catch (error: any) {
      logger.error("Failed to capture PayPal order", error);
      throw new Error(`PayPal order capture failed: ${error.message}`);
    }
  }

  /**
   * Refund a captured payment
   */
  async refundCapture(
    captureId: string,
    amount?: number,
    currency?: string,
    note?: string
  ): Promise<any> {
    try {
      const refundData: any = {};
      
      if (amount && currency) {
        refundData.amount = {
          currency_code: currency,
          value: amount.toFixed(2),
        };
      }

      if (note) {
        refundData.note_to_payer = note;
      }

      const refund = await this.apiRequest("POST", `/v2/payments/captures/${captureId}/refund`, refundData);

      return refund;
    } catch (error: any) {
      logger.error("Failed to refund PayPal capture", error);
      throw new Error(`PayPal refund failed: ${error.message}`);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      // PayPal orders are typically cancelled by not capturing them
      // But we can update the order status if needed
      await this.apiRequest("PATCH", `/v2/checkout/orders/${orderId}`, [
        {
          op: "replace",
          path: "/purchase_units/@reference_id=='default'/description",
          value: "Order cancelled",
        },
      ]);
    } catch (error: any) {
      logger.error("Failed to cancel PayPal order", error);
      throw new Error(`PayPal order cancellation failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
    webhookId?: string
  ): Promise<boolean> {
    try {
      const webhookIdToUse = webhookId || process.env.PAYPAL_WEBHOOK_ID;
      
      if (!webhookIdToUse) {
        logger.warn("PayPal webhook ID not configured - skipping signature verification");
        return true; // Allow in development
      }

      const authHeader = headers["authorization"] || headers["Authorization"];
      const certUrl = headers["paypal-cert-url"] || headers["Paypal-Cert-Url"];
      const transmissionId = headers["paypal-transmission-id"] || headers["Paypal-Transmission-Id"];
      const transmissionSig = headers["paypal-transmission-sig"] || headers["Paypal-Transmission-Sig"];
      const transmissionTime = headers["paypal-transmission-time"] || headers["Paypal-Transmission-Time"];

      if (!authHeader || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
        logger.warn("Missing PayPal webhook headers - skipping verification");
        return process.env.NODE_ENV === "development";
      }

      // Verify webhook signature with PayPal
      const verifyData = {
        auth_algo: authHeader,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookIdToUse,
        webhook_event: JSON.parse(body),
      };

      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verifyData),
      });

      if (!response.ok) {
        logger.error("PayPal webhook signature verification failed", await response.text());
        return false;
      }

      const verification = await response.json();
      return verification.verification_status === "SUCCESS";
    } catch (error: any) {
      logger.error("PayPal webhook verification error", error);
      return process.env.NODE_ENV === "development"; // Allow in development
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(body: string): PayPalWebhookEvent {
    try {
      const event = JSON.parse(body);
      return {
        id: event.id,
        event_type: event.event_type,
        resource_type: event.resource_type,
        resource: event.resource,
        create_time: event.create_time,
        summary: event.summary,
      };
    } catch (error: any) {
      throw new Error(`Failed to parse PayPal webhook event: ${error.message}`);
    }
  }

  /**
   * Get payment status from order
   */
  getPaymentStatus(order: PayPalOrder): "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" {
    switch (order.status) {
      case "CREATED":
      case "SAVED":
        return "PENDING";
      case "APPROVED":
        return "PENDING"; // Needs capture
      case "COMPLETED":
        return "COMPLETED";
      case "VOIDED":
      case "CANCELLED":
        return "CANCELLED";
      default:
        return "FAILED";
    }
  }

  /**
   * Get approval URL from order links
   */
  getApprovalUrl(order: PayPalOrder): string | null {
    if (!order.links) return null;
    
    const approvalLink = order.links.find(
      (link) => link.rel === "approve"
    );
    
    return approvalLink?.href || null;
  }

  /**
   * Check if order is ready for capture
   */
  isOrderReadyForCapture(order: PayPalOrder): boolean {
    return order.status === "APPROVED";
  }

  /**
   * Check if order is completed
   */
  isOrderCompleted(order: PayPalOrder): boolean {
    return order.status === "COMPLETED";
  }
}
