/**
 * Payment Security Verification Component
 * Handles TOTP + Biometric verification for payments
 */

"use client";

import { useState, useEffect } from "react";
import { TwoFactorVerify } from "@/components/auth/two-factor-verify";
import { useTwoFactor } from "@/client/src/hooks/useTwoFactor";

interface PaymentSecurityVerificationProps {
  amount: number;
  onVerify: (verification: {
    totpToken?: string;
    backupCode?: string;
    biometricCredential?: any;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function PaymentSecurityVerification({
  amount,
  onVerify,
  onCancel,
}: PaymentSecurityVerificationProps) {
  const [step, setStep] = useState<"loading" | "totp" | "biometric" | "complete">("loading");
  const [requirements, setRequirements] = useState<{
    requiresTOTP: boolean;
    requiresBiometric: boolean;
    hasTOTP: boolean;
    hasBiometric: boolean;
    biometricOptions?: any;
  } | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [biometricCredential, setBiometricCredential] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { verifyToken, verifyBackupCode } = useTwoFactor();

  useEffect(() => {
    loadRequirements();
  }, [amount]);

  const loadRequirements = async () => {
    try {
      const response = await fetch(
        `/api/abilitypay/payments/security-requirements?amount=${amount}`
      );
      if (!response.ok) {
        throw new Error("Failed to load security requirements");
      }
      const data = await response.json();
      setRequirements(data);

      // Determine initial step
      if (data.requiresTOTP && data.requiresBiometric) {
        setStep("totp"); // Start with TOTP
      } else if (data.requiresTOTP) {
        setStep("totp");
      } else if (data.requiresBiometric) {
        setStep("biometric");
      } else {
        setStep("complete");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTOTPVerify = async (token: string) => {
    const verified = await verifyToken(token);
    if (verified) {
      setTotpToken(token);
      if (requirements?.requiresBiometric) {
        setStep("biometric");
      } else {
        await completeVerification({ totpToken: token });
      }
      return true;
    }
    return false;
  };

  const handleBackupCode = async (code: string) => {
    const verified = await verifyBackupCode(code);
    if (verified) {
      if (requirements?.requiresBiometric) {
        setStep("biometric");
      } else {
        await completeVerification({ backupCode: code });
      }
      return true;
    }
    return false;
  };

  const handleBiometricVerify = async () => {
    if (!requirements?.biometricOptions) {
      setError("Biometric options not available");
      return;
    }

    try {
      // Request biometric authentication
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(
            atob(requirements.biometricOptions.challenge),
            (c) => c.charCodeAt(0)
          ),
          allowCredentials: requirements.biometricOptions.allowCredentials?.map((cred: any) => ({
            id: Uint8Array.from(atob(cred.id), (c) => c.charCodeAt(0)),
            type: cred.type,
          })),
          timeout: requirements.biometricOptions.timeout,
          userVerification: requirements.biometricOptions.userVerification,
          rpId: requirements.biometricOptions.rpId,
        },
      }) as any;

      if (credential) {
        // Convert credential to base64url
        const credentialData = {
          id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          response: {
            authenticatorData: btoa(
              String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))
            ),
            clientDataJSON: btoa(
              String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))
            ),
            signature: btoa(
              String.fromCharCode(...new Uint8Array(credential.response.signature))
            ),
            userHandle: credential.response.userHandle
              ? btoa(
                  String.fromCharCode(...new Uint8Array(credential.response.userHandle))
                )
              : undefined,
          },
          type: credential.type,
        };

        setBiometricCredential(credentialData);
        await completeVerification({
          totpToken: totpToken || undefined,
          backupCode: totpToken ? undefined : undefined, // Use TOTP if available
          biometricCredential: credentialData,
        });
      }
    } catch (err: any) {
      setError(err.message || "Biometric authentication failed");
    }
  };

  const completeVerification = async (verification: {
    totpToken?: string;
    backupCode?: string;
    biometricCredential?: any;
  }) => {
    try {
      await onVerify(verification);
      setStep("complete");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    }
  };

  if (step === "loading" || !requirements) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse">Loading security requirements...</div>
      </div>
    );
  }

  if (step === "totp") {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            Payment Security Required
          </h3>
          <p className="text-sm text-blue-800">
            This payment requires additional security verification.
            {requirements.requiresBiometric && " After TOTP, you'll need biometric verification."}
          </p>
        </div>

        <TwoFactorVerify
          onVerify={handleTOTPVerify}
          onBackupCode={handleBackupCode}
          onCancel={onCancel}
          title="Enter Verification Code"
          description="Open your authenticator app and enter the 6-digit code"
        />
      </div>
    );
  }

  if (step === "biometric") {
    return (
      <div className="space-y-4 p-6 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-2xl font-bold mb-2">Biometric Verification</h2>
          <p className="text-gray-600">
            Please use your fingerprint, face, or security key to verify this payment.
          </p>
        </div>

        <button
          onClick={handleBiometricVerify}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700"
        >
          Verify with Biometric
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  return null;
}
