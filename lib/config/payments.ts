/**
 * Payment Configuration
 * Centralized configuration for payment providers and usage billing
 */

import { getEnv } from "./env";

export interface PaymentConfig {
  stripe: {
    enabled: boolean;
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
    enableLink: boolean;
  };
  paypal: {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
    webhookId?: string;
    environment: "sandbox" | "production";
  };
  usage: {
    enabled: boolean;
    apiCallRate: number;
    serviceRates: Record<string, number>;
    storageRatePerGB: number;
    billingPeriodDays: number;
    autoGenerateInvoices: boolean;
    autoChargeInvoices: boolean;
    invoiceDueDays: number;
  };
}

/**
 * Get payment configuration
 */
export function getPaymentConfig(): PaymentConfig {
  const env = getEnv();

  return {
    stripe: {
      enabled: !!env.STRIPE_SECRET_KEY,
      secretKey: env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      enableLink: process.env.STRIPE_ENABLE_LINK === "true",
    },
    paypal: {
      enabled: !!env.PAYPAL_CLIENT_ID && !!env.PAYPAL_CLIENT_SECRET,
      clientId: env.PAYPAL_CLIENT_ID,
      clientSecret: env.PAYPAL_CLIENT_SECRET,
      webhookId: env.PAYPAL_WEBHOOK_SECRET,
      environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production",
    },
    usage: {
      enabled: process.env.USAGE_TRACKING_ENABLED === "true",
      apiCallRate: parseFloat(process.env.API_CALL_COST || "0.001"),
      serviceRates: {
        care: parseFloat(process.env.HOURLY_RATE_SERVICE_CARE || "50.00"),
        transport: parseFloat(process.env.HOURLY_RATE_SERVICE_TRANSPORT || "30.00"),
        default: parseFloat(process.env.HOURLY_RATE_SERVICE_CARE || "50.00"),
      },
      storageRatePerGB: parseFloat(process.env.STORAGE_COST_PER_GB || "0.10"),
      billingPeriodDays: parseInt(process.env.BILLING_PERIOD_DAYS || "30", 10),
      autoGenerateInvoices: process.env.AUTO_GENERATE_INVOICES === "true",
      autoChargeInvoices: process.env.AUTO_CHARGE_INVOICES === "true",
      invoiceDueDays: parseInt(process.env.INVOICE_DUE_DAYS || "14", 10),
    },
  };
}

/**
 * Validate payment configuration
 */
export function validatePaymentConfig(config: PaymentConfig): void {
  if (config.stripe.enabled && !config.stripe.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required when Stripe is enabled");
  }

  if (config.paypal.enabled && (!config.paypal.clientId || !config.paypal.clientSecret)) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required when PayPal is enabled");
  }
}
