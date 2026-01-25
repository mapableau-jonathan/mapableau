/**
 * Route Optimizer Service (Legacy)
 * @deprecated Use RouteService from route-service.ts instead
 * This class is kept for backward compatibility
 */

import { RouteService, getRouteService } from "./route-service";

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Route {
  waypoints: Location[];
  distance: number; // in kilometers
  duration: number; // in minutes
  accessibilityScore: number; // 0-100
}

export interface OptimizationOptions {
  prioritizeAccessibility: boolean;
  avoidTolls: boolean;
  avoidHighways: boolean;
  maxDetour?: number; // maximum detour in kilometers
}

/**
 * Route Optimizer Service (Legacy wrapper)
 * @deprecated Use RouteService directly
 */
export class RouteOptimizerService {
  private routeService: RouteService;

  constructor() {
    this.routeService = getRouteService();
  }
  /**
   * Optimize route for multiple stops
   */
  async optimizeRoute(
    start: Location,
    end: Location,
    waypoints: Location[],
    options?: OptimizationOptions
  ): Promise<Route> {
    return this.routeService.optimizeRoute(start, end, waypoints, options);
  }

  /**
   * Find accessible routes between two points
   */
  async findAccessibleRoutes(
    start: Location,
    end: Location,
    requirements: string[]
  ): Promise<Route[]> {
    return this.routeService.findAccessibleRoutes(start, end, requirements);
  }
}
