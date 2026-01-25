/**
 * AbilityPay WebObjects Embeddable Payment Terminal
 * A terminal-style embeddable payment component for websites
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface WebObjectsPaymentTerminalConfig {
  // Payment details
  providerId: string;
  serviceCode?: string;
  serviceDescription?: string;
  amount: number;
  categoryId?: string; // Required for NDIS payments
  workerId?: string;
  
  // Service type
  serviceType?: "NDIS" | "HUMAN_SERVICES";
  
  // Payment methods
  paymentMethods?: Array<"stripe" | "paypal" | "blockchain" | "coinbase">;
  defaultPaymentMethod?: "stripe" | "paypal" | "blockchain" | "coinbase";
  
  // Appearance
  theme?: "light" | "dark" | "terminal";
  size?: "compact" | "standard" | "large";
  showLogo?: boolean;
  brandName?: string;
  
  // Callbacks
  onSuccess?: (transactionId: string, paymentResult: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  
  // Configuration
  apiBaseUrl?: string;
  enableTaxCalculation?: boolean;
  enableSMSVerification?: boolean;
  requireAuth?: boolean;
}

interface PaymentStep {
  type: "select-method" | "payment-details" | "verification" | "processing" | "success" | "error";
  data?: any;
}

export function WebObjectsPaymentTerminal({
  providerId,
  serviceCode,
  serviceDescription,
  amount,
  categoryId,
  workerId,
  serviceType = "NDIS",
  paymentMethods = ["stripe", "paypal", "blockchain"],
  defaultPaymentMethod = "stripe",
  theme = "terminal",
  size = "standard",
  showLogo = true,
  brandName = "AbilityPay",
  onSuccess,
  onError,
  onCancel,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "/api",
  enableTaxCalculation = true,
  enableSMSVerification = true,
  requireAuth = true,
}: WebObjectsPaymentTerminalConfig) {
  const { data: session, status: sessionStatus } = useSession();
  const [currentStep, setCurrentStep] = useState<PaymentStep>({ type: "select-method" });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(defaultPaymentMethod);
  const [paymentData, setPaymentData] = useState<any>({});
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useEffect(() => {
    if (requireAuth && sessionStatus === "unauthenticated") {
      setError("Authentication required. Please log in to continue.");
      setCurrentStep({ type: "error" });
    }
  }, [sessionStatus, requireAuth]);

  // Terminal theme classes
  const terminalClasses = {
    light: "bg-white text-gray-900 border-gray-300",
    dark: "bg-gray-900 text-gray-100 border-gray-700",
    terminal: "bg-black text-green-400 border-green-600 font-mono",
  };

  const sizeClasses = {
    compact: "max-w-sm",
    standard: "max-w-md",
    large: "max-w-lg",
  };

  const themeClass = terminalClasses[theme];
  const sizeClass = sizeClasses[size];

  // Handle payment method selection
  const handleSelectPaymentMethod = (method: string) => {
    setSelectedPaymentMethod(method);
    setError(null);
    
    if (method === "stripe" || method === "paypal") {
      setCurrentStep({ type: "payment-details", data: { method } });
    } else if (method === "blockchain") {
      // Blockchain payments go directly to processing
      handleBlockchainPayment();
    }
  };

  // Handle payment details submission
  const handlePaymentDetails = async (details: any) => {
    setLoading(true);
    setError(null);
    setCurrentStep({ type: "processing" });

    try {
      const participantId = session?.user?.id;
      if (!participantId) {
        throw new Error("User authentication required");
      }

      if (!categoryId && serviceType === "NDIS") {
        throw new Error("Category ID is required for NDIS payments");
      }

      let response;
      if (selectedPaymentMethod === "stripe") {
        response = await fetch(`${apiBaseUrl}/abilitypay/payments/stripe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantId,
            providerId,
            serviceCode: serviceCode || "UNKNOWN",
            serviceDescription,
            amount,
            categoryId,
            workerId,
            email: details.email,
            phone: details.phone,
            calculateTax: enableTaxCalculation,
          }),
        });
      } else if (selectedPaymentMethod === "paypal") {
        response = await fetch(`${apiBaseUrl}/abilitypay/payments/paypal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantId,
            providerId,
            serviceCode: serviceCode || "UNKNOWN",
            serviceDescription,
            amount,
            categoryId,
            workerId,
            returnUrl: window.location.href,
            cancelUrl: window.location.href,
          }),
        });
      } else {
        throw new Error(`Payment method ${selectedPaymentMethod} not yet implemented`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Payment initiation failed");
      }

      const result = await response.json();
      setTransactionId(result.transactionId || result.id);

      // Handle SMS verification if required
      if (enableSMSVerification && result.smsVerification?.sent && selectedPaymentMethod === "stripe") {
        setPaymentData({ ...details, paymentIntent: result.paymentIntent, phone: details.phone });
        setVerificationCode("");
        setCurrentStep({ type: "verification", data: { phone: details.phone } });
      } else if (result.approvalUrl) {
        // Redirect to payment provider (PayPal)
        window.location.href = result.approvalUrl;
      } else {
        // Payment completed
        handlePaymentSuccess(result);
      }
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setCurrentStep({ type: "error" });
      onError?.(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle blockchain payment
  const handleBlockchainPayment = async () => {
    setLoading(true);
    setError(null);
    setCurrentStep({ type: "processing" });

    try {
      const participantId = session?.user?.id;
      if (!participantId) {
        throw new Error("User authentication required");
      }

      if (!categoryId) {
        throw new Error("Category ID is required for blockchain payments");
      }

      const response = await fetch(`${apiBaseUrl}/abilitypay/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId,
          providerId,
          serviceCode: serviceCode || "UNKNOWN",
          serviceDescription,
          amount,
          categoryId,
          workerId,
          paymentMethod: "blockchain",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Blockchain payment failed");
      }

      const transaction = await response.json();
      setTransactionId(transaction.id);

      // Execute blockchain payment
      const executeResponse = await fetch(`${apiBaseUrl}/abilitypay/payments/${transaction.id}/execute`, {
        method: "POST",
      });

      if (!executeResponse.ok) {
        throw new Error("Failed to execute blockchain payment");
      }

      const completed = await executeResponse.json();
      handlePaymentSuccess(completed);
    } catch (err: any) {
      setError(err.message || "Blockchain payment failed");
      setCurrentStep({ type: "error" });
      onError?.(err.message || "Blockchain payment failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle SMS verification
  const handleVerifySMS = async (code: string) => {
    if (!transactionId || !paymentData.paymentIntent) {
      setError("Missing payment information");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/abilitypay/payments/stripe?action=verify-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          phoneNumber: paymentData.phone,
          verificationCode: code,
          paymentIntentId: paymentData.paymentIntent.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const result = await response.json();
      handlePaymentSuccess(result);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = (result: any) => {
    setCurrentStep({ type: "success", data: result });
    onSuccess?.(transactionId || result.transactionId || result.id, result);
  };

  // Render methods
  const renderSelectMethod = () => (
    <div className="space-y-4">
      {showLogo && (
        <div className="text-center mb-4">
          <div className="text-2xl font-bold mb-2">{brandName}</div>
          <div className="text-sm opacity-70">Payment Terminal</div>
        </div>
      )}
      
      <div className="space-y-2">
        <div className="text-sm opacity-70 mb-3">SELECT PAYMENT METHOD</div>
        {paymentMethods.map((method) => (
          <button
            key={method}
            onClick={() => handleSelectPaymentMethod(method)}
            className="w-full p-3 border rounded text-left hover:bg-opacity-20 hover:bg-current transition-colors flex items-center justify-between"
          >
            <span className="uppercase">{method}</span>
            <span className="text-xs opacity-50">→</span>
          </button>
        ))}
      </div>

      <div className="pt-4 border-t opacity-50 text-sm">
        <div className="flex justify-between mb-1">
          <span>Amount:</span>
          <span>${amount.toFixed(2)} AUD</span>
        </div>
        {serviceDescription && (
          <div className="text-xs opacity-70 mt-2">{serviceDescription}</div>
        )}
      </div>
    </div>
  );

  const renderPaymentDetails = () => (
    <div className="space-y-4">
      <div className="text-sm opacity-70 mb-3">PAYMENT DETAILS</div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs opacity-70 mb-1">EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 bg-transparent border rounded focus:outline-none focus:ring-1"
            placeholder="user@example.com"
            required
          />
        </div>

        {selectedPaymentMethod === "stripe" && (
          <div>
            <label className="block text-xs opacity-70 mb-1">PHONE (+61...)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 bg-transparent border rounded focus:outline-none focus:ring-1"
              placeholder="+61412345678"
              required
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEmail("");
              setPhone("");
              setCurrentStep({ type: "select-method" });
            }}
            className="flex-1"
          >
            ← BACK
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handlePaymentDetails({ email, phone })}
            disabled={!email || (selectedPaymentMethod === "stripe" && !phone) || loading}
            loading={loading}
            className="flex-1"
          >
            CONTINUE
          </Button>
        </div>
      </div>
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-4">
      <div className="text-sm opacity-70 mb-3">SMS VERIFICATION</div>
      
      <div className="bg-opacity-20 bg-current p-3 rounded text-xs mb-4">
        Verification code sent to {paymentData.phone}
      </div>

      <div>
        <label className="block text-xs opacity-70 mb-1">VERIFICATION CODE</label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full p-3 bg-transparent border rounded text-center text-2xl tracking-widest focus:outline-none focus:ring-1"
          placeholder="000000"
          maxLength={6}
          required
        />
      </div>

      <Button
        variant="default"
        size="sm"
        onClick={() => handleVerifySMS(verificationCode)}
        disabled={verificationCode.length !== 6 || loading}
        loading={loading}
        className="w-full"
      >
        VERIFY & PAY
      </Button>

      {error && (
        <div className="text-xs text-red-400 bg-red-900 bg-opacity-30 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );

  const renderProcessing = () => (
    <div className="space-y-4 text-center py-8">
      <div className="text-lg">PROCESSING...</div>
      <div className="flex justify-center">
        <div className="animate-pulse">●</div>
      </div>
      <div className="text-xs opacity-50">Please wait</div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-4 text-center py-8">
      <div className="text-2xl mb-2">✓</div>
      <div className="text-lg">PAYMENT SUCCESSFUL</div>
      {transactionId && (
        <div className="text-xs opacity-70 mt-2">
          Transaction: {transactionId.substring(0, 8)}...
        </div>
      )}
      <div className="pt-4">
        <Badge variant="default">${amount.toFixed(2)} AUD</Badge>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-2xl mb-2">✗</div>
        <div className="text-lg">PAYMENT FAILED</div>
      </div>
      {error && (
        <div className="bg-red-900 bg-opacity-30 p-3 rounded text-sm">
          {error}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setError(null);
          setCurrentStep({ type: "select-method" });
        }}
        className="w-full"
      >
        TRY AGAIN
      </Button>
    </div>
  );

  // Main render
  const renderContent = () => {
    switch (currentStep.type) {
      case "select-method":
        return renderSelectMethod();
      case "payment-details":
        return renderPaymentDetails();
      case "verification":
        return renderVerification();
      case "processing":
        return renderProcessing();
      case "success":
        return renderSuccess();
      case "error":
        return renderError();
      default:
        return renderSelectMethod();
    }
  };

  return (
    <div ref={terminalRef} className={`${sizeClass} mx-auto`}>
      <Card variant="outlined" className={`${themeClass} border-2`}>
        <CardHeader>
          <CardTitle className="text-lg">ABILITYPAY TERMINAL</CardTitle>
          <CardDescription className="text-xs opacity-70">
            {serviceType} Payment Processing System
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px]">
          {renderContent()}
        </CardContent>
        {currentStep.type !== "success" && currentStep.type !== "processing" && (
          <CardFooter className="text-xs opacity-50 text-center justify-center">
            Secure Payment Processing
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
