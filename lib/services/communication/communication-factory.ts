/**
 * Communication Service Factory
 * Centralizes communication service instantiation
 */

import { CommunicationService, CommunicationConfig } from "./communication-service";
import { getEnv } from "@/lib/config/env";

// Singleton instance
let communicationServiceInstance: CommunicationService | null = null;

/**
 * Get CommunicationService instance (singleton)
 */
export function getCommunicationService(): CommunicationService {
  if (!communicationServiceInstance) {
    const env = getEnv();
    
    const config: CommunicationConfig = {
      sms: {
        provider: env.TWILIO_ACCOUNT_SID ? "twilio" : "mock",
        config: {
          accountSid: env.TWILIO_ACCOUNT_SID,
          authToken: env.TWILIO_AUTH_TOKEN,
          fromNumber: env.TWILIO_PHONE_NUMBER,
          verifyServiceSid: env.TWILIO_VERIFY_SERVICE_SID,
        },
      },
      email: {
        provider: env.TWILIO_SENDGRID_API_KEY ? "sendgrid" : "mock",
        config: {
          apiKey: env.TWILIO_SENDGRID_API_KEY || env.SENDGRID_API_KEY,
          fromEmail: env.TWILIO_SENDGRID_FROM_EMAIL || env.FROM_EMAIL,
          fromName: env.TWILIO_SENDGRID_FROM_NAME || env.FROM_NAME,
        },
      },
      calendar: {
        provider: env.GOOGLE_CALENDAR_CLIENT_ID
          ? "google"
          : env.OUTLOOK_CALENDAR_CLIENT_ID
          ? "outlook"
          : "icalendar",
        config: env.GOOGLE_CALENDAR_CLIENT_ID
          ? {
              clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
              clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
              apiKey: env.GOOGLE_CALENDAR_API_KEY,
              redirectUri: env.GOOGLE_CALENDAR_REDIRECT_URI,
            }
          : env.OUTLOOK_CALENDAR_CLIENT_ID
          ? {
              clientId: env.OUTLOOK_CALENDAR_CLIENT_ID,
              clientSecret: env.OUTLOOK_CALENDAR_CLIENT_SECRET,
              tenantId: env.OUTLOOK_CALENDAR_TENANT_ID || env.AZURE_AD_TENANT_ID,
              redirectUri: env.OUTLOOK_CALENDAR_REDIRECT_URI,
            }
          : undefined,
      },
    };

    communicationServiceInstance = new CommunicationService(config);
  }
  
  return communicationServiceInstance;
}
