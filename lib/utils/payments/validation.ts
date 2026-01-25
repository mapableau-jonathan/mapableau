/**
 * Payment Validation Utilities
 */

import { z } from "zod";

export const paymentAmountSchema = z
  .number()
  .positive("Amount must be positive")
  .max(1000000, "Amount exceeds maximum limit");

export const currencySchema = z.enum(["AUD", "USD", "EUR", "GBP"]);

export const paymentProviderSchema = z.enum(["stripe", "paypal", "npp", "coinbase"]);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number): ValidationResult {
  try {
    paymentAmountSchema.parse(amount);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => e.message),
      };
    }
    return { valid: false, errors: ["Invalid amount"] };
  }
}

/**
 * Validate currency
 */
export function validateCurrency(currency: string): ValidationResult {
  try {
    currencySchema.parse(currency.toUpperCase());
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => e.message),
      };
    }
    return { valid: false, errors: ["Invalid currency"] };
  }
}

/**
 * Validate payment provider
 */
export function validatePaymentProvider(provider: string): ValidationResult {
  try {
    paymentProviderSchema.parse(provider.toLowerCase());
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => e.message),
      };
    }
    return { valid: false, errors: ["Invalid payment provider"] };
  }
}

/**
 * Validate payment request
 */
export function validatePaymentRequest(request: {
  amount: number;
  currency: string;
  provider: string;
  userId: string;
}): ValidationResult {
  const errors: string[] = [];

  const amountValidation = validatePaymentAmount(request.amount);
  if (!amountValidation.valid) {
    errors.push(...amountValidation.errors);
  }

  const currencyValidation = validateCurrency(request.currency);
  if (!currencyValidation.valid) {
    errors.push(...currencyValidation.errors);
  }

  const providerValidation = validatePaymentProvider(request.provider);
  if (!providerValidation.valid) {
    errors.push(...providerValidation.errors);
  }

  if (!request.userId) {
    errors.push("User ID is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
