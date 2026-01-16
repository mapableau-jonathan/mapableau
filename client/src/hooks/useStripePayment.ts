/**
 * Stripe Payment Hook with SMS Verification
 * Handles Stripe Link payment flow with Twilio SMS verification
 */

import { useState, useCallback } from "react";

export interface StripePaymentRequest {
  participantId: string;
  providerId: string;
  serviceCode: string;
  amount: number;
  categoryId: string;
  email: string;
  phone: string;
  serviceDescription?: string;
  workerId?: string;
  calculateTax?: boolean;
  customerAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface StripePaymentResult {
  success: boolean;
  transactionId?: string;
  paymentIntentId?: string;
  clientSecret?: string;
  taxCalculation?: {
    id: string;
    taxAmountExclusive: number;
    taxAmountInclusive: number;
    amountTotal: number;
    taxBreakdown?: Array<{
      jurisdiction: string;
      percentage: number;
      taxAmount: number;
    }>;
  };
  error?: string;
}

export interface SMSVerificationState {
  sent: boolean;
  verificationId?: string;
  expiresAt?: Date;
  error?: string;
}

export function useStripePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [smsState, setSmsState] = useState<SMSVerificationState>({ sent: false });
  const [paymentResult, setPaymentResult] = useState<StripePaymentResult | null>(null);

  /**
   * Initiate Stripe payment with SMS verification
   */
  const initiatePayment = useCallback(async (
    request: StripePaymentRequest
  ): Promise<{ transactionId: string; paymentIntent: any; smsVerification: SMSVerificationState }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/abilitypay/payments/stripe?action=initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initiate payment");
      }

      const data = await response.json();
      setPaymentIntent(data.paymentIntent);
      setSmsState({
        sent: data.smsVerification.sent,
        verificationId: data.smsVerification.verificationId,
        expiresAt: data.smsVerification.expiresAt ? new Date(data.smsVerification.expiresAt) : undefined,
        error: data.smsVerification.error,
      });

      return {
        ...data,
        taxCalculation: data.taxCalculation,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify SMS code and confirm payment
   */
  const verifyAndConfirm = useCallback(async (
    transactionId: string,
    phoneNumber: string,
    verificationCode: string,
    paymentIntentId: string
  ): Promise<StripePaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/abilitypay/payments/stripe?action=verify-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          phoneNumber,
          verificationCode,
          paymentIntentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const data = await response.json();
      setPaymentResult({
        success: true,
        transactionId: data.transactionId,
        paymentIntentId: data.paymentIntent.id,
      });

      return {
        success: true,
        transactionId: data.transactionId,
        paymentIntentId: data.paymentIntent.id,
      };
    } catch (err: any) {
      const result: StripePaymentResult = {
        success: false,
        error: err.message,
      };
      setError(err.message);
      setPaymentResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Resend SMS verification code
   */
  const resendSMS = useCallback(async (
    phoneNumber: string,
    purpose: "payment" | "login" | "verification" = "payment"
  ): Promise<SMSVerificationState> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/abilitypay/verification/sms?action=send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          purpose,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send SMS");
      }

      const data = await response.json();
      const newState: SMSVerificationState = {
        sent: true,
        verificationId: data.verificationId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      };
      setSmsState(newState);

      return newState;
    } catch (err: any) {
      const errorState: SMSVerificationState = {
        sent: false,
        error: err.message,
      };
      setError(err.message);
      setSmsState(errorState);
      return errorState;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get payment status
   */
  const getPaymentStatus = useCallback(async (paymentIntentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/abilitypay/payments/stripe?paymentIntentId=${paymentIntentId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get payment status");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Complete payment flow (initiate + verify)
   */
  const executePaymentFlow = useCallback(async (
    request: StripePaymentRequest,
    verificationCode: string
  ): Promise<StripePaymentResult> => {
    try {
      // Step 1: Initiate payment
      const { transactionId, paymentIntent, smsVerification } = await initiatePayment(request);

      if (!smsVerification.sent) {
        return {
          success: false,
          error: smsVerification.error || "Failed to send SMS verification",
        };
      }

      // Step 2: Verify SMS and confirm
      const result = await verifyAndConfirm(
        transactionId,
        request.phone,
        verificationCode,
        paymentIntent.id
      );

      return result;
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }, [initiatePayment, verifyAndConfirm]);

  return {
    loading,
    error,
    paymentIntent,
    smsState,
    paymentResult,
    initiatePayment,
    verifyAndConfirm,
    resendSMS,
    getPaymentStatus,
    executePaymentFlow,
  };
}
