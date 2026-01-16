/**
 * Stripe Payment Form Component
 * Handles Stripe Link payment with SMS verification
 */

"use client";

import { useState } from "react";
import { useStripePayment } from "@/client/src/hooks/useStripePayment";
import { useSession } from "next-auth/react";

interface StripePaymentFormProps {
  providerId: string;
  serviceCode: string;
  serviceDescription?: string;
  amount: number;
  categoryId: string;
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
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
}

export function StripePaymentForm({
  providerId,
  serviceCode,
  serviceDescription,
  amount,
  categoryId,
  workerId,
  calculateTax = false,
  customerAddress,
  shippingAddress,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const { data: session } = useSession();
  const {
    loading,
    error,
    paymentIntent,
    smsState,
    initiatePayment,
    verifyAndConfirm,
    resendSMS,
  } = useStripePayment();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "verification" | "processing">("details");

  const handleInitiatePayment = async () => {
    if (!session?.user?.id) {
      onError?.("You must be logged in to make payments");
      return;
    }

    if (!email || !phone) {
      onError?.("Email and phone number are required");
      return;
    }

    try {
      setStep("processing");
      const result = await initiatePayment({
        participantId: session.user.id,
        providerId,
        serviceCode,
        amount,
        categoryId,
        email,
        phone,
        serviceDescription,
        workerId,
        calculateTax,
        customerAddress,
        shippingAddress,
      });

      setTransactionId(result.transactionId);
      
      // Update tax information if available
      if (result.taxCalculation) {
        setTaxInfo(result.taxCalculation);
        setFinalAmount(result.taxCalculation.amountTotal);
      }
      
      if (result.smsVerification.sent) {
        setStep("verification");
      } else {
        onError?.(result.smsVerification.error || "Failed to send SMS verification");
        setStep("details");
      }
    } catch (err: any) {
      onError?.(err.message || "Failed to initiate payment");
      setStep("details");
    }
  };

  const handleVerifyAndPay = async () => {
    if (!transactionId || !paymentIntent?.id) {
      onError?.("Missing payment information");
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      onError?.("Please enter a valid 6-digit verification code");
      return;
    }

    try {
      setStep("processing");
      const result = await verifyAndConfirm(
        transactionId,
        phone,
        verificationCode,
        paymentIntent.id
      );

      if (result.success) {
        onSuccess?.(result.transactionId || transactionId);
      } else {
        onError?.(result.error || "Payment verification failed");
        setStep("verification");
      }
    } catch (err: any) {
      onError?.(err.message || "Payment verification failed");
      setStep("verification");
    }
  };

  const handleResendSMS = async () => {
    try {
      await resendSMS(phone, "payment");
    } catch (err: any) {
      onError?.(err.message || "Failed to resend SMS");
    }
  };

  if (step === "details") {
    return (
      <div className="space-y-4 p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Pay with Stripe</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+61412345678"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +61 for Australia)
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="text-sm">${amount.toFixed(2)} AUD</span>
              </div>
              {taxInfo && taxInfo.taxAmountExclusive > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span>Tax</span>
                    <span>${taxInfo.taxAmountExclusive.toFixed(2)} AUD</span>
                  </div>
                  {taxInfo.taxBreakdown && taxInfo.taxBreakdown.length > 0 && (
                    <div className="ml-4 text-xs text-gray-600">
                      {taxInfo.taxBreakdown.map((breakdown: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{breakdown.jurisdiction} ({breakdown.percentage}%)</span>
                          <span>${breakdown.taxAmount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-lg font-bold">${finalAmount.toFixed(2)} AUD</span>
                    </div>
                  </div>
                </>
              )}
              {!taxInfo && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold">${amount.toFixed(2)} AUD</span>
                </div>
              )}
            </div>
            {serviceDescription && (
              <p className="text-sm text-gray-600 mt-2">{serviceDescription}</p>
            )}
          </div>

          <button
            onClick={handleInitiatePayment}
            disabled={loading || !email || !phone}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Continue to Payment"}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "verification") {
    return (
      <div className="space-y-4 p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Verify Your Payment</h3>
        
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm mb-4">
          <p className="font-medium">SMS verification code sent!</p>
          <p className="mt-1">
            We've sent a 6-digit verification code to {phone}. Please enter it below.
          </p>
          {smsState.expiresAt && (
            <p className="mt-1 text-xs">
              Code expires at {new Date(smsState.expiresAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerifyAndPay}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Verify & Pay"}
            </button>
            <button
              onClick={handleResendSMS}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            >
              Resend Code
            </button>
          </div>

          <button
            onClick={() => {
              setStep("details");
              setVerificationCode("");
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to payment details
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Processing step
  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow-md text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Processing your payment...</p>
    </div>
  );
}
