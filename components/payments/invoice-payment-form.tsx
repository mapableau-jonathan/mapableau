/**
 * Invoice Payment Form Component
 * Unified payment form for paying invoices
 */

"use client";

import { useState, useEffect } from "react";
import { StripePaymentElement } from "./stripe-payment-element";
import { PayPalSmartButtons } from "./paypal-smart-buttons";

interface InvoicePaymentFormProps {
  invoiceId: string;
  amount: number;
  currency?: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function InvoicePaymentForm({
  invoiceId,
  amount,
  currency = "AUD",
  onSuccess,
  onError,
}: InvoicePaymentFormProps) {
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "paypal">("stripe");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payments/stripe/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          description: `Invoice payment`,
          invoiceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      onError(error.message || "Failed to initialize payment");
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalApprove = async (orderId: string) => {
    try {
      const response = await fetch("/api/payments/paypal/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        throw new Error("Failed to capture payment");
      }

      onSuccess();
    } catch (error: any) {
      onError(error.message || "Payment capture failed");
    }
  };

  useEffect(() => {
    if (paymentProvider === "stripe" && !clientSecret) {
      handleStripePayment();
    }
  }, [paymentProvider]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setPaymentProvider("stripe")}
          className={`px-4 py-2 rounded ${
            paymentProvider === "stripe"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          Stripe
        </button>
        <button
          type="button"
          onClick={() => setPaymentProvider("paypal")}
          className={`px-4 py-2 rounded ${
            paymentProvider === "paypal"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          PayPal
        </button>
      </div>

      {paymentProvider === "stripe" && clientSecret && (
        <StripePaymentElement
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
        />
      )}

      {paymentProvider === "paypal" && (
        <PayPalSmartButtons
          amount={amount}
          currency={currency}
          onApprove={handlePayPalApprove}
          onError={onError}
        />
      )}

      {loading && <div>Loading payment form...</div>}
    </div>
  );
}
