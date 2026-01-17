/**
 * Bank Account Validation Service
 * Validates Australian bank account details (BSB, account number)
 */

import { NPPAdapter } from "./npp-adapter";

export interface BankAccountDetails {
  accountNumber: string;
  bsb: string;
  accountName: string;
  payId?: string;
}

export interface ValidationResult {
  valid: boolean;
  accountName?: string;
  error?: string;
  warnings?: string[];
}

export class BankValidationService {
  private nppAdapter: NPPAdapter;

  constructor(nppAdapter: NPPAdapter) {
    this.nppAdapter = nppAdapter;
  }

  /**
   * Validate BSB format (Australian format: 6 digits)
   */
  validateBSB(bsb: string): { valid: boolean; error?: string } {
    // Remove spaces and dashes
    const cleaned = bsb.replace(/[\s-]/g, "");

    if (!/^\d{6}$/.test(cleaned)) {
      return {
        valid: false,
        error: "BSB must be 6 digits",
      };
    }

    // Validate BSB structure (first 2 digits = bank, next 1 = state, last 3 = branch)
    const bank = parseInt(cleaned.substring(0, 2));
    const state = parseInt(cleaned.substring(2, 3));
    const branch = parseInt(cleaned.substring(3, 6));

    // Basic validation (bank codes 01-99, state 0-9, branch 000-999)
    if (bank < 1 || bank > 99) {
      return {
        valid: false,
        error: "Invalid bank code in BSB",
      };
    }

    return { valid: true };
  }

  /**
   * Validate account number format
   */
  validateAccountNumber(accountNumber: string): { valid: boolean; error?: string } {
    // Remove spaces
    const cleaned = accountNumber.replace(/\s/g, "");

    if (!/^\d{6,10}$/.test(cleaned)) {
      return {
        valid: false,
        error: "Account number must be 6-10 digits",
      };
    }

    return { valid: true };
  }

  /**
   * Validate PayID format (email or phone)
   */
  validatePayID(payId: string): { valid: boolean; error?: string } {
    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Phone format (Australian mobile: 04XX XXX XXX)
    const phoneRegex = /^04\d{8}$/;

    if (emailRegex.test(payId) || phoneRegex.test(payId.replace(/\s/g, ""))) {
      return { valid: true };
    }

    return {
      valid: false,
      error: "PayID must be a valid email or Australian mobile number (04XX XXX XXX)",
    };
  }

  /**
   * Comprehensive bank account validation
   */
  async validateBankAccount(
    details: BankAccountDetails
  ): Promise<ValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate BSB
    const bsbValidation = this.validateBSB(details.bsb);
    if (!bsbValidation.valid) {
      errors.push(bsbValidation.error!);
    }

    // Validate account number
    const accountValidation = this.validateAccountNumber(details.accountNumber);
    if (!accountValidation.valid) {
      errors.push(accountValidation.error!);
    }

    // Validate PayID if provided
    if (details.payId) {
      const payIdValidation = this.validatePayID(details.payId);
      if (!payIdValidation.valid) {
        warnings.push(payIdValidation.error!);
      }
    }

    // If basic validation fails, return early
    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join(", "),
        warnings,
      };
    }

    // Use NPP adapter to verify account with bank
    try {
      const verification = await this.nppAdapter.verifyAccount(details);

      if (!verification.valid) {
        return {
          valid: false,
          error: verification.error || "Account verification failed",
          warnings,
        };
      }

      // Check if account name matches (if provided by bank)
      if (
        verification.accountName &&
        details.accountName &&
        verification.accountName.toLowerCase() !==
          details.accountName.toLowerCase()
      ) {
        warnings.push(
          "Account name does not match bank records. Please verify."
        );
      }

      return {
        valid: true,
        accountName: verification.accountName || details.accountName,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Account verification failed",
        warnings,
      };
    }
  }

  /**
   * Format BSB for display (XXX-XXX)
   */
  formatBSB(bsb: string): string {
    const cleaned = bsb.replace(/[\s-]/g, "");
    if (cleaned.length === 6) {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`;
    }
    return bsb;
  }

  /**
   * Mask account number for display (show last 4 digits only)
   */
  maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) {
      return "****";
    }
    return `****${accountNumber.slice(-4)}`;
  }
}
