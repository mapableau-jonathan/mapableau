/**
 * Two-Factor Authentication Verification Component
 * Used during login or sensitive operations
 */

"use client";

import { useState, useEffect } from "react";

interface TwoFactorVerifyProps {
  onVerify: (token: string) => Promise<boolean>;
  onBackupCode?: (code: string) => Promise<boolean>;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export function TwoFactorVerify({
  onVerify,
  onBackupCode,
  onCancel,
  title = "Two-Factor Authentication",
  description = "Enter the 6-digit code from your authenticator app",
}: TwoFactorVerifyProps) {
  const [token, setToken] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
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

  const handleVerify = async () => {
    if (useBackupCode) {
      if (!backupCode || backupCode.length !== 8) {
        setError("Please enter a valid 8-digit backup code");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const success = await onBackupCode?.(backupCode);
        if (!success) {
          setError("Invalid backup code");
        }
      } catch (err: any) {
        setError(err.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    } else {
      if (!token || token.length !== 6) {
        setError("Please enter a valid 6-digit code");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const success = await onVerify(token);
        if (!success) {
          setError("Invalid verification code");
        }
      } catch (err: any) {
        setError(err.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      {!useBackupCode ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Code refreshes every {timeRemaining} seconds
            </p>
          </div>

          {onBackupCode && (
            <button
              onClick={() => setUseBackupCode(true)}
              className="w-full text-sm text-blue-600 hover:text-blue-800"
            >
              Use backup code instead
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Backup Code
            </label>
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
              placeholder="00000000"
              maxLength={8}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Enter an 8-digit backup code
            </p>
          </div>

          <button
            onClick={() => setUseBackupCode(false)}
            className="w-full text-sm text-blue-600 hover:text-blue-800"
          >
            Use authenticator app instead
          </button>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleVerify}
          disabled={loading || (useBackupCode ? backupCode.length !== 8 : token.length !== 6)}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify"}
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
  );
}
