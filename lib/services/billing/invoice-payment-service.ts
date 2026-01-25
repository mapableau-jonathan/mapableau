/**
 * Invoice Payment Service
 * Handles payment processing for invoices
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { BillingService } from "../core/billing-service";
import { PaymentProviderService } from "../abilitypay/banking/payment-provider";
import type { UnifiedPaymentRequest } from "../abilitypay/banking/payment-provider";

export interface InvoicePaymentRequest {
  invoiceId: string;
  paymentProvider: "stripe" | "paypal" | "npp" | "coinbase";
  savedPaymentMethodId?: string;
  metadata?: Record<string, any>;
}

/**
 * Invoice Payment Service
 */
export class InvoicePaymentService {
  private billingService: BillingService;
  private paymentProviderService: PaymentProviderService;

  constructor() {
    this.billingService = new BillingService();
    this.paymentProviderService = new PaymentProviderService({
      provider: "stripe", // Default, can be overridden
      stripeConfig: {
        apiKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
      paypalConfig: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production",
        webhookId: process.env.PAYPAL_WEBHOOK_ID,
      },
    });
  }

  /**
   * Initiate payment for an invoice
   */
  async initiatePayment(request: InvoicePaymentRequest): Promise<{
    paymentId: string;
    status: string;
    hostedUrl?: string;
    clientSecret?: string;
    approvalUrl?: string;
    metadata?: Record<string, any>;
  }> {
    try {
      // Get invoice
      const invoice = await this.billingService.getInvoice(request.invoiceId);
      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.status === "PAID") {
        throw new Error("Invoice already paid");
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: invoice.userId },
        select: { email: true, name: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get saved payment method if provided
      let savedPaymentMethod = null;
      if (request.savedPaymentMethodId) {
        savedPaymentMethod = await prisma.savedPaymentMethod.findUnique({
          where: { id: request.savedPaymentMethodId },
        });

        if (!savedPaymentMethod || savedPaymentMethod.userId !== invoice.userId) {
          throw new Error("Invalid payment method");
        }
      }

      // Prepare payment request
      const baseUrl =
        process.env.NEXTAUTH_URL ||
        process.env.AD_ID_DOMAIN ||
        "http://localhost:3000";

      const paymentRequest: UnifiedPaymentRequest = {
        amount: Number(invoice.totalAmount),
        currency: invoice.currency,
        description: `Invoice ${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          ...request.metadata,
        },
        ...(request.paymentProvider === "stripe" && {
          customerId: savedPaymentMethod?.providerPaymentMethodId,
          paymentMethodId: savedPaymentMethod?.providerPaymentMethodId,
          email: user.email || undefined,
          calculateTax: false, // Tax already included in invoice
        }),
        ...(request.paymentProvider === "paypal" && {
          returnUrl: `${baseUrl}/invoices/${invoice.id}/payment/success`,
          cancelUrl: `${baseUrl}/invoices/${invoice.id}/payment/cancel`,
        }),
      };

      // Initiate payment
      const paymentResult = await this.paymentProviderService.initiatePayment(
        paymentRequest,
        request.paymentProvider
      );

      // Update invoice with payment reference
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paymentReference: paymentResult.paymentId,
          metadata: {
            ...((invoice.metadata as any) || {}),
            paymentProvider: request.paymentProvider,
            paymentId: paymentResult.paymentId,
            paymentStatus: paymentResult.status,
          } as any,
        },
      });

      logger.info("Invoice payment initiated", {
        invoiceId: invoice.id,
        paymentId: paymentResult.paymentId,
        provider: request.paymentProvider,
        amount: invoice.totalAmount,
      });

      return {
        paymentId: paymentResult.paymentId,
        status: paymentResult.status,
        hostedUrl: paymentResult.hostedUrl,
        clientSecret: (paymentResult.metadata as any)?.clientSecret,
        approvalUrl: (paymentResult.metadata as any)?.approvalUrl,
        metadata: paymentResult.metadata,
      };
    } catch (error) {
      logger.error("Error initiating invoice payment", { error, request });
      throw error;
    }
  }

  /**
   * Handle successful payment (called from webhook)
   */
  async handlePaymentSuccess(
    invoiceId: string,
    paymentId: string,
    paymentProvider: string
  ): Promise<void> {
    try {
      const invoice = await this.billingService.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Record payment
      await this.billingService.recordPayment({
        invoiceId,
        paymentMethod: paymentProvider.toUpperCase() as any,
        paymentReference: paymentId,
        amount: Number(invoice.totalAmount),
      });

      // Update billing period if usage-based
      if ((invoice.metadata as any)?.isUsageBased) {
        const billingPeriodId = (invoice.metadata as any)?.billingPeriodId;
        if (billingPeriodId) {
          await prisma.usageBillingPeriod.update({
            where: { id: billingPeriodId },
            data: { status: "PAID" },
          });
        }
      }

      logger.info("Invoice payment completed", {
        invoiceId,
        paymentId,
        paymentProvider,
      });
    } catch (error) {
      logger.error("Error handling payment success", { error, invoiceId, paymentId });
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(
    invoiceId: string,
    paymentId: string,
    error: string
  ): Promise<void> {
    try {
      logger.warn("Invoice payment failed", {
        invoiceId,
        paymentId,
        error,
      });

      // Update invoice metadata with failure info
      const invoice = await this.billingService.getInvoice(invoiceId);
      if (invoice) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            metadata: {
              ...((invoice.metadata as any) || {}),
              lastPaymentAttempt: {
                paymentId,
                error,
                timestamp: new Date().toISOString(),
              },
            } as any,
          },
        });
      }
    } catch (error) {
      logger.error("Error handling payment failure", { error, invoiceId, paymentId });
    }
  }

  /**
   * Get payment methods for user
   */
  async getPaymentMethods(userId: string): Promise<any[]> {
    return prisma.savedPaymentMethod.findMany({
      where: { userId },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });
  }
}

// Export singleton instance
export const invoicePaymentService = new InvoicePaymentService();
