/**
 * Route Adapter Interface
 * Abstraction for route optimization providers
 */

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Route {
  waypoints: Location[];
  distance: number; // kilometers
  duration: number; // minutes
  accessibilityScore: number; // 0-100
  metadata?: Record<string, any>;
}

export interface RouteOptimizationOptions {
  prioritizeAccessibility: boolean;
  avoidTolls: boolean;
  avoidHighways: boolean;
  maxDetour?: number; // kilometers
}

/**
 * Route Adapter Interface
 */
export interface RouteAdapter {
  /**
   * Optimize route between locations
   */
  optimizeRoute(
    start: Location,
    end: Location,
    waypoints: Location[],
    options?: RouteOptimizationOptions
  ): Promise<Route>;

  /**
   * Find accessible routes considering requirements
   */
  findAccessibleRoutes(
    start: Location,
    end: Location,
    requirements: string[]
  ): Promise<Route[]>;

  /**
   * Check if adapter is enabled/configured
   */
  isEnabled(): boolean;
}
