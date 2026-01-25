/**
 * Transport Service Factory
 * Centralizes transport service instantiation
 */

import { RouteService, RouteServiceConfig } from "./route-service";
import { TransportBookingService } from "./booking-service";
import { transportBillingService } from "./transport-billing-service";
import { deliveryTrackingService } from "./delivery-tracking-service";
import { reminderScheduler } from "./reminder-scheduler";
import { transportSMSNotificationService } from "./sms-notification-service";
import { transportCalendarIntegrationService } from "./calendar-integration-service";
import { getEnv } from "@/lib/config/env";

// Singleton instances
let routeServiceInstance: RouteService | null = null;
let bookingServiceInstance: TransportBookingService | null = null;

/**
 * Get RouteService instance (singleton)
 */
export function getRouteService(): RouteService {
  if (!routeServiceInstance) {
    const env = getEnv();
    
    const config: RouteServiceConfig = {
      provider: env.GOOGLE_MAPS_API_KEY ? "google" : "basic",
      googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
    };

    routeServiceInstance = new RouteService(config);
  }
  
  return routeServiceInstance;
}

/**
 * Get TransportBookingService instance (singleton)
 */
export function getTransportBookingService(): TransportBookingService {
  if (!bookingServiceInstance) {
    bookingServiceInstance = new TransportBookingService();
  }
  
  return bookingServiceInstance;
}

/**
 * Get all transport services
 */
export function getTransportServices() {
  return {
    route: getRouteService(),
    booking: getTransportBookingService(),
    billing: transportBillingService,
    tracking: deliveryTrackingService,
    reminders: reminderScheduler,
    sms: transportSMSNotificationService,
    calendar: transportCalendarIntegrationService,
  };
}
