/**
 * AbilityPay WebObjects Payment Terminal API
 * POST /api/abilitypay/payments/terminal - Initiate payment via terminal
 * GET /api/abilitypay/payments/terminal/status - Get payment status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPaymentService } from "@/lib/services/payments/human-services-ndis-payment";
import { z } from "zod";

const terminalPaymentSchema = z.object({
  // Payment configuration
  providerId: z.string(),
  serviceCode: z.string().optional(),
  serviceDescription: z.string().optional(),
  amount: z.number().positive(),
  categoryId: z.string().optional(),
  workerId: z.string().optional(),
  
  // Service type
  serviceType: z.enum(["NDIS", "HUMAN_SERVICES"]).optional().default("NDIS"),
  
  // Payment method
  paymentMethod: z.enum(["stripe", "paypal", "blockchain", "coinbase"]),
  
  // Payment details (for Stripe/PayPal)
  email: z.string().email().optional(),
  phone: z.string().optional(),
  
  // Configuration
  enableTaxCalculation: z.boolean().optional().default(true),
  enableSMSVerification: z.boolean().optional().default(true),
});

const paymentStatusSchema = z.object({
  transactionId: z.string(),
});

/**
 * POST /api/abilitypay/payments/terminal
 * Initiate payment via WebObjects terminal
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", requiresAuth: true },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = terminalPaymentSchema.parse(body);

    const participantId = session.user.id;

    // Get payment service
    const paymentService = getPaymentService();

    // Process payment based on service type
    let result;
    if (data.serviceType === "NDIS") {
      if (!data.categoryId) {
        return NextResponse.json(
          { error: "Category ID is required for NDIS payments" },
          { status: 400 }
        );
      }

      result = await paymentService.processNDISPayment({
        participantId,
        providerId: data.providerId,
        serviceCode: data.serviceCode || "UNKNOWN",
        serviceDescription: data.serviceDescription,
        amount: data.amount,
        categoryId: data.categoryId,
        workerId: data.workerId,
        paymentMethod: data.paymentMethod,
        stripeEmail: data.email,
        stripePhone: data.phone,
      });
    } else {
      // Human Services payment
      result = await paymentService.processHumanServicesPayment({
        userId: participantId,
        providerId: data.providerId,
        serviceType: data.serviceCode || "HUMAN_SERVICES",
        serviceDescription: data.serviceDescription || "Human Services Payment",
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        stripeEmail: data.email,
      });
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      paymentMethod: result.provider,
      amount: result.amount,
      currency: result.currency,
      // Include payment provider specific details
      paymentIntentId: result.paymentIntentId,
      orderId: result.orderId,
      approvalUrl: result.approvalUrl,
      clientSecret: result.clientSecret,
      hostedUrl: result.hostedUrl,
      blockchainTxHash: result.blockchainTxHash,
      metadata: result.metadata,
      createdAt: result.createdAt,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Terminal payment error:", error);
    return NextResponse.json(
      { error: error.message || "Payment processing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/abilitypay/payments/terminal/status
 * Get payment status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");

    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId query parameter required" },
        { status: 400 }
      );
    }

    const paymentService = getPaymentService();
    const status = await paymentService.getPaymentStatus(transactionId);

    if (!status) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transactionId: status.transactionId,
      status: status.status,
      paymentMethod: status.provider,
      amount: status.amount,
      currency: status.currency,
      paymentIntentId: status.paymentIntentId,
      orderId: status.orderId,
      blockchainTxHash: status.blockchainTxHash,
      metadata: status.metadata,
      createdAt: status.createdAt,
    });
  } catch (error: any) {
    console.error("Get payment status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get payment status" },
      { status: 500 }
    );
  }
}
