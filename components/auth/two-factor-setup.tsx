/**
 * Two-Factor Authentication Setup Component
 * Guides users through setting up Google Authenticator
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState<"instructions" | "qr" | "verify" | "backup">("instructions");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualEntryKey, setManualEntryKey] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);

  // Update time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const generateSecret = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/setup?action=generate", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate secret");
      }

      const data = await response.json();
      setQrCodeUrl(data.qrCodeUrl);
      setManualEntryKey(data.manualEntryKey);
      setStep("qr");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/setup?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const data = await response.json();
      setBackupCodes(data.backupCodes);
      setStep("backup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete?.();
  };

  if (step === "instructions") {
    return (
      <div className="space-y-6 p-6 bg-white rounded-lg shadow-md max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold mb-2">Enable Two-Factor Authentication</h2>
          <p className="text-gray-600">
            Add an extra layer of security to your account with Google Authenticator.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Scan the QR code with Google Authenticator app</li>
              <li>Enter the 6-digit code from the app to verify</li>
              <li>Save your backup codes in a secure location</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">You'll need:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Google Authenticator app installed on your phone</li>
              <li>Or any TOTP-compatible authenticator app</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={generateSecret}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Continue"}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="space-y-6 p-6 bg-white rounded-lg shadow-md max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold mb-2">Scan QR Code</h2>
          <p className="text-gray-600">
            Open Google Authenticator and scan this QR code
          </p>
        </div>

        <div className="flex flex-col items-center space-y-4">
          {qrCodeUrl && (
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <img
                src={qrCodeUrl}
                alt="TOTP QR Code"
                className="w-64 h-64"
              />
            </div>
          )}

          <div className="w-full max-w-md">
            <p className="text-sm text-gray-600 mb-2 text-center">
              Can't scan? Enter this key manually:
            </p>
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <code className="text-sm font-mono break-all">{manualEntryKey}</code>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter 6-digit code from app
              </label>
              <input
                type="text"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Code refreshes every {timeRemaining} seconds
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={verifyAndEnable}
                disabled={loading || verificationToken.length !== 6}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify & Enable"}
              </button>
              <button
                onClick={() => setStep("instructions")}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm w-full">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "backup") {
    return (
      <div className="space-y-6 p-6 bg-white rounded-lg shadow-md max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold mb-2">Save Your Backup Codes</h2>
          <p className="text-gray-600">
            These codes can be used to access your account if you lose access to your authenticator app.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800 font-semibold mb-2">
            ⚠️ Important: Save these codes now!
          </p>
          <p className="text-sm text-yellow-700">
            You won't be able to see these codes again. Store them in a secure location.
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="bg-white p-2 rounded border border-gray-200 text-center"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleComplete}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            I've Saved My Codes
          </button>
        </div>
      </div>
    );
  }

  return null;
}
