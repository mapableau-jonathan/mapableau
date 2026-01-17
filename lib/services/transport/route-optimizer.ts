/**
 * Route Optimizer Service
 * Optimizes transport routes considering accessibility requirements
 */

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
  maxDetour: number; // maximum detour in kilometers
}

export class RouteOptimizerService {
  /**
   * Optimize route for multiple stops
   */
  async optimizeRoute(
    start: Location,
    end: Location,
    waypoints: Location[],
    options?: OptimizationOptions
  ): Promise<Route> {
    // In production, this would integrate with Google Maps Directions API
    // or similar routing service with accessibility considerations

    // For now, return a simple route
    const allPoints = [start, ...waypoints, end];
    const distance = this.calculateTotalDistance(allPoints);
    const duration = this.estimateDuration(distance);
    const accessibilityScore = this.calculateAccessibilityScore(
      allPoints,
      options
    );

    return {
      waypoints: allPoints,
      distance,
      duration,
      accessibilityScore,
    };
  }

  /**
   * Calculate total distance using Haversine formula
   */
  private calculateTotalDistance(locations: Location[]): number {
    let total = 0;
    for (let i = 0; i < locations.length - 1; i++) {
      total += this.haversineDistance(
        locations[i],
        locations[i + 1]
      );
    }
    return total;
  }

  /**
   * Haversine distance calculation
   */
  private haversineDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.latitude)) *
        Math.cos(this.toRad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Estimate duration based on distance
   */
  private estimateDuration(distance: number): number {
    // Assume average speed of 50 km/h in urban areas
    return Math.round((distance / 50) * 60);
  }

  /**
   * Calculate accessibility score for route
   */
  private calculateAccessibilityScore(
    locations: Location[],
    options?: OptimizationOptions
  ): number {
    // Base score
    let score = 70;

    // Increase score if accessibility is prioritized
    if (options?.prioritizeAccessibility) {
      score += 20;
    }

    // Reduce score if route includes tolls or highways (less accessible)
    if (options?.avoidTolls || options?.avoidHighways) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Find accessible routes between two points
   */
  async findAccessibleRoutes(
    start: Location,
    end: Location,
    requirements: string[]
  ): Promise<Route[]> {
    // In production, this would query accessibility data
    // and return multiple route options

    const routes: Route[] = [];

    // Primary route
    routes.push(await this.optimizeRoute(start, end, [], {
      prioritizeAccessibility: true,
      avoidTolls: true,
      avoidHighways: true,
    }));

    // Alternative route (if available)
    if (routes[0].accessibilityScore < 80) {
      routes.push(await this.optimizeRoute(start, end, [], {
        prioritizeAccessibility: true,
        avoidTolls: false,
        avoidHighways: false,
      }));
    }

    return routes.sort((a, b) => b.accessibilityScore - a.accessibilityScore);
  }
}
