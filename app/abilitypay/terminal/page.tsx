/**
 * AbilityPay WebObjects Payment Terminal Page
 * Standalone page for embedded terminal usage
 */

"use client";

import { WebObjectsPaymentTerminal } from "@/components/abilitypay/webobjects-payment-terminal";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function TerminalContent() {
  const searchParams = useSearchParams();
  
  const config = {
    providerId: searchParams.get('providerId') || '',
    serviceCode: searchParams.get('serviceCode') || undefined,
    serviceDescription: searchParams.get('serviceDescription') || undefined,
    amount: parseFloat(searchParams.get('amount') || '0'),
    categoryId: searchParams.get('categoryId') || undefined,
    workerId: searchParams.get('workerId') || undefined,
    serviceType: (searchParams.get('serviceType') as "NDIS" | "HUMAN_SERVICES") || "NDIS",
    paymentMethods: searchParams.get('paymentMethods') 
      ? JSON.parse(searchParams.get('paymentMethods')!) 
      : ["stripe", "paypal", "blockchain"],
    defaultPaymentMethod: (searchParams.get('defaultPaymentMethod') as any) || "stripe",
    theme: (searchParams.get('theme') as "light" | "dark" | "terminal") || "terminal",
    size: (searchParams.get('size') as "compact" | "standard" | "large") || "standard",
    showLogo: searchParams.get('showLogo') !== 'false',
    brandName: searchParams.get('brandName') || "AbilityPay",
    apiBaseUrl: searchParams.get('apiBaseUrl') || process.env.NEXT_PUBLIC_API_URL || "/api",
    enableTaxCalculation: searchParams.get('enableTaxCalculation') !== 'false',
    enableSMSVerification: searchParams.get('enableSMSVerification') !== 'false',
    requireAuth: searchParams.get('requireAuth') !== 'false',
  };

  if (!config.providerId || !config.amount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-green-400 font-mono p-4">
        <div className="text-center">
          <div className="text-xl mb-4">INVALID CONFIGURATION</div>
          <div className="text-sm opacity-70">
            Missing required parameters: providerId and amount are required
          </div>
        </div>
      </div>
    );
  }

  return (
    <WebObjectsPaymentTerminal
      {...config}
      onSuccess={(transactionId, result) => {
        // Send message to parent window if embedded
        if (typeof window !== 'undefined' && window.parent !== window) {
          window.parent.postMessage({
            type: 'abilitypay-payment-success',
            transactionId,
            result,
          }, '*');
        }
      }}
      onError={(error) => {
        // Send message to parent window if embedded
        if (typeof window !== 'undefined' && window.parent !== window) {
          window.parent.postMessage({
            type: 'abilitypay-payment-error',
            error,
          }, '*');
        }
      }}
      onCancel={() => {
        // Send message to parent window if embedded
        if (typeof window !== 'undefined' && window.parent !== window) {
          window.parent.postMessage({
            type: 'abilitypay-payment-cancel',
          }, '*');
        }
      }}
    />
  );
}

export default function TerminalPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
      <Suspense fallback={
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading terminal...
        </div>
      }>
        <TerminalContent />
      </Suspense>
    </div>
  );
}
