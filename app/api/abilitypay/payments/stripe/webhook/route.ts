/**
 * Stripe Webhook Handler
 * POST /api/abilitypay/payments/stripe/webhook - Handle Stripe webhook events
 */

import { NextRequest, NextResponse } from "next/server";
import { StripeAdapter } from "@/lib/services/abilitypay/banking/stripe-adapter";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const stripeAdapter = new StripeAdapter({
  apiKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from header
    const signature = request.headers.get("stripe-signature");
    
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Get raw body
    const body = await request.text();

    // Verify and parse webhook event
    const event = stripeAdapter.verifyWebhookSignature(body, signature);

    // Handle different event types
    // Each case is explicitly separated to prevent event routing issues
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event);
        break;

      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(event);
        break;

      case "payment_intent.requires_action":
        await handlePaymentIntentRequiresAction(event);
        break;

      case "payment_intent.processing":
        await handlePaymentIntentProcessing(event);
        break;

      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event);
        break;

      case "customer.subscription.created":
        await handleSubscriptionUpdated(event);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      case "payment_method.attached":
        await handlePaymentMethodAttached(event);
        break;

      default:
        logger.debug(`Unhandled Stripe webhook event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error("Stripe webhook error", error);
    
    // Still return 200 to prevent Stripe from retrying
    return NextResponse.json(
      { error: error.message },
      { status: 200 }
    );
  }
}

/**
 * Handle payment intent succeeded
 */
async function handlePaymentIntentSucceeded(event: any) {
  const paymentIntent = event.data.object;
  const transactionId = paymentIntent.metadata?.transactionId;

  if (transactionId) {
    try {
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { id: transactionId },
      });

      if (transaction && transaction.status === "PENDING") {
        // Create tax transaction if tax calculation ID exists
        let taxTransactionId = null;
        if (paymentIntent.metadata?.tax_calculation_id) {
          try {
            taxTransactionId = await stripeAdapter.createTaxTransaction(
              paymentIntent.metadata.tax_calculation_id,
              paymentIntent.id
            );
          } catch (error: any) {
            logger.warn("Failed to create tax transaction", error);
          }
        }

        // Update transaction to completed
        await prisma.paymentTransaction.update({
          where: { id: transactionId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            blockchainTxHash: paymentIntent.id, // Store Stripe payment intent ID
            validationResult: {
              paymentMethod: "stripe",
              stripePaymentIntentId: paymentIntent.id,
              status: "SUCCEEDED",
              ...(taxTransactionId && { taxTransactionId }),
            } as any,
          },
        });

        // Update voucher and category if applicable
        if (transaction.voucherId) {
          await prisma.tokenVoucher.update({
            where: { id: transaction.voucherId },
            data: {
              status: "SPENT",
              spentAt: new Date(),
            },
          });

          // Update category spent amount
          const voucher = await prisma.tokenVoucher.findUnique({
            where: { id: transaction.voucherId },
            include: { category: true },
          });

          if (voucher) {
            await prisma.budgetCategory.update({
              where: { id: voucher.categoryId },
              data: {
                spentAmount: {
                  increment: Number(transaction.amount),
                },
                remainingAmount: {
                  decrement: Number(transaction.amount),
                },
              },
            });
          }
        }
      }
    } catch (error) {
      logger.error("Error processing payment_intent.succeeded", error);
    }
  }

  logger.info(`Stripe payment succeeded: ${paymentIntent.id}`);
}

/**
 * Handle payment intent failed
 */
async function handlePaymentIntentFailed(event: any) {
  const paymentIntent = event.data.object;
  const transactionId = paymentIntent.metadata?.transactionId;

  if (transactionId) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: transactionId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: {
        status: "FAILED",
        validationResult: {
          paymentMethod: "stripe",
          stripePaymentIntentId: paymentIntent.id,
          status: "FAILED",
          error: paymentIntent.last_payment_error?.message || "Payment failed",
        } as any,
      },
    });
  }

  logger.info(`Stripe payment failed: ${paymentIntent.id}`);
}

/**
 * Handle payment intent canceled
 */
async function handlePaymentIntentCanceled(event: any) {
  const paymentIntent = event.data.object;
  const transactionId = paymentIntent.metadata?.transactionId;

  if (transactionId) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: transactionId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: {
        status: "FAILED",
        validationResult: {
          paymentMethod: "stripe",
          stripePaymentIntentId: paymentIntent.id,
          status: "CANCELED",
        } as any,
      },
    });
  }

  logger.info(`Stripe payment canceled: ${paymentIntent.id}`);
}

/**
 * Handle payment intent requires action
 */
async function handlePaymentIntentRequiresAction(event: any) {
  const paymentIntent = event.data.object;
  logger.info(`Stripe payment requires action: ${paymentIntent.id}`);
  // Payment may require additional authentication (3D Secure, etc.)
  // Transaction status remains PENDING until action is completed
}

/**
 * Handle payment intent processing
 */
async function handlePaymentIntentProcessing(event: any) {
  const paymentIntent = event.data.object;
  const transactionId = paymentIntent.metadata?.transactionId;

  if (transactionId) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: transactionId,
        status: "PENDING",
      },
      data: {
        status: "PROCESSING",
        validationResult: {
          paymentMethod: "stripe",
          stripePaymentIntentId: paymentIntent.id,
          status: "PROCESSING",
        } as any,
      },
    });
  }

  logger.info(`Stripe payment processing: ${paymentIntent.id}`);
}

/**
 * Handle setup intent succeeded - save payment method
 */
async function handleSetupIntentSucceeded(event: any) {
  const setupIntent = event.data.object;
  const userId = setupIntent.metadata?.userId;

  if (userId && setupIntent.payment_method) {
    try {
      const pm = await stripeAdapter.getPaymentMethod(setupIntent.payment_method);
      const { unifiedPaymentService } = await import("@/lib/services/payments/unified-payment-service");

      await unifiedPaymentService.savePaymentMethod("stripe", userId, {
        providerPaymentMethodId: setupIntent.payment_method,
        type: pm.type,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        metadata: { setupIntentId: setupIntent.id },
      });

      logger.info(`Payment method saved: ${setupIntent.payment_method}`);
    } catch (error) {
      logger.error("Error saving payment method from setup intent", error);
    }
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(event: any) {
  const subscription = event.data.object;
  const subscriptionId = subscription.metadata?.subscriptionId;

  if (subscriptionId) {
    try {
      const { subscriptionService } = await import("@/lib/services/payments/subscription-service");
      // Update subscription status
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: subscription.status === "active" ? "ACTIVE" : "TRIAL",
          endDate: new Date(subscription.current_period_end * 1000),
          metadata: {
            ...((await prisma.subscription.findUnique({ where: { id: subscriptionId } }))?.metadata as any || {}),
            providerSubscriptionId: subscription.id,
            status: subscription.status,
          } as any,
        },
      });

      logger.info(`Subscription updated: ${subscriptionId}`);
    } catch (error) {
      logger.error("Error updating subscription", error);
    }
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(event: any) {
  const subscription = event.data.object;
  const subscriptionId = subscription.metadata?.subscriptionId;

  if (subscriptionId) {
    try {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      logger.info(`Subscription cancelled: ${subscriptionId}`);
    } catch (error) {
      logger.error("Error cancelling subscription", error);
    }
  }
}

/**
 * Handle payment method attached
 */
async function handlePaymentMethodAttached(event: any) {
  const paymentMethod = event.data.object;
  const userId = paymentMethod.metadata?.userId;

  if (userId) {
    try {
      const { unifiedPaymentService } = await import("@/lib/services/payments/unified-payment-service");
      await unifiedPaymentService.savePaymentMethod("stripe", userId, {
        providerPaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand,
        expiryMonth: paymentMethod.card?.exp_month,
        expiryYear: paymentMethod.card?.exp_year,
      });

      logger.info(`Payment method attached: ${paymentMethod.id}`);
    } catch (error) {
      logger.error("Error saving attached payment method", error);
    }
  }
}
