/**
 * Unified Payment Service
 * Abstracts differences between payment providers (Stripe, PayPal)
 */

import { StripeAdapter } from "../abilitypay/banking/stripe-adapter";
import { PayPalAdapter } from "../abilitypay/banking/paypal-adapter";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type PaymentProvider = "stripe" | "paypal";

export interface UnifiedPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  invoiceId?: string;
  userId: string;
  customerId?: string; // Stripe customer ID or PayPal payer ID
  paymentMethodId?: string; // Saved payment method ID
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface UnifiedPaymentResult {
  provider: PaymentProvider;
  paymentId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  clientSecret?: string; // For Stripe
  approvalUrl?: string; // For PayPal
  hostedUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Unified Payment Service
 */
export class UnifiedPaymentService {
  private stripeAdapter: StripeAdapter;
  private paypalAdapter: PayPalAdapter;

  constructor() {
    this.stripeAdapter = new StripeAdapter({
      apiKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    this.paypalAdapter = new PayPalAdapter({
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production",
    });
  }

  /**
   * Process payment with specified provider
   */
  async processPayment(
    request: UnifiedPaymentRequest,
    provider: PaymentProvider
  ): Promise<UnifiedPaymentResult> {
    try {
      switch (provider) {
        case "stripe":
          return await this.processStripePayment(request);
        case "paypal":
          return await this.processPayPalPayment(request);
        default:
          throw new Error(`Unsupported payment provider: ${provider}`);
      }
    } catch (error) {
      logger.error("Error processing payment", { error, provider, request });
      throw error;
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(
    request: UnifiedPaymentRequest
  ): Promise<UnifiedPaymentResult> {
    // Get or create Stripe customer
    let customerId = request.customerId;
    if (!customerId) {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        const customer = await this.stripeAdapter.getOrCreateCustomer(
          user.email,
          undefined,
          user.name || undefined,
          { userId: request.userId }
        );
        customerId = customer.id;
      }
    }

    // Get saved payment method if provided
    let paymentMethodId = request.paymentMethodId;
    if (paymentMethodId) {
      const savedMethod = await prisma.savedPaymentMethod.findUnique({
        where: { id: paymentMethodId },
      });

      if (savedMethod && savedMethod.provider === "stripe") {
        paymentMethodId = savedMethod.providerPaymentMethodId;
      }
    }

    // Create payment intent
    const paymentIntent = await this.stripeAdapter.createPaymentIntent({
      amount: request.amount,
      currency: request.currency.toLowerCase(),
      description: request.description,
      customerId,
      paymentMethodId,
      metadata: {
        userId: request.userId,
        ...(request.invoiceId && { invoiceId: request.invoiceId }),
        ...request.metadata,
      },
      calculateTax: false, // Tax should be included in amount
    });

    return {
      provider: "stripe",
      paymentId: paymentIntent.id,
      status: paymentIntent.status === "succeeded" ? "COMPLETED" : "PENDING",
      clientSecret: paymentIntent.client_secret,
      metadata: {
        ...paymentIntent.metadata,
        customerId,
      },
    };
  }

  /**
   * Process PayPal payment
   */
  private async processPayPalPayment(
    request: UnifiedPaymentRequest
  ): Promise<UnifiedPaymentResult> {
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.AD_ID_DOMAIN ||
      "http://localhost:3000";

    const order = await this.paypalAdapter.createOrder({
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      returnUrl: request.returnUrl || `${baseUrl}/payments/success`,
      cancelUrl: request.cancelUrl || `${baseUrl}/payments/cancel`,
      metadata: {
        userId: request.userId,
        ...(request.invoiceId && { invoiceId: request.invoiceId }),
        ...request.metadata,
      },
    });

    const approvalUrl = this.paypalAdapter.getApprovalUrl(order);

    return {
      provider: "paypal",
      paymentId: order.id,
      status: order.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      approvalUrl: approvalUrl || undefined,
      metadata: {
        orderId: order.id,
        status: order.status,
      },
    };
  }

  /**
   * Confirm payment (for Stripe)
   */
  async confirmPayment(
    provider: PaymentProvider,
    paymentId: string,
    paymentMethodId?: string
  ): Promise<UnifiedPaymentResult> {
    if (provider === "stripe") {
      const paymentIntent = await this.stripeAdapter.confirmPaymentIntent(
        paymentId,
        paymentMethodId
      );

      return {
        provider: "stripe",
        paymentId: paymentIntent.id,
        status: paymentIntent.status === "succeeded" ? "COMPLETED" : "PENDING",
        clientSecret: paymentIntent.client_secret,
        metadata: paymentIntent.metadata,
      };
    }

    throw new Error("Confirm payment only supported for Stripe");
  }

  /**
   * Capture payment (for PayPal)
   */
  async capturePayment(paymentId: string): Promise<UnifiedPaymentResult> {
    const capture = await this.paypalAdapter.captureOrder(paymentId);

    return {
      provider: "paypal",
      paymentId: capture.id,
      status: capture.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      metadata: {
        captureId: capture.id,
        status: capture.status,
      },
    };
  }

  /**
   * Save payment method
   */
  async savePaymentMethod(
    provider: PaymentProvider,
    userId: string,
    paymentMethodData: {
      providerPaymentMethodId: string;
      type: string;
      last4?: string;
      brand?: string;
      expiryMonth?: number;
      expiryYear?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    // Check if already exists
    const existing = await prisma.savedPaymentMethod.findFirst({
      where: {
        userId,
        provider,
        providerPaymentMethodId: paymentMethodData.providerPaymentMethodId,
      },
    });

    if (existing) {
      return existing;
    }

    // Set as default if user has no other payment methods
    const hasOtherMethods = await prisma.savedPaymentMethod.count({
      where: { userId },
    });

    const savedMethod = await prisma.savedPaymentMethod.create({
      data: {
        userId,
        provider,
        providerPaymentMethodId: paymentMethodData.providerPaymentMethodId,
        type: paymentMethodData.type,
        isDefault: hasOtherMethods === 0,
        last4: paymentMethodData.last4,
        brand: paymentMethodData.brand,
        expiryMonth: paymentMethodData.expiryMonth,
        expiryYear: paymentMethodData.expiryYear,
        metadata: paymentMethodData.metadata,
      },
    });

    logger.info("Payment method saved", {
      userId,
      provider,
      paymentMethodId: savedMethod.id,
    });

    return savedMethod;
  }

  /**
   * Get saved payment methods for user
   */
  async getSavedPaymentMethods(
    userId: string,
    provider?: PaymentProvider
  ): Promise<any[]> {
    const where: any = { userId };
    if (provider) {
      where.provider = provider;
    }

    return prisma.savedPaymentMethod.findMany({
      where,
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  /**
   * Delete saved payment method
   */
  async deletePaymentMethod(paymentMethodId: string, userId: string): Promise<void> {
    const method = await prisma.savedPaymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!method || method.userId !== userId) {
      throw new Error("Payment method not found or access denied");
    }

    // Detach from provider if needed
    if (method.provider === "stripe") {
      try {
        await this.stripeAdapter.detachPaymentMethod(method.providerPaymentMethodId);
      } catch (error) {
        logger.warn("Failed to detach Stripe payment method", { error });
      }
    } else if (method.provider === "paypal") {
      try {
        await this.paypalAdapter.deleteVaultToken(method.providerPaymentMethodId);
      } catch (error) {
        logger.warn("Failed to delete PayPal vault token", { error });
      }
    }

    await prisma.savedPaymentMethod.delete({
      where: { id: paymentMethodId },
    });
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    paymentMethodId: string,
    userId: string
  ): Promise<void> {
    const method = await prisma.savedPaymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!method || method.userId !== userId) {
      throw new Error("Payment method not found or access denied");
    }

    // Unset other default methods
    await prisma.savedPaymentMethod.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this as default
    await prisma.savedPaymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });

    // Update in Stripe if applicable
    if (method.provider === "stripe") {
      try {
        // Get Stripe customer ID
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (user?.email) {
          const customer = await this.stripeAdapter.getOrCreateCustomer(user.email);
          await this.stripeAdapter.setDefaultPaymentMethod(
            customer.id,
            method.providerPaymentMethodId
          );
        }
      } catch (error) {
        logger.warn("Failed to set default payment method in Stripe", { error });
      }
    }
  }
}

// Export singleton instance
export const unifiedPaymentService = new UnifiedPaymentService();
