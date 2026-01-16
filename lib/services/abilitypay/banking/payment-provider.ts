/**
 * Payment Provider Abstraction Layer
 * Unified interface for multiple payment providers (NPP, Coinbase, etc.)
 */

import { NPPAdapter, type PaymentRequest as NPPPaymentRequest } from "./npp-adapter";
import { CoinbaseAdapter, type CreateChargeRequest, type CoinbaseCharge } from "./coinbase-adapter";
import { StripeAdapter, type CreatePaymentIntentRequest } from "./stripe-adapter";
import { PayPalAdapter, type CreateOrderRequest } from "./paypal-adapter";

export type PaymentProvider = "npp" | "coinbase" | "blockchain" | "stripe" | "paypal";

export interface PaymentProviderConfig {
  provider: PaymentProvider;
  nppConfig?: {
    apiUrl?: string;
    apiKey?: string;
    merchantId?: string;
  };
  coinbaseConfig?: {
    apiKey?: string;
    apiSecret?: string;
    apiUrl?: string;
    webhookSecret?: string;
  };
  stripeConfig?: {
    apiKey?: string;
    webhookSecret?: string;
  };
  paypalConfig?: {
    clientId?: string;
    clientSecret?: string;
    environment?: "sandbox" | "production";
    webhookId?: string;
  };
}

export interface UnifiedPaymentRequest {
  amount: number; // AUD
  currency: string; // AUD, USD, etc.
  description: string;
  reference: string;
  metadata?: Record<string, any>;
  // NPP-specific
  payeeDetails?: {
    accountNumber: string;
    bsb: string;
    accountName: string;
    payId?: string;
  };
  // Coinbase-specific
  redirectUrl?: string;
  cancelUrl?: string;
  // Stripe-specific
  customerId?: string; // Stripe customer ID
  paymentMethodId?: string; // For Link, this is optional
  email?: string; // For customer creation
  phone?: string; // For SMS verification
  calculateTax?: boolean; // Calculate tax for Stripe payments
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
  // PayPal-specific
  returnUrl?: string; // URL to redirect after payment approval
  cancelUrl?: string; // URL to redirect if payment cancelled
}

export interface UnifiedPaymentResult {
  provider: PaymentProvider;
  paymentId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  hostedUrl?: string; // For Coinbase
  amount: number;
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
  completedAt?: Date;
}

export interface PaymentStatusResult {
  paymentId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED";
  amount: number;
  currency: string;
  provider: PaymentProvider;
  metadata?: Record<string, any>;
  completedAt?: Date;
}

export class PaymentProviderService {
  private nppAdapter?: NPPAdapter;
  private coinbaseAdapter?: CoinbaseAdapter;
  private stripeAdapter?: StripeAdapter;
  private paypalAdapter?: PayPalAdapter;
  private defaultProvider: PaymentProvider;

  constructor(config: PaymentProviderConfig) {
    this.defaultProvider = config.provider;

    if (config.nppConfig || config.provider === "npp") {
      this.nppAdapter = new NPPAdapter(config.nppConfig);
    }

    if (config.coinbaseConfig || config.provider === "coinbase") {
      this.coinbaseAdapter = new CoinbaseAdapter(config.coinbaseConfig);
    }

    if (config.stripeConfig || config.provider === "stripe") {
      this.stripeAdapter = new StripeAdapter(config.stripeConfig);
    }

    if (config.paypalConfig || config.provider === "paypal") {
      this.paypalAdapter = new PayPalAdapter(config.paypalConfig);
    }
  }

  /**
   * Initiate payment with the specified provider
   */
  async initiatePayment(
    request: UnifiedPaymentRequest,
    provider?: PaymentProvider
  ): Promise<UnifiedPaymentResult> {
    const selectedProvider = provider || this.defaultProvider;

    switch (selectedProvider) {
      case "npp":
        return this.initiateNPPPayment(request);
      
      case "coinbase":
        return this.initiateCoinbasePayment(request);
      
      case "stripe":
        return this.initiateStripePayment(request);
      
      case "paypal":
        return this.initiatePayPalPayment(request);
      
      case "blockchain":
        // Blockchain payments are handled separately via TokenService
        throw new Error("Blockchain payments should use TokenService directly");
      
      default:
        throw new Error(`Unsupported payment provider: ${selectedProvider}`);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    paymentId: string,
    provider: PaymentProvider
  ): Promise<PaymentStatusResult> {
    switch (provider) {
      case "npp":
        return this.getNPPPaymentStatus(paymentId);
      
      case "coinbase":
        return this.getCoinbasePaymentStatus(paymentId);
      
      case "stripe":
        return this.getStripePaymentStatus(paymentId);
      
      case "paypal":
        return this.getPayPalPaymentStatus(paymentId);
      
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(
    paymentId: string,
    provider: PaymentProvider
  ): Promise<void> {
    switch (provider) {
      case "coinbase":
        if (!this.coinbaseAdapter) {
          throw new Error("Coinbase adapter not configured");
        }
        await this.coinbaseAdapter.cancelCharge(paymentId);
        return;
      
      case "stripe":
        if (!this.stripeAdapter) {
          throw new Error("Stripe adapter not configured");
        }
        await this.stripeAdapter.cancelPaymentIntent(paymentId);
        return;
      
      case "paypal":
        if (!this.paypalAdapter) {
          throw new Error("PayPal adapter not configured");
        }
        await this.paypalAdapter.cancelOrder(paymentId);
        return;
      
      case "npp":
        // NPP payments typically cannot be cancelled once initiated
        throw new Error("NPP payments cannot be cancelled");
      
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }

  /**
   * Initiate NPP payment
   */
  private async initiateNPPPayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResult> {
    if (!this.nppAdapter) {
      throw new Error("NPP adapter not configured");
    }

    if (!request.payeeDetails) {
      throw new Error("Payee details required for NPP payments");
    }

    const nppRequest: NPPPaymentRequest = {
      payeeDetails: request.payeeDetails,
      amount: request.amount,
      reference: request.reference,
      description: request.description,
    };

    const result = await this.nppAdapter.initiatePayment(nppRequest);

    return {
      provider: "npp",
      paymentId: result.paymentId,
      status: result.status === "COMPLETED" ? "COMPLETED" : "PROCESSING",
      amount: request.amount,
      currency: request.currency,
      reference: request.reference,
      metadata: request.metadata,
      createdAt: new Date(),
    };
  }

  /**
   * Initiate Coinbase payment
   */
  private async initiateCoinbasePayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResult> {
    if (!this.coinbaseAdapter) {
      throw new Error("Coinbase adapter not configured");
    }

    const chargeRequest: CreateChargeRequest = {
      name: request.description,
      description: request.description,
      local_price: {
        amount: request.amount.toFixed(2),
        currency: request.currency,
      },
      pricing_type: "fixed_price",
      metadata: {
        reference: request.reference,
        ...request.metadata,
      },
      redirect_url: request.redirectUrl,
      cancel_url: request.cancelUrl,
    };

    const charge = await this.coinbaseAdapter.createCharge(chargeRequest);

    return {
      provider: "coinbase",
      paymentId: charge.id,
      status: "PENDING",
      hostedUrl: charge.hosted_url,
      amount: parseFloat(charge.pricing.local.amount),
      currency: charge.pricing.local.currency,
      reference: request.reference,
      metadata: {
        code: charge.code,
        ...request.metadata,
      },
      createdAt: new Date(charge.created_at),
      expiresAt: new Date(charge.expires_at),
    };
  }

  /**
   * Get NPP payment status
   */
  private async getNPPPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.nppAdapter) {
      throw new Error("NPP adapter not configured");
    }

    const status = await this.nppAdapter.getPaymentStatus(paymentId);

    return {
      paymentId,
      status: status.status === "COMPLETED" ? "COMPLETED" : 
              status.status === "PROCESSING" ? "PROCESSING" :
              status.status === "FAILED" ? "FAILED" : "PENDING",
      amount: status.amount,
      currency: "AUD",
      provider: "npp",
      completedAt: status.completedAt,
    };
  }

  /**
   * Get Coinbase payment status
   */
  private async getCoinbasePaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.coinbaseAdapter) {
      throw new Error("Coinbase adapter not configured");
    }

    const charge = await this.coinbaseAdapter.getCharge(paymentId);
    const status = this.coinbaseAdapter.getPaymentStatus(charge);

    return {
      paymentId: charge.id,
      status: status === "COMPLETED" ? "COMPLETED" :
              status === "EXPIRED" ? "EXPIRED" :
              status === "FAILED" ? "FAILED" : "PENDING",
      amount: parseFloat(charge.pricing.local.amount),
      currency: charge.pricing.local.currency,
      provider: "coinbase",
      metadata: charge.metadata,
      completedAt: charge.confirmed_at ? new Date(charge.confirmed_at) : undefined,
    };
  }

  /**
   * Initiate Stripe payment
   */
  private async initiateStripePayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResult> {
    if (!this.stripeAdapter) {
      throw new Error("Stripe adapter not configured");
    }

    const paymentIntentRequest: CreatePaymentIntentRequest = {
      amount: request.amount,
      currency: request.currency.toLowerCase(),
      description: request.description,
      metadata: {
        reference: request.reference,
        ...request.metadata,
      },
      confirmationMethod: "automatic",
      confirm: false, // Don't confirm immediately - wait for SMS verification
    };

    const paymentIntent = await this.stripeAdapter.createPaymentIntent(paymentIntentRequest);

      return {
        provider: "stripe",
        paymentId: paymentIntent.id,
        status: paymentIntent.status === "succeeded" ? "COMPLETED" :
                paymentIntent.status === "requires_payment_method" ? "PENDING" :
                paymentIntent.status === "processing" ? "PROCESSING" :
                paymentIntent.status === "canceled" ? "CANCELLED" : "PENDING",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        reference: request.reference,
        metadata: {
          clientSecret: paymentIntent.client_secret,
          ...paymentIntent.metadata,
          ...(paymentIntent.taxCalculation && {
            taxCalculation: paymentIntent.taxCalculation,
          }),
        },
        createdAt: new Date(),
      };
  }

  /**
   * Get Stripe payment status
   */
  private async getStripePaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.stripeAdapter) {
      throw new Error("Stripe adapter not configured");
    }

    const paymentIntent = await this.stripeAdapter.getPaymentIntent(paymentId);

    return {
      paymentId: paymentIntent.id,
      status: paymentIntent.status === "succeeded" ? "COMPLETED" :
              paymentIntent.status === "requires_payment_method" ? "PENDING" :
              paymentIntent.status === "requires_confirmation" ? "PENDING" :
              paymentIntent.status === "processing" ? "PROCESSING" :
              paymentIntent.status === "canceled" ? "CANCELLED" :
              paymentIntent.status === "payment_failed" ? "FAILED" : "PENDING",
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      provider: "stripe",
      metadata: paymentIntent.metadata,
    };
  }

  /**
   * Initiate PayPal payment
   */
  private async initiatePayPalPayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResult> {
    if (!this.paypalAdapter) {
      throw new Error("PayPal adapter not configured");
    }

    const orderRequest: CreateOrderRequest = {
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      returnUrl: request.metadata?.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      cancelUrl: request.metadata?.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        reference: request.reference,
        ...request.metadata,
      },
    };

    const order = await this.paypalAdapter.createOrder(orderRequest);
    const approvalUrl = this.paypalAdapter.getApprovalUrl(order);

    return {
      provider: "paypal",
      paymentId: order.id,
      status: this.paypalAdapter.getPaymentStatus(order),
      hostedUrl: approvalUrl || undefined,
      amount: parseFloat(order.amount.value),
      currency: order.amount.currency_code,
      reference: request.reference,
      metadata: {
        orderId: order.id,
        approvalUrl,
        ...request.metadata,
      },
      createdAt: order.create_time ? new Date(order.create_time) : new Date(),
    };
  }

  /**
   * Get PayPal payment status
   */
  private async getPayPalPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!this.paypalAdapter) {
      throw new Error("PayPal adapter not configured");
    }

    const order = await this.paypalAdapter.getOrder(paymentId);
    const status = this.paypalAdapter.getPaymentStatus(order);

    return {
      paymentId: order.id,
      status,
      amount: parseFloat(order.amount.value),
      currency: order.amount.currency_code,
      provider: "paypal",
      metadata: {
        orderId: order.id,
        status: order.status,
      },
      completedAt: order.status === "COMPLETED" && order.update_time 
        ? new Date(order.update_time) 
        : undefined,
    };
  }
}
