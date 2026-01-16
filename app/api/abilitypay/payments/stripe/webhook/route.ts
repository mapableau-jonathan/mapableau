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
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event);
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
