/**
 * Payment Page
 * Allows participants to make payments to providers using various payment methods
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { StripePaymentForm } from "@/components/abilitypay/stripe-payment-form";

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "stripe",
    name: "Stripe Link",
    description: "Pay with card or Stripe Link (SMS verification required)",
    icon: "💳",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Pay with PayPal account or card",
    icon: "🅿️",
  },
  {
    id: "coinbase",
    name: "Cryptocurrency",
    description: "Pay with Bitcoin, Ethereum, or other cryptocurrencies",
    icon: "₿",
  },
  {
    id: "blockchain",
    name: "NDIS Token",
    description: "Pay using your NDIS plan tokens",
    icon: "🪙",
  },
];

export default function PaymentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [providerId, setProviderId] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");

  useEffect(() => {
    // Get payment details from URL params
    const provider = searchParams.get("providerId");
    const service = searchParams.get("serviceCode");
    const amt = searchParams.get("amount");
    const category = searchParams.get("categoryId");
    const description = searchParams.get("description");

    if (provider) setProviderId(provider);
    if (service) setServiceCode(service);
    if (amt) setAmount(parseFloat(amt));
    if (category) setCategoryId(category);
    if (description) setServiceDescription(description);
  }, [searchParams]);

  const handlePaymentSuccess = (transactionId: string) => {
    router.push(`/abilitypay/participant/dashboard?payment=success&transactionId=${transactionId}`);
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment error:", error);
    // You could show a toast notification here
  };

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to make payments</p>
        </div>
      </div>
    );
  }

  if (!providerId || !serviceCode || !amount || !categoryId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invalid Payment Request</h2>
          <p className="text-gray-600 mb-4">Missing required payment information</p>
          <button
            onClick={() => router.push("/abilitypay/participant/dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Make a Payment</h1>
          <p className="text-gray-600">Choose your preferred payment method</p>
        </div>

        {!selectedMethod ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Code:</span>
                  <span className="font-medium">{serviceCode}</span>
                </div>
                {serviceDescription && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium">{serviceDescription}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Amount:</span>
                  <span>${amount.toFixed(2)} AUD</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <div className="flex items-center mb-3">
                    <span className="text-3xl mr-3">{method.icon}</span>
                    <h3 className="text-xl font-semibold">{method.name}</h3>
                  </div>
                  <p className="text-gray-600 text-sm">{method.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedMethod(null)}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Back to payment methods
            </button>

            {selectedMethod === "stripe" && (
              <StripePaymentForm
                providerId={providerId}
                serviceCode={serviceCode}
                serviceDescription={serviceDescription}
                amount={amount}
                categoryId={categoryId}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            )}

            {selectedMethod === "paypal" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600">PayPal payment integration coming soon...</p>
                <button
                  onClick={() => setSelectedMethod(null)}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Choose another payment method
                </button>
              </div>
            )}

            {selectedMethod === "coinbase" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600">Cryptocurrency payment integration coming soon...</p>
                <button
                  onClick={() => setSelectedMethod(null)}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Choose another payment method
                </button>
              </div>
            )}

            {selectedMethod === "blockchain" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600">NDIS Token payment integration coming soon...</p>
                <button
                  onClick={() => setSelectedMethod(null)}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Choose another payment method
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
