/**
 * PayPal Smart Buttons Component
 * React component for PayPal Smart Payment Buttons
 */

"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalSmartButtonsProps {
  amount: number;
  currency?: string;
  onApprove: (orderId: string) => Promise<void>;
  onError: (error: string) => void;
  onCancel?: () => void;
}

export function PayPalSmartButtons({
  amount,
  currency = "AUD",
  onApprove,
  onError,
  onCancel,
}: PayPalSmartButtonsProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const buttonsRendered = useRef(false);

  useEffect(() => {
    if (buttonsRendered.current || !paypalRef.current) {
      return;
    }

    // Load PayPal SDK
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=${currency}`;
    script.async = true;

    script.onload = () => {
      if (window.paypal && paypalRef.current && !buttonsRendered.current) {
        window.paypal
          .Buttons({
            createOrder: async () => {
              try {
                const response = await fetch("/api/payments/paypal/create-order", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    amount,
                    currency,
                  }),
                });

                const data = await response.json();
                return data.paymentId; // PayPal order ID
              } catch (error) {
                onError("Failed to create PayPal order");
                throw error;
              }
            },
            onApprove: async (data: { orderID: string }) => {
              try {
                await onApprove(data.orderID);
              } catch (error: any) {
                onError(error.message || "Payment approval failed");
              }
            },
            onError: (err: any) => {
              onError(err.message || "PayPal error occurred");
            },
            onCancel: () => {
              if (onCancel) {
                onCancel();
              }
            },
          })
          .render(paypalRef.current);

        buttonsRendered.current = true;
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      buttonsRendered.current = false;
    };
  }, [amount, currency, onApprove, onError, onCancel]);

  return <div ref={paypalRef} />;
}
