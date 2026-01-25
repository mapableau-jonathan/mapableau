/**
 * Payment Type Definitions
 * Unified types for payment processing across providers
 */

export type PaymentProvider = "stripe" | "paypal" | "npp" | "coinbase";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  invoiceId?: string;
  userId: string;
  provider: PaymentProvider;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  provider: PaymentProvider;
  paymentId: string;
  status: PaymentStatus;
  clientSecret?: string; // Stripe
  approvalUrl?: string; // PayPal
  hostedUrl?: string; // Coinbase
  metadata?: Record<string, any>;
}

export interface SavedPaymentMethod {
  id: string;
  userId: string;
  provider: PaymentProvider;
  type: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface StripePaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, string>;
}

export interface PayPalOrder {
  id: string;
  status: string;
  approvalUrl?: string;
  amount: {
    currency_code: string;
    value: string;
  };
}

export interface WebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  data: any;
  timestamp: Date;
}

export interface InvoicePaymentRequest {
  invoiceId: string;
  provider: PaymentProvider;
  paymentMethodId?: string;
}

export interface SubscriptionRequest {
  userId: string;
  planId: string;
  provider: PaymentProvider;
  paymentMethodId?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}
