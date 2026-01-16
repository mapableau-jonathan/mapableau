/**
 * Coinbase Webhook Handler
 * POST /api/abilitypay/payments/coinbase/webhook - Handle Coinbase webhook events
 */

import { NextRequest, NextResponse } from "next/server";
import { CoinbaseAdapter } from "@/lib/services/abilitypay/banking";
import { prisma } from "@/lib/prisma";

const coinbaseAdapter = new CoinbaseAdapter({
  apiKey: process.env.COINBASE_API_KEY,
  apiSecret: process.env.COINBASE_API_SECRET,
  apiUrl: process.env.COINBASE_API_URL,
  webhookSecret: process.env.COINBASE_WEBHOOK_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature and timestamp from headers
    const signature = request.headers.get("x-cc-webhook-signature") || "";
    const timestamp = request.headers.get("x-cc-webhook-timestamp") || "";

    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing webhook signature or timestamp" },
        { status: 400 }
      );
    }

    // Get raw body
    const body = await request.text();

    // Parse and verify webhook event
    const event = coinbaseAdapter.parseWebhookEvent(body, signature, timestamp);

    if (!event) {
      return NextResponse.json(
        { error: "Invalid webhook event" },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case "charge:created":
        await handleChargeCreated(event);
        break;

      case "charge:confirmed":
        await handleChargeConfirmed(event);
        break;

      case "charge:failed":
        await handleChargeFailed(event);
        break;

      case "charge:delayed":
        await handleChargeDelayed(event);
        break;

      case "charge:pending":
        await handleChargePending(event);
        break;

      case "charge:resolved":
        await handleChargeResolved(event);
        break;

      default:
        console.warn(`Unhandled webhook event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Coinbase webhook error:", error);
    
    // Still return 200 to prevent Coinbase from retrying
    // Log the error for investigation
    return NextResponse.json(
      { error: error.message },
      { status: 200 }
    );
  }
}

/**
 * Handle charge created event
 */
async function handleChargeCreated(event: any) {
  const charge = event.data;
  const reference = charge.metadata?.reference;

  if (reference) {
    // Update payment transaction if it exists
    await prisma.paymentTransaction.updateMany({
      where: {
        id: reference,
        status: "PENDING",
      },
      data: {
        blockchainTxHash: charge.code, // Store Coinbase charge code
        validationResult: {
          coinbaseChargeId: charge.code,
          coinbaseChargeUrl: charge.hosted_url,
          status: "CREATED",
        } as any,
      },
    });
  }

  console.log(`Coinbase charge created: ${charge.code}`);
}

/**
 * Handle charge confirmed (paid) event
 */
async function handleChargeConfirmed(event: any) {
  const charge = event.data;
  const reference = charge.metadata?.reference;

  if (reference) {
    // Find payment transaction
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: reference },
    });

    if (transaction && transaction.status === "PENDING") {
      // Update transaction to completed
      await prisma.paymentTransaction.update({
        where: { id: reference },
        data: {
          status: "COMPLETED",
          completedAt: new Date(charge.confirmed_at),
          blockchainTxHash: charge.code,
          validationResult: {
            coinbaseChargeId: charge.code,
            coinbasePaymentId: charge.payments?.[0]?.transaction_id,
            status: "CONFIRMED",
            payments: charge.payments,
          } as any,
        },
      });

      // Update voucher and category if applicable
      if (transaction.voucherId) {
        await prisma.tokenVoucher.update({
          where: { id: transaction.voucherId },
          data: {
            status: "SPENT",
            spentAt: new Date(charge.confirmed_at),
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
  }

  console.log(`Coinbase charge confirmed: ${charge.code}`);
}

/**
 * Handle charge failed event
 */
async function handleChargeFailed(event: any) {
  const charge = event.data;
  const reference = charge.metadata?.reference;

  if (reference) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: reference,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: {
        status: "FAILED",
        validationResult: {
          coinbaseChargeId: charge.code,
          status: "FAILED",
          error: "Payment failed on Coinbase",
        } as any,
      },
    });
  }

  console.log(`Coinbase charge failed: ${charge.code}`);
}

/**
 * Handle charge delayed event
 */
async function handleChargeDelayed(event: any) {
  const charge = event.data;
  console.log(`Coinbase charge delayed: ${charge.code} - Manual review may be required`);
  
  // Optionally update transaction status or send notification
}

/**
 * Handle charge pending event
 */
async function handleChargePending(event: any) {
  const charge = event.data;
  const reference = charge.metadata?.reference;

  if (reference) {
    await prisma.paymentTransaction.updateMany({
      where: {
        id: reference,
        status: "PENDING",
      },
      data: {
        status: "PROCESSING",
        validationResult: {
          coinbaseChargeId: charge.code,
          status: "PENDING",
        } as any,
      },
    });
  }

  console.log(`Coinbase charge pending: ${charge.code}`);
}

/**
 * Handle charge resolved event
 */
async function handleChargeResolved(event: any) {
  const charge = event.data;
  const reference = charge.metadata?.reference;

  if (reference) {
    // Charge was manually resolved (e.g., after review)
    await prisma.paymentTransaction.updateMany({
      where: {
        id: reference,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        validationResult: {
          coinbaseChargeId: charge.code,
          status: "RESOLVED",
        } as any,
      },
    });
  }

  console.log(`Coinbase charge resolved: ${charge.code}`);
}
