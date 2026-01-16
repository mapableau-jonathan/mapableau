/**
 * Stripe Payment API
 * POST /api/abilitypay/payments/stripe - Initiate Stripe Link payment
 * POST /api/abilitypay/payments/stripe/verify-sms - Verify SMS code for payment
 * GET /api/abilitypay/payments/stripe - Get payment status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PaymentService } from "@/lib/services/abilitypay";
import { PaymentProviderService } from "@/lib/services/abilitypay/banking";
import { TwilioSMSService } from "@/lib/services/verification/twilio-sms";
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
  provider: "stripe",
  stripeConfig: {
    apiKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
});

const paymentProviderService = new PaymentProviderService({
  provider: "stripe",
  stripeConfig: {
    apiKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
});

const smsService = new TwilioSMSService({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_PHONE_NUMBER,
  verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
});

const initiateStripePaymentSchema = z.object({
  participantId: z.string(),
  providerId: z.string(),
  serviceCode: z.string(),
  serviceDescription: z.string().optional(),
  amount: z.number().positive(),
  categoryId: z.string(),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  workerId: z.string().optional(),
  // Tax calculation
  calculateTax: z.boolean().optional(),
  customerAddress: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  shippingAddress: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

const verifySMSSchema = z.object({
  transactionId: z.string(),
  phoneNumber: z.string(),
  verificationCode: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
  paymentIntentId: z.string(),
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
      const data = initiateStripePaymentSchema.parse(body);

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
        paymentMethod: "stripe",
      });

      // Create Stripe payment intent
      const stripePayment = await paymentProviderService.initiatePayment(
        {
          amount: data.amount,
          currency: "AUD",
          description: data.serviceDescription || `NDIS Payment - ${data.serviceCode}`,
          reference: transaction.id,
          email: data.email,
          phone: data.phone,
          calculateTax: data.calculateTax || false,
          customerAddress: data.customerAddress,
          shippingAddress: data.shippingAddress,
          metadata: {
            transactionId: transaction.id,
            participantId: data.participantId,
            providerId: data.providerId,
            serviceCode: data.serviceCode,
          },
        },
        "stripe"
      );

      // Send SMS verification code
      const smsResult = await smsService.sendVerificationCode({
        phoneNumber: data.phone,
        userId: session.user.id,
        purpose: "payment",
      });

      if (!smsResult.success) {
        // Payment intent created but SMS failed - still return payment intent
        // User can retry SMS verification
        return NextResponse.json({
          transactionId: transaction.id,
          paymentIntent: {
            id: stripePayment.paymentId,
            clientSecret: stripePayment.metadata?.clientSecret,
            status: stripePayment.status,
          },
          smsVerification: {
            sent: false,
            error: smsResult.error,
          },
        }, { status: 201 });
      }

      // Update transaction with Stripe payment intent ID
      await paymentService.getPaymentStatus(transaction.id); // This will update the transaction

      return NextResponse.json({
        transactionId: transaction.id,
        paymentIntent: {
          id: stripePayment.paymentId,
          clientSecret: stripePayment.metadata?.clientSecret,
          status: stripePayment.status,
        },
        taxCalculation: stripePayment.metadata?.taxCalculation,
        smsVerification: {
          sent: true,
          verificationId: smsResult.verificationId,
          expiresAt: smsResult.expiresAt,
        },
      }, { status: 201 });
    }

    if (action === "verify-sms") {
      const body = await request.json();
      const data = verifySMSSchema.parse(body);

      // Verify SMS code
      const verificationResult = await smsService.verifyCode({
        phoneNumber: data.phoneNumber,
        code: data.verificationCode,
        verificationId: data.transactionId, // Use transaction ID as verification ID
      });

      if (!verificationResult.valid) {
        return NextResponse.json(
          { error: verificationResult.error || "Invalid verification code" },
          { status: 400 }
        );
      }

      // SMS verified - confirm payment intent
      const { StripeAdapter } = await import("@/lib/services/abilitypay/banking/stripe-adapter");
      const stripeAdapter = new StripeAdapter({
        apiKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      });

      const confirmedPayment = await stripeAdapter.confirmPaymentIntent(
        data.paymentIntentId
      );

      // Execute payment in our system
      await paymentService.executePayment(data.transactionId);

      return NextResponse.json({
        success: true,
        transactionId: data.transactionId,
        paymentIntent: {
          id: confirmedPayment.id,
          status: confirmedPayment.status,
        },
        verifiedAt: verificationResult.verifiedAt,
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
      { error: error.message || "Failed to process Stripe payment" },
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
    const paymentIntentId = searchParams.get("paymentIntentId");

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "paymentIntentId query parameter required" },
        { status: 400 }
      );
    }

    const status = await paymentProviderService.getPaymentStatus(
      paymentIntentId,
      "stripe"
    );

    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get payment status" },
      { status: 500 }
    );
  }
}
