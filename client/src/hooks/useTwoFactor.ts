/**
 * Two-Factor Authentication Hook
 * Manages 2FA setup, verification, and status
 */

import { useState, useCallback } from "react";

export interface TwoFactorStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesCount: number;
  timeRemaining: number;
}

export interface TwoFactorSecret {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  timeRemaining: number;
}

export function useTwoFactor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);

  /**
   * Get 2FA status
   */
  const getStatus = useCallback(async (): Promise<TwoFactorStatus> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/status");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get 2FA status");
      }

      const data = await response.json();
      setStatus(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate TOTP secret and QR code
   */
  const generateSecret = useCallback(async (): Promise<TwoFactorSecret> => {
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
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify token and enable 2FA
   */
  const verifyAndEnable = useCallback(async (token: string): Promise<{ backupCodes: string[] }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/setup?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
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
   * Verify TOTP token
   */
  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/verify?action=token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const data = await response.json();
      return data.verified === true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify backup code
   */
  const verifyBackupCode = useCallback(async (code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/verify?action=backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const data = await response.json();
      return data.verified === true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Disable 2FA
   */
  const disable = useCallback(async (
    verificationToken?: string,
    backupCode?: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken,
          backupCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to disable 2FA");
      }

      // Refresh status
      await getStatus();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getStatus]);

  /**
   * Generate new backup codes
   */
  const generateBackupCodes = useCallback(async (): Promise<string[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/backup-codes", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate backup codes");
      }

      const data = await response.json();
      return data.backupCodes;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    status,
    getStatus,
    generateSecret,
    verifyAndEnable,
    verifyToken,
    verifyBackupCode,
    disable,
    generateBackupCodes,
  };
}
