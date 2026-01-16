/**
 * PayPal Webhook Handler
 * POST /api/abilitypay/payments/paypal/webhook - Handle PayPal webhook events
 */

import { NextRequest, NextResponse } from "next/server";
import { PayPalAdapter } from "@/lib/services/abilitypay/banking/paypal-adapter";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const paypalAdapter = new PayPalAdapter({
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production",
});

export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Get raw body
    const body = await request.text();

    // Verify webhook signature
    const isValid = await paypalAdapter.verifyWebhookSignature(
      headers,
      body,
      process.env.PAYPAL_WEBHOOK_ID
    );

    if (!isValid) {
      logger.warn("PayPal webhook signature verification failed");
      // In development, continue; in production, reject
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    // Parse webhook event
    const event = paypalAdapter.parseWebhookEvent(body);

    // Handle different event types
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        await handlePaymentCaptureCompleted(event);
        break;

      case "PAYMENT.CAPTURE.DENIED":
        await handlePaymentCaptureDenied(event);
        break;

      case "PAYMENT.CAPTURE.REFUNDED":
        await handlePaymentCaptureRefunded(event);
        break;

      case "PAYMENT.CAPTURE.REVERSED":
        await handlePaymentCaptureReversed(event);
        break;

      case "CHECKOUT.ORDER.APPROVED":
        await handleOrderApproved(event);
        break;

      case "CHECKOUT.ORDER.COMPLETED":
        await handleOrderCompleted(event);
        break;

      case "CHECKOUT.ORDER.CANCELLED":
        await handleOrderCancelled(event);
        break;

      default:
        logger.debug(`Unhandled PayPal webhook event type: ${event.event_type}`);
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error("PayPal webhook error", error);
    
    // Still return 200 to prevent PayPal from retrying
    return NextResponse.json(
      { error: error.message },
      { status: 200 }
    );
  }
}

/**
 * Handle payment capture completed
 */
async function handlePaymentCaptureCompleted(event: any) {
  const capture = event.resource;
  const orderId = capture.supplementary_data?.related_ids?.order_id;
  const transactionId = capture.custom_id || capture.invoice_id;

  if (transactionId) {
    try {
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { id: transactionId },
      });

      if (transaction && transaction.status === "PENDING") {
        // Update transaction to completed
        await prisma.paymentTransaction.update({
          where: { id: transactionId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            blockchainTxHash: capture.id, // Store PayPal capture ID
            validationResult: {
              paymentMethod: "paypal",
              paypalOrderId: orderId,
              paypalCaptureId: capture.id,
              status: "COMPLETED",
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
      logger.error("Error processing PAYMENT.CAPTURE.COMPLETED", error);
    }
  }

  logger.info(`PayPal payment capture completed: ${capture.id}`);
}

/**
 * Handle payment capture denied
 */
async function handlePaymentCaptureDenied(event: any) {
  const capture = event.resource;
  const transactionId = capture.custom_id || capture.invoice_id;

  if (transactionId) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: transactionId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: {
        status: "FAILED",
        validationResult: {
          paymentMethod: "paypal",
          paypalCaptureId: capture.id,
          status: "DENIED",
          error: "Payment capture was denied",
        } as any,
      },
    });
  }

  logger.info(`PayPal payment capture denied: ${capture.id}`);
}

/**
 * Handle payment capture refunded
 */
async function handlePaymentCaptureRefunded(event: any) {
  const refund = event.resource;
  const captureId = refund.capture_id;
  
  logger.info(`PayPal payment capture refunded: ${captureId}`);
  // Handle refund logic if needed
}

/**
 * Handle payment capture reversed
 */
async function handlePaymentCaptureReversed(event: any) {
  const reversal = event.resource;
  const captureId = reversal.capture_id;
  const transactionId = reversal.custom_id;

  if (transactionId) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: transactionId,
        status: "COMPLETED",
      },
      data: {
        status: "FAILED",
        validationResult: {
          paymentMethod: "paypal",
          paypalCaptureId: captureId,
          status: "REVERSED",
          error: "Payment was reversed",
        } as any,
      },
    });
  }

  logger.info(`PayPal payment capture reversed: ${captureId}`);
}

/**
 * Handle order approved
 */
async function handleOrderApproved(event: any) {
  const order = event.resource;
  logger.info(`PayPal order approved: ${order.id}`);
  // Order is approved but not yet captured
  // Transaction status remains PENDING
}

/**
 * Handle order completed
 */
async function handleOrderCompleted(event: any) {
  const order = event.resource;
  const transactionId = order.purchase_units?.[0]?.custom_id;

  if (transactionId) {
    try {
      // Check if order has been captured
      const captures = order.purchase_units?.[0]?.payments?.captures;
      if (captures && captures.length > 0) {
        const capture = captures[0];
        await handlePaymentCaptureCompleted({
          resource: capture,
          event_type: "PAYMENT.CAPTURE.COMPLETED",
        });
      }
    } catch (error) {
      logger.error("Error processing CHECKOUT.ORDER.COMPLETED", error);
    }
  }

  logger.info(`PayPal order completed: ${order.id}`);
}

/**
 * Handle order cancelled
 */
async function handleOrderCancelled(event: any) {
  const order = event.resource;
  const transactionId = order.purchase_units?.[0]?.custom_id;

  if (transactionId) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: transactionId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: {
        status: "FAILED",
        validationResult: {
          paymentMethod: "paypal",
          paypalOrderId: order.id,
          status: "CANCELLED",
        } as any,
      },
    });
  }

  logger.info(`PayPal order cancelled: ${order.id}`);
}
