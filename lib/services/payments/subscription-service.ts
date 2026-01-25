/**
 * Subscription Service
 * Handles recurring billing subscriptions for usage-based services
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { usageBillingService } from "../billing/usage-billing-service";
import { unifiedPaymentService } from "./unified-payment-service";
import { StripeAdapter } from "../abilitypay/banking/stripe-adapter";
import { PayPalAdapter } from "../abilitypay/banking/paypal-adapter";

export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  paymentProvider: "stripe" | "paypal";
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  provider: string;
  providerSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, any>;
}

/**
 * Subscription Service
 */
export class SubscriptionService {
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
   * Create subscription for recurring usage billing
   */
  async createSubscription(
    request: CreateSubscriptionRequest
  ): Promise<Subscription> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { email: true, name: true },
      });

      if (!user?.email) {
        throw new Error("User email required for subscription");
      }

      // Create subscription based on provider
      let providerSubscriptionId: string;
      let subscriptionData: any;

      if (request.paymentProvider === "stripe") {
        // Create Stripe subscription
        const customer = await this.stripeAdapter.getOrCreateCustomer(
          user.email,
          undefined,
          user.name || undefined,
          { userId: request.userId }
        );

        // Create subscription in Stripe
        const stripe = this.stripeAdapter["stripe"]; // Access private stripe instance
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: request.planId }], // planId should be Stripe price ID
          payment_behavior: "default_incomplete",
          payment_settings: {
            payment_method_types: ["card", "link"],
            save_default_payment_method: "on_subscription",
          },
          metadata: {
            userId: request.userId,
            ...request.metadata,
          },
        });

        providerSubscriptionId = subscription.id;
        subscriptionData = {
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        };
      } else {
        // Create PayPal billing agreement
        const agreement = await this.paypalAdapter.createBillingAgreement(
          request.planId, // planId should be PayPal plan ID
          "Recurring usage billing",
          new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        );

        providerSubscriptionId = agreement.id;
        subscriptionData = {
          status: "PENDING",
          approvalUrl: agreement.approvalUrl,
        };
      }

      // Create subscription record in database
      const subscription = await prisma.subscription.create({
        data: {
          userId: request.userId,
          tier: "PREMIUM", // Or based on plan
          status: subscriptionData.status === "active" ? "ACTIVE" : "TRIAL",
          startDate: subscriptionData.currentPeriodStart || new Date(),
          endDate: subscriptionData.currentPeriodEnd,
          metadata: {
            provider: request.paymentProvider,
            providerSubscriptionId,
            planId: request.planId,
            ...request.metadata,
          } as any,
        },
      });

      logger.info("Subscription created", {
        subscriptionId: subscription.id,
        userId: request.userId,
        provider: request.paymentProvider,
      });

      return {
        id: subscription.id,
        userId: subscription.userId,
        planId: request.planId,
        status: subscription.status,
        provider: request.paymentProvider,
        providerSubscriptionId,
        currentPeriodStart: subscription.startDate,
        currentPeriodEnd: subscription.endDate || new Date(),
        cancelAtPeriodEnd: false,
        metadata: subscription.metadata as Record<string, any>,
      };
    } catch (error) {
      logger.error("Error creating subscription", { error, request });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      const metadata = subscription.metadata as any;
      const provider = metadata?.provider;
      const providerSubscriptionId = metadata?.providerSubscriptionId;

      if (provider === "stripe" && providerSubscriptionId) {
        const stripe = this.stripeAdapter["stripe"];
        if (cancelAtPeriodEnd) {
          await stripe.subscriptions.update(providerSubscriptionId, {
            cancel_at_period_end: true,
          });
        } else {
          await stripe.subscriptions.cancel(providerSubscriptionId);
        }
      } else if (provider === "paypal" && providerSubscriptionId) {
        await this.paypalAdapter.cancelBillingAgreement(providerSubscriptionId);
      }

      // Update subscription in database
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: cancelAtPeriodEnd ? "ACTIVE" : "CANCELLED",
          cancelledAt: cancelAtPeriodEnd ? undefined : new Date(),
          cancellationReason: cancelAtPeriodEnd ? "Scheduled cancellation" : "Immediate cancellation",
          metadata: {
            ...metadata,
            cancelAtPeriodEnd,
          } as any,
        },
      });

      logger.info("Subscription cancelled", {
        subscriptionId,
        cancelAtPeriodEnd,
      });
    } catch (error) {
      logger.error("Error cancelling subscription", { error, subscriptionId });
      throw error;
    }
  }

  /**
   * Process subscription renewal
   */
  async processRenewal(subscriptionId: string): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          user: true,
        },
      });

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Get current billing period usage
      const period = await usageBillingService.getOrCreateCurrentPeriod(
        subscription.userId
      );

      // Generate invoice from usage
      const invoice = await usageBillingService.generateInvoiceFromPeriod(period.id);

      // Attempt to charge invoice if auto-charge enabled
      if (process.env.AUTO_CHARGE_INVOICES === "true") {
        const metadata = subscription.metadata as any;
        const paymentMethodId = metadata?.defaultPaymentMethodId;

        if (paymentMethodId) {
          try {
            await unifiedPaymentService.processPayment(
              {
                amount: Number(invoice.totalAmount),
                currency: invoice.currency,
                description: `Subscription renewal - ${invoice.invoiceNumber}`,
                invoiceId: invoice.id,
                userId: subscription.userId,
                paymentMethodId,
                metadata: {
                  subscriptionId,
                  renewal: true,
                },
              },
              metadata?.provider || "stripe"
            );
          } catch (error) {
            logger.error("Failed to auto-charge subscription renewal", {
              error,
              subscriptionId,
              invoiceId: invoice.id,
            });
          }
        }
      }

      // Update subscription period
      const nextPeriodEnd = new Date(subscription.endDate || new Date());
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          endDate: nextPeriodEnd,
          renewalDate: nextPeriodEnd,
        },
      });

      logger.info("Subscription renewal processed", {
        subscriptionId,
        invoiceId: invoice.id,
      });
    } catch (error) {
      logger.error("Error processing subscription renewal", { error, subscriptionId });
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return null;
    }

    const metadata = subscription.metadata as any;

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: metadata?.planId || "",
      status: subscription.status,
      provider: metadata?.provider || "stripe",
      providerSubscriptionId: metadata?.providerSubscriptionId || "",
      currentPeriodStart: subscription.startDate,
      currentPeriodEnd: subscription.endDate || new Date(),
      cancelAtPeriodEnd: !!subscription.cancelledAt,
      metadata,
    };
  }

  /**
   * List user subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return subscriptions.map((sub) => {
      const metadata = sub.metadata as any;
      return {
        id: sub.id,
        userId: sub.userId,
        planId: metadata?.planId || "",
        status: sub.status,
        provider: metadata?.provider || "stripe",
        providerSubscriptionId: metadata?.providerSubscriptionId || "",
        currentPeriodStart: sub.startDate,
        currentPeriodEnd: sub.endDate || new Date(),
        cancelAtPeriodEnd: !!sub.cancelledAt,
        metadata,
      };
    });
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
