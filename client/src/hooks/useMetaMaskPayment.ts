/**
 * MetaMask Payment Hook
 * Handles MetaMask payment flow for AbilityPay transactions
 */

import { useState, useCallback } from "react";
import { useMetaMask } from "./useMetaMask";

export interface MetaMaskPaymentRequest {
  transactionId: string;
  participantId: string;
  providerId: string;
  amount: number;
  serviceCode: string;
  categoryId: string;
  fromAddress: string;
}

export interface MetaMaskPaymentResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

export function useMetaMaskPayment() {
  const { isConnected, account, sendTransaction, error: metamaskError } = useMetaMask();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<MetaMaskPaymentResult | null>(null);

  const initiatePayment = useCallback(async (
    request: MetaMaskPaymentRequest
  ): Promise<{ transactionId: string; transaction: any; network: any }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/abilitypay/payments/metamask?action=initiate", {
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
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const processPayment = useCallback(async (
    transactionId: string,
    rawTransaction: string,
    transactionHash: string
  ): Promise<MetaMaskPaymentResult> => {
    if (!isConnected || !account) {
      throw new Error("MetaMask is not connected");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/abilitypay/payments/metamask?action=process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          rawTransaction,
          transactionHash,
          from: account.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process payment");
      }

      const data = await response.json();
      setPaymentResult({
        success: true,
        transactionHash: data.blockchainTxHash,
        blockNumber: data.blockNumber,
      });
      return data;
    } catch (err: any) {
      const errorMsg = err.message || "Payment processing failed";
      setError(errorMsg);
      setPaymentResult({
        success: false,
        error: errorMsg,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, account]);

  const executePaymentFlow = useCallback(async (
    request: MetaMaskPaymentRequest
  ): Promise<MetaMaskPaymentResult> => {
    try {
      // Step 1: Initiate payment (get transaction data)
      const { transactionId, transaction } = await initiatePayment(request);

      // Step 2: Send transaction via MetaMask
      const txHash = await sendTransaction(transaction);

      // Step 3: Process payment (update transaction status)
      // Note: In a real implementation, we'd wait for transaction confirmation
      // For now, we'll process immediately
      const result = await processPayment(transactionId, "", txHash);

      return result;
    } catch (err: any) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }, [initiatePayment, sendTransaction, processPayment]);

  return {
    isConnected,
    account,
    loading,
    error: error || metamaskError,
    paymentResult,
    initiatePayment,
    processPayment,
    executePaymentFlow,
  };
}
