/**
 * PayPal Payment Hook
 * Handles PayPal payment flow with order creation and capture
 */

import { useState, useCallback } from "react";

export interface PayPalPaymentRequest {
  participantId: string;
  providerId: string;
  serviceCode: string;
  amount: number;
  categoryId: string;
  serviceDescription?: string;
  workerId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalPaymentResult {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  approvalUrl?: string;
  error?: string;
}

export function usePayPalPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [paymentResult, setPaymentResult] = useState<PayPalPaymentResult | null>(null);

  /**
   * Initiate PayPal payment
   */
  const initiatePayment = useCallback(async (
    request: PayPalPaymentRequest
  ): Promise<{ transactionId: string; order: any }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/abilitypay/payments/paypal?action=initiate", {
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
      setOrder(data.order);

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Capture approved PayPal order
   */
  const captureOrder = useCallback(async (
    orderId: string,
    transactionId: string
  ): Promise<PayPalPaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/abilitypay/payments/paypal?action=capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          transactionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to capture payment");
      }

      const data = await response.json();
      const result: PayPalPaymentResult = {
        success: true,
        transactionId: data.transactionId,
        orderId: data.capture.id,
      };
      setPaymentResult(result);

      return result;
    } catch (err: any) {
      const result: PayPalPaymentResult = {
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
   * Get payment status
   */
  const getPaymentStatus = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/abilitypay/payments/paypal?orderId=${orderId}`
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
   * Redirect to PayPal approval URL
   */
  const redirectToPayPal = useCallback((approvalUrl: string) => {
    if (approvalUrl) {
      window.location.href = approvalUrl;
    }
  }, []);

  /**
   * Complete payment flow (initiate + redirect)
   */
  const executePaymentFlow = useCallback(async (
    request: PayPalPaymentRequest
  ): Promise<{ transactionId: string; approvalUrl: string }> => {
    try {
      const { transactionId, order } = await initiatePayment(request);
      
      if (!order.approvalUrl) {
        throw new Error("No approval URL received from PayPal");
      }

      // Redirect to PayPal
      redirectToPayPal(order.approvalUrl);

      return {
        transactionId,
        approvalUrl: order.approvalUrl,
      };
    } catch (err: any) {
      throw err;
    }
  }, [initiatePayment, redirectToPayPal]);

  return {
    loading,
    error,
    order,
    paymentResult,
    initiatePayment,
    captureOrder,
    getPaymentStatus,
    redirectToPayPal,
    executePaymentFlow,
  };
}
