/**
 * Payment Formatting Utilities
 */

export interface FormattedAmount {
  amount: string;
  currency: string;
  display: string;
}

/**
 * Format amount for display
 */
export function formatAmount(
  amount: number,
  currency: string = "AUD"
): FormattedAmount {
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return {
    amount: amount.toFixed(2),
    currency,
    display: formatted,
  };
}

/**
 * Format payment status message
 */
export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: "Payment is pending",
    PROCESSING: "Payment is being processed",
    COMPLETED: "Payment completed successfully",
    FAILED: "Payment failed",
    CANCELLED: "Payment was cancelled",
    REFUNDED: "Payment was refunded",
  };

  return statusMap[status] || "Unknown payment status";
}

/**
 * Format error message for user
 */
export function formatPaymentError(error: Error | string): string {
  const errorMessage = typeof error === "string" ? error : error.message;

  // Map common errors to user-friendly messages
  const errorMap: Record<string, string> = {
    "card_declined": "Your card was declined. Please try a different payment method.",
    "insufficient_funds": "Insufficient funds. Please check your account balance.",
    "expired_card": "Your card has expired. Please use a different card.",
    "invalid_cvc": "The security code is incorrect. Please check and try again.",
    "processing_error": "An error occurred while processing your payment. Please try again.",
    "authentication_required": "Additional authentication is required. Please complete the verification.",
  };

  for (const [key, message] of Object.entries(errorMap)) {
    if (errorMessage.toLowerCase().includes(key)) {
      return message;
    }
  }

  return errorMessage || "An unexpected error occurred. Please try again.";
}

/**
 * Format invoice number
 */
export function formatInvoiceNumber(invoiceNumber: string): string {
  // Format: INV-20240118-001
  return invoiceNumber;
}

/**
 * Format payment reference
 */
export function formatPaymentReference(
  provider: string,
  paymentId: string
): string {
  const prefix = provider.toUpperCase().substring(0, 3);
  return `${prefix}-${paymentId.substring(0, 8).toUpperCase()}`;
}
