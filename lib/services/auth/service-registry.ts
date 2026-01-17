/**
 * Service Registry
 * Manages service configurations for AccessiBooks, Disapedia, MapAble, MediaWiki, and Cursor/Replit
 */

import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/config/env";

export type ServiceId = "mapable" | "accessibooks" | "disapedia" | "mediawiki" | "cursor-replit";

export interface ServiceConfig {
  serviceId: ServiceId;
  name: string;
  callbackUrl: string;
  allowedScopes: string[];
  tokenExpiration?: number; // in seconds, defaults to 3600
  clientId?: string; // For service-to-service authentication
  clientSecret?: string; // For service-to-service authentication
  enabled: boolean;
}

class ServiceRegistry {
  private services: Map<ServiceId, ServiceConfig> = new Map();
  private initialized = false;

  /**
   * Initialize service registry with environment variables
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    const env = getEnv();

    // MapAble - mapable.com.au
    this.registerService({
      serviceId: "mapable",
      name: "MapAble",
      callbackUrl: process.env.MAPABLE_CALLBACK_URL || "https://mapable.com.au/auth/callback",
      allowedScopes: ["read:profile", "read:email", "read:services"],
      tokenExpiration: 3600,
      enabled: true,
    });

    // AccessiBooks - accessibooks.com.au
    this.registerService({
      serviceId: "accessibooks",
      name: "AccessiBooks",
      callbackUrl: process.env.ACCESSIBOOKS_CALLBACK_URL || "https://accessibooks.com.au/auth/callback",
      allowedScopes: ["read:profile", "read:email", "read:services"],
      tokenExpiration: 3600,
      enabled: true,
    });

    // Disapedia - disapedia.au
    this.registerService({
      serviceId: "disapedia",
      name: "Disapedia",
      callbackUrl: process.env.DISAPEDIA_CALLBACK_URL || "https://disapedia.au/auth/callback",
      allowedScopes: ["read:profile", "read:email", "read:services"],
      tokenExpiration: 3600,
      enabled: true,
    });

    // MediaWiki
    this.registerService({
      serviceId: "mediawiki",
      name: "MediaWiki",
      callbackUrl: process.env.MEDIAWIKI_CALLBACK_URL || "https://wiki.example.com/auth/callback",
      allowedScopes: ["read:profile", "read:email", "write:user"],
      tokenExpiration: 7200, // Longer expiration for MediaWiki
      enabled: true,
    });

    // Cursor/Replit Applications
    this.registerService({
      serviceId: "cursor-replit",
      name: "Cursor/Replit Apps",
      callbackUrl: process.env.CURSOR_REPLIT_CALLBACK_URL || "https://apps.example.com/auth/callback",
      allowedScopes: ["read:profile", "read:email"],
      tokenExpiration: 1800, // Shorter expiration for apps
      enabled: true,
    });

    this.initialized = true;
    logger.info("Service registry initialized", { serviceCount: this.services.size });
  }

  /**
   * Register a service configuration
   */
  registerService(config: ServiceConfig): void {
    this.services.set(config.serviceId, config);
    logger.debug("Service registered", { serviceId: config.serviceId, name: config.name });
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceId: ServiceId): ServiceConfig | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.services.get(serviceId) || null;
  }

  /**
   * Validate service callback URL
   * Supports exact match and domain-based validation for security
   */
  validateServiceCallback(serviceId: ServiceId, callbackUrl: string): boolean {
    const config = this.getServiceConfig(serviceId);
    if (!config) {
      return false;
    }

    // Allow exact match
    if (callbackUrl === config.callbackUrl) {
      return true;
    }

    // Domain-based validation for production services
    const serviceDomains: Record<ServiceId, string[]> = {
      mapable: ["mapable.com.au", "www.mapable.com.au"],
      accessibooks: ["accessibooks.com.au", "www.accessibooks.com.au"],
      disapedia: ["disapedia.au", "www.disapedia.au"],
      mediawiki: [], // MediaWiki uses custom callback URLs
      "cursor-replit": [], // Cursor/Replit uses custom callback URLs
    };

    const allowedDomains = serviceDomains[serviceId] || [];
    try {
      const url = new URL(callbackUrl);
      const hostname = url.hostname.toLowerCase();
      
      // Check if callback URL is from an allowed domain
      if (allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
        // Ensure it's a callback path (security: only allow /auth/callback or similar)
        const pathname = url.pathname.toLowerCase();
        if (pathname.includes("/auth/callback") || pathname.includes("/oauth/callback")) {
          return true;
        }
      }
    } catch {
      // Invalid URL
      return false;
    }

    // In development, allow localhost variations
    if (process.env.NODE_ENV === "development") {
      const localhostPattern = /^https?:\/\/localhost(:\d+)?/;
      if (localhostPattern.test(callbackUrl)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get service callback URL
   */
  getServiceCallbackUrl(serviceId: ServiceId): string | null {
    const config = this.getServiceConfig(serviceId);
    return config?.callbackUrl || null;
  }

  /**
   * Check if service is enabled
   */
  isServiceEnabled(serviceId: ServiceId): boolean {
    const config = this.getServiceConfig(serviceId);
    return config?.enabled ?? false;
  }

  /**
   * Get all registered services
   */
  getAllServices(): ServiceConfig[] {
    if (!this.initialized) {
      this.initialize();
    }

    return Array.from(this.services.values());
  }

  /**
   * Validate service credentials (for service-to-service auth)
   */
  validateServiceCredentials(serviceId: ServiceId, clientId: string, clientSecret: string): boolean {
    const config = this.getServiceConfig(serviceId);
    if (!config || !config.clientId || !config.clientSecret) {
      return false;
    }

    return config.clientId === clientId && config.clientSecret === clientSecret;
  }

  /**
   * Get allowed scopes for a service
   */
  getAllowedScopes(serviceId: ServiceId): string[] {
    const config = this.getServiceConfig(serviceId);
    return config?.allowedScopes || [];
  }

  /**
   * Validate requested scopes against service allowed scopes
   */
  validateScopes(serviceId: ServiceId, requestedScopes: string[]): boolean {
    const allowedScopes = this.getAllowedScopes(serviceId);
    return requestedScopes.every((scope) => allowedScopes.includes(scope));
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();

// Initialize on module load
serviceRegistry.initialize();
