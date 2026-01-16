/**
 * Payment Processing API
 * POST /api/abilitypay/payments - Initiate payment
 * GET /api/abilitypay/payments - Get payment history
 */

import { z } from "zod";
import { getPaymentService } from "@/lib/services/service-factory";
import { requireProviderRegistration } from "@/lib/access-control/ndis-guards";
import { validateTransactionAmount } from "@/lib/security/transaction-security";
import { createPostHandler, createGetHandler, getQueryParams } from "@/lib/api/route-handler";
import { successResponse, createdResponse, errorResponse } from "@/lib/utils/response";
import { hasResourceAccess } from "@/lib/security/authorization-utils";
import { PaymentSecurityService } from "@/lib/services/abilitypay/payment-security";

const initiatePaymentSchema = z.object({
  participantId: z.string(),
  providerId: z.string(),
  serviceCode: z.string(),
  serviceDescription: z.string().optional(),
  amount: z.number().positive(),
  categoryId: z.string(),
  voucherId: z.string().optional(),
  workerId: z.string().optional(),
  paymentMethod: z.enum(["blockchain", "coinbase", "npp", "stripe", "paypal"]).optional(),
  coinbaseRedirectUrl: z.string().url().optional(),
  coinbaseCancelUrl: z.string().url().optional(),
  stripeEmail: z.string().email().optional(),
  stripePhone: z.string().optional(),
  paypalReturnUrl: z.string().url().optional(),
  paypalCancelUrl: z.string().url().optional(),
  // Security verification
  totpToken: z.string().optional(),
  backupCode: z.string().optional(),
  biometricCredential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.string(),
  }).optional(),
});

const getPaymentsQuerySchema = z.object({
  participantId: z.string().optional(),
  providerId: z.string().optional(),
});

/**
 * POST - Initiate payment
 */
export const POST = createPostHandler(
  async (request, { user }) => {
    // Body is already validated by route handler
    const data = await request.json();

    // Verify user has access to participant
    if (data.participantId !== user.id) {
      return errorResponse(
        "Unauthorized: Cannot make payments for other participants",
        403
      );
    }

    // Validate transaction amount
    const amountValidation = validateTransactionAmount(data.amount, 0.01, 100000);
    if (!amountValidation.valid) {
      return errorResponse(amountValidation.error || "Invalid amount", 400);
    }

    // Require provider registration
    await requireProviderRegistration(
      data.providerId,
      "Provider must be registered with NDIS to receive payments"
    );

    // Verify payment security (TOTP + Biometric for high-value transactions)
    const paymentSecurity = new PaymentSecurityService({
      highValueThreshold: 1000, // Require both for payments >= $1000
    });

    try {
      await paymentSecurity.verifyPaymentSecurity(
        user.id,
        data.amount,
        {
          totpToken: data.totpToken,
          backupCode: data.backupCode,
          biometricCredential: data.biometricCredential,
        }
      );
    } catch (securityError: any) {
      // Return security requirements if verification failed
      const requirements = await paymentSecurity.getSecurityRequirements(
        user.id,
        data.amount
      );

      if (requirements.requiresTOTP || requirements.requiresBiometric) {
        const authOptions = await paymentSecurity.generatePaymentAuthOptions(
          user.id,
          data.amount
        );

        return errorResponse(
          {
            error: "Security verification required",
            message: securityError.message,
            requiresTOTP: requirements.requiresTOTP,
            requiresBiometric: requirements.requiresBiometric,
            biometricOptions: authOptions.biometricOptions,
          },
          403
        );
      }

      return errorResponse(securityError.message || "Security verification failed", 403);
    }

    const paymentService = getPaymentService();
    const transaction = await paymentService.initiatePayment(data);
    
    return createdResponse(transaction);
  },
  initiatePaymentSchema,
  {
    requireAuth: true,
    maxBodySize: 50 * 1024,
  }
);

/**
 * GET - Get payment history
 */
export const GET = createGetHandler(
  async (request, { user }) => {
    const params = getQueryParams(request, getPaymentsQuerySchema);

    if (params.participantId) {
      // Verify access
      if (params.participantId !== user.id) {
        const hasAccess = await hasResourceAccess(
          user.id,
          params.participantId,
          "participant"
        );
        if (!hasAccess) {
          return errorResponse(
            "Unauthorized: Cannot access other participants' data",
            403
          );
        }
      }

      const paymentService = getPaymentService();
      const transactions = await paymentService.getTransactionHistory(params.participantId);
      return successResponse(transactions);
    }

    if (params.providerId) {
      // Verify access
      if (params.providerId !== user.id) {
        const hasAccess = await hasResourceAccess(
          user.id,
          params.providerId,
          "provider"
        );
        if (!hasAccess) {
          return errorResponse(
            "Unauthorized: Cannot access other providers' data",
            403
          );
        }
      }

      const paymentService = getPaymentService();
      const receipts = await paymentService.getProviderReceipts(params.providerId);
      return successResponse(receipts);
    }

    return errorResponse(
      "Either participantId or providerId must be provided",
      400
    );
  },
  { requireAuth: true }
);
