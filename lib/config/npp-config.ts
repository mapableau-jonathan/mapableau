/**
 * NPP (New Payments Platform) Configuration
 */

export interface NPPConfig {
  apiUrl: string;
  apiKey: string;
  merchantId: string;
  webhookSecret: string;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export function getNPPConfig(): NPPConfig {
  return {
    apiUrl: process.env.NPP_API_URL || "https://api.npp.example.com",
    apiKey: process.env.NPP_API_KEY || "",
    merchantId: process.env.NPP_MERCHANT_ID || "",
    webhookSecret: process.env.NPP_WEBHOOK_SECRET || "",
    retryAttempts: parseInt(process.env.NPP_RETRY_ATTEMPTS || "3"),
    retryDelay: parseInt(process.env.NPP_RETRY_DELAY || "1000"),
  };
}
