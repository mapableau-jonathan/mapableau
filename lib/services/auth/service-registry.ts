/**
 * Service Registry
 * Centralized registry for all Australian Disability Ltd services
 */

import { getEnv } from "@/lib/config/env";

export type ServiceId =
  | "mapable"
  | "accessibooks"
  | "disapedia"
  | "mediawiki"
  | "cursor-replit";

export interface ServiceConfig {
  id: ServiceId;
  name: string;
  domain: string;
  callbackUrl: string;
  clientId?: string;
  clientSecret?: string;
  allowedScopes: string[];
  tokenExpiration: number; // seconds
  requiresEmailVerification: boolean;
  enabled: boolean;
}

/**
 * Service Registry
 * Manages configuration for all services
 */
class ServiceRegistry {
  private services: Map<ServiceId, ServiceConfig> = new Map();

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    const env = getEnv();

    // MapAble
    this.register({
      id: "mapable",
      name: "MapAble",
      domain: "mapable.com.au",
      callbackUrl: env.MAPABLE_CALLBACK_URL || "https://mapable.com.au/auth/callback",
      allowedScopes: ["read:profile", "read:email", "read:services"],
      tokenExpiration: 3600, // 1 hour
      requiresEmailVerification: true,
      enabled: true,
    });

    // AccessiBooks
    this.register({
      id: "accessibooks",
      name: "AccessiBooks",
      domain: "accessibooks.com.au",
      callbackUrl: env.ACCESSIBOOKS_CALLBACK_URL || "https://accessibooks.com.au/auth/callback",
      allowedScopes: ["read:profile", "read:email", "read:library"],
      tokenExpiration: 7200, // 2 hours
      requiresEmailVerification: true,
      enabled: true,
    });

    // Disapedia
    this.register({
      id: "disapedia",
      name: "Disapedia",
      domain: "disapedia.au",
      callbackUrl: env.DISAPEDIA_CALLBACK_URL || "https://disapedia.au/auth/callback",
      allowedScopes: ["read:profile", "read:email", "read:wiki"],
      tokenExpiration: 3600, // 1 hour
      requiresEmailVerification: true,
      enabled: true,
    });

    // MediaWiki
    this.register({
      id: "mediawiki",
      name: "MediaWiki",
      domain: env.AD_ID_DOMAIN || "ad.id",
      callbackUrl: env.MEDIAWIKI_CALLBACK_URL || `${env.AD_ID_DOMAIN || "https://ad.id"}/api/auth/callback/mediawiki`,
      allowedScopes: ["read:profile", "read:email", "write:wiki"],
      tokenExpiration: 86400, // 24 hours
      requiresEmailVerification: false,
      enabled: true,
    });

    // Cursor/Replit
    this.register({
      id: "cursor-replit",
      name: "Cursor/Replit",
      domain: env.AD_ID_DOMAIN || "ad.id",
      callbackUrl: env.CURSOR_REPLIT_CALLBACK_URL || `${env.AD_ID_DOMAIN || "https://ad.id"}/api/auth/callback/cursor-replit`,
      allowedScopes: ["read:profile", "read:email", "read:code"],
      tokenExpiration: 1800, // 30 minutes
      requiresEmailVerification: false,
      enabled: true,
    });
  }

  /**
   * Register a service
   */
  register(config: ServiceConfig): void {
    this.services.set(config.id, config);
  }

  /**
   * Get service configuration
   */
  get(serviceId: ServiceId): ServiceConfig | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Check if service exists and is enabled
   */
  isEnabled(serviceId: ServiceId): boolean {
    const service = this.services.get(serviceId);
    return service?.enabled ?? false;
  }

  /**
   * Validate service credentials
   */
  validateCredentials(serviceId: ServiceId, clientId: string, clientSecret: string): boolean {
    const service = this.services.get(serviceId);
    if (!service) return false;
    return service.clientId === clientId && service.clientSecret === clientSecret;
  }

  /**
   * Get all enabled services
   */
  getAllEnabled(): ServiceConfig[] {
    return Array.from(this.services.values()).filter((s) => s.enabled);
  }

  /**
   * Validate callback URL for service
   */
  validateCallbackUrl(serviceId: ServiceId, callbackUrl: string): boolean {
    const service = this.services.get(serviceId);
    if (!service) return false;
    return callbackUrl.startsWith(service.callbackUrl) || callbackUrl === service.callbackUrl;
  }

  /**
   * Get allowed scopes for service
   */
  getAllowedScopes(serviceId: ServiceId): string[] {
    const service = this.services.get(serviceId);
    return service?.allowedScopes || [];
  }

  /**
   * Validate scopes for service
   */
  validateScopes(serviceId: ServiceId, scopes: string[]): boolean {
    const allowedScopes = this.getAllowedScopes(serviceId);
    return scopes.every((scope) => allowedScopes.includes(scope));
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();
