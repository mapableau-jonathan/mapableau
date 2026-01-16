/**
 * PayPal Payment API
 * POST /api/abilitypay/payments/paypal - Initiate PayPal payment
 * POST /api/abilitypay/payments/paypal/capture - Capture approved order
 * GET /api/abilitypay/payments/paypal - Get payment status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PaymentService } from "@/lib/services/abilitypay";
import { PaymentProviderService } from "@/lib/services/abilitypay/banking";
import { requireProviderRegistration } from "@/lib/access-control/ndis-guards";
import { validateRequestBody } from "@/lib/security/sanitize";
import { validateTransactionAmount } from "@/lib/security/transaction-security";
import { createBlockchainAdapter } from "@/lib/services/abilitypay/blockchain";
import { z } from "zod";

const blockchainConfig = {
  provider: (process.env.BLOCKCHAIN_PROVIDER || "mock") as
    | "ethereum"
    | "hyperledger"
    | "polygon"
    | "mock",
  networkUrl: process.env.BLOCKCHAIN_NETWORK_URL,
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
  contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
};

const paymentService = new PaymentService(blockchainConfig, {
  provider: "paypal",
  paypalConfig: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production",
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
  },
});

const paymentProviderService = new PaymentProviderService({
  provider: "paypal",
  paypalConfig: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production",
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
  },
});

const initiatePayPalPaymentSchema = z.object({
  participantId: z.string(),
  providerId: z.string(),
  serviceCode: z.string(),
  serviceDescription: z.string().optional(),
  amount: z.number().positive(),
  categoryId: z.string(),
  workerId: z.string().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const captureOrderSchema = z.object({
  orderId: z.string(),
  transactionId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "initiate";

    if (action === "initiate") {
      // Validate request body size
      const bodyValidation = await validateRequestBody(request, 50 * 1024);
      if (!bodyValidation.valid) {
        return NextResponse.json(
          { error: bodyValidation.error || "Invalid request" },
          { status: 400 }
        );
      }

      const body = bodyValidation.body;
      const data = initiatePayPalPaymentSchema.parse(body);

      // SECURITY: Verify user has access to the participant
      if (data.participantId !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized: Cannot make payments for other participants" },
          { status: 403 }
        );
      }

      // Validate transaction amount
      const amountValidation = validateTransactionAmount(data.amount, 0.01, 100000);
      if (!amountValidation.valid) {
        return NextResponse.json(
          { error: amountValidation.error },
          { status: 400 }
        );
      }

      // Require provider registration
      try {
        await requireProviderRegistration(
          data.providerId,
          "Provider must be registered with NDIS to receive payments"
        );
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }

      // Initiate payment (creates transaction record)
      const transaction = await paymentService.initiatePayment({
        participantId: data.participantId,
        providerId: data.providerId,
        serviceCode: data.serviceCode,
        serviceDescription: data.serviceDescription,
        amount: data.amount,
        categoryId: data.categoryId,
        workerId: data.workerId,
        paymentMethod: "paypal",
      });

      // Create PayPal order
      const paypalPayment = await paymentProviderService.initiatePayment(
        {
          amount: data.amount,
          currency: "AUD",
          description: data.serviceDescription || `NDIS Payment - ${data.serviceCode}`,
          reference: transaction.id,
          metadata: {
            transactionId: transaction.id,
            participantId: data.participantId,
            providerId: data.providerId,
            serviceCode: data.serviceCode,
            returnUrl: data.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?transactionId=${transaction.id}`,
            cancelUrl: data.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel?transactionId=${transaction.id}`,
          },
        },
        "paypal"
      );

      // Update transaction with PayPal order ID
      await paymentService.getPaymentStatus(transaction.id);

      return NextResponse.json({
        transactionId: transaction.id,
        order: {
          id: paypalPayment.paymentId,
          status: paypalPayment.status,
          approvalUrl: paypalPayment.hostedUrl,
        },
      }, { status: 201 });
    }

    if (action === "capture") {
      const body = await request.json();
      const data = captureOrderSchema.parse(body);

      // Capture the approved order
      const { PayPalAdapter } = await import("@/lib/services/abilitypay/banking/paypal-adapter");
      const paypalAdapter = new PayPalAdapter({
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production",
      });

      const capture = await paypalAdapter.captureOrder(data.orderId);

      // Execute payment in our system
      await paymentService.executePayment(data.transactionId);

      return NextResponse.json({
        success: true,
        transactionId: data.transactionId,
        capture: {
          id: capture.id,
          status: capture.status,
          amount: parseFloat(capture.amount.value),
          currency: capture.amount.currency_code,
        },
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process PayPal payment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId query parameter required" },
        { status: 400 }
      );
    }

    const status = await paymentProviderService.getPaymentStatus(
      orderId,
      "paypal"
    );

    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get payment status" },
      { status: 500 }
    );
  }
}
