/**
 * Route Service
 * Unified service for route optimization using adapter pattern
 */

import { RouteAdapter, Location, Route, RouteOptimizationOptions } from "./adapters/route-adapter";
import { GoogleMapsRouteAdapter } from "./adapters/google-maps-route-adapter";
import { BasicRouteAdapter } from "./adapters/basic-route-adapter";
import { logger } from "@/lib/logger";

export interface RouteServiceConfig {
  provider: "google" | "basic";
  googleMapsApiKey?: string;
}

/**
 * Route Service
 * Provides route optimization with fallback to basic calculations
 */
export class RouteService {
  private primaryAdapter: RouteAdapter;
  private fallbackAdapter: RouteAdapter;

  constructor(config?: RouteServiceConfig) {
    const provider = config?.provider || "google";

    // Initialize primary adapter
    if (provider === "google") {
      this.primaryAdapter = new GoogleMapsRouteAdapter(config?.googleMapsApiKey);
    } else {
      this.primaryAdapter = new BasicRouteAdapter();
    }

    // Always have a basic fallback
    this.fallbackAdapter = new BasicRouteAdapter();
  }

  /**
   * Optimize route with automatic fallback
   */
  async optimizeRoute(
    start: Location,
    end: Location,
    waypoints: Location[] = [],
    options?: RouteOptimizationOptions
  ): Promise<Route> {
    try {
      if (this.primaryAdapter.isEnabled()) {
        return await this.primaryAdapter.optimizeRoute(start, end, waypoints, options);
      }
    } catch (error) {
      logger.warn("Primary route adapter failed, using fallback", { error });
    }

    // Use fallback adapter
    return this.fallbackAdapter.optimizeRoute(start, end, waypoints, options);
  }

  /**
   * Find accessible routes
   */
  async findAccessibleRoutes(
    start: Location,
    end: Location,
    requirements: string[]
  ): Promise<Route[]> {
    try {
      if (this.primaryAdapter.isEnabled()) {
        return await this.primaryAdapter.findAccessibleRoutes(start, end, requirements);
      }
    } catch (error) {
      logger.warn("Primary route adapter failed, using fallback", { error });
    }

    // Use fallback adapter
    return this.fallbackAdapter.findAccessibleRoutes(start, end, requirements);
  }

  /**
   * Get service status
   */
  getStatus(): {
    primaryProvider: string;
    primaryEnabled: boolean;
    fallbackAvailable: boolean;
  } {
    return {
      primaryProvider: this.primaryAdapter instanceof GoogleMapsRouteAdapter ? "google" : "basic",
      primaryEnabled: this.primaryAdapter.isEnabled(),
      fallbackAvailable: this.fallbackAdapter.isEnabled(),
    };
  }
}

// Export default instance
export const routeService = new RouteService();
