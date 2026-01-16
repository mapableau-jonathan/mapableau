/**
 * Stripe Link Adapter
 * Integration with Stripe Link for one-click checkout
 * 
 * Documentation: https://stripe.com/docs/payments/link
 * 
 * Note: This adapter requires stripe to be installed:
 * npm install stripe
 */

import Stripe from "stripe";

export interface StripeLinkPaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, string>;
  taxCalculation?: {
    id: string;
    taxAmountExclusive: number;
    taxAmountInclusive: number;
    amountTotal: number;
    taxBreakdown?: Array<{
      jurisdiction: string;
      percentage: number;
      taxAmount: number;
    }>;
  };
}

export interface CreatePaymentIntentRequest {
  amount: number; // AUD amount in cents
  currency?: string; // Default: "aud"
  description?: string;
  metadata?: Record<string, string>;
  customerId?: string; // Stripe customer ID
  paymentMethodId?: string; // For Link, this is optional
  confirmationMethod?: "automatic" | "manual";
  confirm?: boolean;
  // Tax calculation
  calculateTax?: boolean;
  customerAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface StripeLinkCustomer {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export class StripeAdapter {
  private stripe: Stripe;
  private webhookSecret?: string;

  constructor(config?: {
    apiKey?: string;
    webhookSecret?: string;
  }) {
    const apiKey = config?.apiKey || process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey) {
      throw new Error("Stripe API key not configured");
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: "2024-11-20.acacia", // Use latest API version
    });
    
    this.webhookSecret = config?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Calculate tax for a payment
   */
  async calculateTax(
    amount: number,
    currency: string,
    customerAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    },
    shippingAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    },
    lineItemReference?: string
  ): Promise<{
    id: string;
    taxAmountExclusive: number;
    taxAmountInclusive: number;
    amountTotal: number;
    taxBreakdown?: Array<{
      jurisdiction: string;
      percentage: number;
      taxAmount: number;
    }>;
  }> {
    try {
      // Build calculation parameters with nested objects (correct Stripe API format)
      const calculationParams: any = {
        currency: currency.toLowerCase(),
        line_items: [
          {
            amount: Math.round(amount * 100), // Convert to cents
            reference: lineItemReference || "L1",
          },
        ],
      };

      // Add customer details with address
      if (customerAddress || shippingAddress) {
        calculationParams.customer_details = {};

        // Use shipping address if provided, otherwise use customer address
        if (shippingAddress) {
          calculationParams.customer_details.shipping = {
            address: {
              ...(shippingAddress.line1 && { line1: shippingAddress.line1 }),
              ...(shippingAddress.line2 && { line2: shippingAddress.line2 }),
              ...(shippingAddress.city && { city: shippingAddress.city }),
              ...(shippingAddress.state && { state: shippingAddress.state }),
              ...(shippingAddress.postal_code && { postal_code: shippingAddress.postal_code }),
              ...(shippingAddress.country && { country: shippingAddress.country }),
            },
          };
          calculationParams.customer_details.address_source = "shipping";
        } else if (customerAddress) {
          calculationParams.customer_details.address = {
            ...(customerAddress.line1 && { line1: customerAddress.line1 }),
            ...(customerAddress.line2 && { line2: customerAddress.line2 }),
            ...(customerAddress.city && { city: customerAddress.city }),
            ...(customerAddress.state && { state: customerAddress.state }),
            ...(customerAddress.postal_code && { postal_code: customerAddress.postal_code }),
            ...(customerAddress.country && { country: customerAddress.country }),
          };
          calculationParams.customer_details.address_source = "billing";
        }
      }

      const calculation = await this.stripe.tax.calculations.create(calculationParams);

      return {
        id: calculation.id,
        taxAmountExclusive: calculation.tax_amount_exclusive / 100,
        taxAmountInclusive: calculation.tax_amount_inclusive / 100,
        amountTotal: calculation.amount_total / 100,
        taxBreakdown: calculation.tax_breakdown?.map((breakdown: any) => ({
          jurisdiction: breakdown.jurisdiction || breakdown.tax_rate_details?.display_name || "Unknown",
          percentage: breakdown.tax_rate_details?.percentage || 0,
          taxAmount: breakdown.amount / 100,
        })),
      };
    } catch (error: any) {
      // If tax calculation fails, return zero tax
      // This allows payments to proceed even if tax calculation is unavailable
      console.warn("Tax calculation failed:", error.message);
      return {
        id: "",
        taxAmountExclusive: 0,
        taxAmountInclusive: 0,
        amountTotal: amount,
        taxBreakdown: [],
      };
    }
  }

  /**
   * Create a tax transaction from a calculation
   */
  async createTaxTransaction(
    calculationId: string,
    reference: string
  ): Promise<string> {
    try {
      const transaction = await this.stripe.tax.transactions.createFromCalculation({
        calculation: calculationId,
        reference: reference,
      });

      return transaction.id;
    } catch (error: any) {
      throw new Error(`Stripe tax transaction creation failed: ${error.message}`);
    }
  }

  /**
   * Create a payment intent for Stripe Link
   */
  async createPaymentIntent(
    request: CreatePaymentIntentRequest
  ): Promise<StripeLinkPaymentIntent> {
    try {
      let finalAmount = Math.round(request.amount * 100); // Convert to cents
      let taxCalculation = undefined;

      // Calculate tax if requested and address provided
      if (request.calculateTax && (request.customerAddress || request.shippingAddress)) {
        try {
          taxCalculation = await this.calculateTax(
            request.amount,
            request.currency || "aud",
            request.customerAddress,
            request.shippingAddress,
            request.metadata?.reference || `PI_${Date.now()}`
          );

          // Use the total amount including tax
          finalAmount = Math.round(taxCalculation.amountTotal * 100);
        } catch (error: any) {
          console.warn("Tax calculation failed, proceeding without tax:", error.message);
        }
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: finalAmount,
        currency: request.currency || "aud",
        description: request.description,
        metadata: {
          ...request.metadata,
          ...(taxCalculation?.id && { tax_calculation_id: taxCalculation.id }),
        },
        customer: request.customerId,
        payment_method: request.paymentMethodId,
        confirmation_method: request.confirmationMethod || "automatic",
        confirm: request.confirm || false,
        payment_method_types: ["link", "card"], // Enable Stripe Link
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "always",
        },
      });

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret!,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata as Record<string, string>,
        taxCalculation,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment intent creation failed: ${error.message}`);
    }
  }

  /**
   * Get payment intent status
   */
  async getPaymentIntent(paymentIntentId: string): Promise<StripeLinkPaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret!,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment intent retrieval failed: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<StripeLinkPaymentIntent> {
    try {
      const params: Stripe.PaymentIntentConfirmParams = {};
      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        params
      );

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret!,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment intent confirmation failed: ${error.message}`);
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<StripeLinkPaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret!,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment intent cancellation failed: ${error.message}`);
    }
  }

  /**
   * Create or retrieve customer
   */
  async getOrCreateCustomer(
    email: string,
    phone?: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<StripeLinkCustomer> {
    try {
      // Search for existing customer by email
      const existingCustomers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        return {
          id: customer.id,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
          name: customer.name || undefined,
          metadata: customer.metadata as Record<string, string>,
        };
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        phone,
        name,
        metadata,
      });

      return {
        id: customer.id,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        name: customer.name || undefined,
        metadata: customer.metadata as Record<string, string>,
      };
    } catch (error: any) {
      throw new Error(`Stripe customer creation failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): StripeWebhookEvent {
    if (!this.webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data,
        created: event.created,
      };
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Get payment method details
   */
  async getPaymentMethod(paymentMethodId: string): Promise<any> {
    try {
      return await this.stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error: any) {
      throw new Error(`Stripe payment method retrieval failed: ${error.message}`);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<any> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        reason: reason as Stripe.RefundCreateParams.Reason,
      });

      return refund;
    } catch (error: any) {
      throw new Error(`Stripe refund creation failed: ${error.message}`);
    }
  }

  /**
   * List payment intents for a customer
   */
  async listPaymentIntents(
    customerId?: string,
    limit = 10
  ): Promise<StripeLinkPaymentIntent[]> {
    try {
      const params: Stripe.PaymentIntentListParams = {
        limit,
      };
      
      if (customerId) {
        params.customer = customerId;
      }

      const paymentIntents = await this.stripe.paymentIntents.list(params);

      return paymentIntents.data.map((pi) => ({
        id: pi.id,
        client_secret: pi.client_secret!,
        amount: pi.amount / 100,
        currency: pi.currency,
        status: pi.status,
        metadata: pi.metadata as Record<string, string>,
      }));
    } catch (error: any) {
      throw new Error(`Stripe payment intent list failed: ${error.message}`);
    }
  }
}
