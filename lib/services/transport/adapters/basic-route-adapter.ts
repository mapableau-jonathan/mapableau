/**
 * Basic Route Adapter
 * Fallback route adapter using simple distance calculations
 * Used when external APIs are unavailable
 */

import { RouteAdapter, Location, Route, RouteOptimizationOptions } from "./route-adapter";

/**
 * Basic Route Adapter
 * Simple implementation without external API dependencies
 */
export class BasicRouteAdapter implements RouteAdapter {
  async optimizeRoute(
    start: Location,
    end: Location,
    waypoints: Location[],
    options?: RouteOptimizationOptions
  ): Promise<Route> {
    const allPoints = [start, ...waypoints, end];
    const distance = this.calculateTotalDistance(allPoints);
    const duration = this.estimateDuration(distance);
    const accessibilityScore = this.calculateAccessibilityScore(allPoints, options);

    return {
      waypoints: allPoints,
      distance,
      duration,
      accessibilityScore,
    };
  }

  async findAccessibleRoutes(
    start: Location,
    end: Location,
    requirements: string[]
  ): Promise<Route[]> {
    // Return single route with accessibility optimizations
    const route = await this.optimizeRoute(start, end, [], {
      prioritizeAccessibility: requirements.length > 0,
      avoidTolls: true,
      avoidHighways: requirements.includes("NO_STAIRS"),
    });

    return [route];
  }

  /**
   * Calculate total distance using Haversine formula
   */
  private calculateTotalDistance(locations: Location[]): number {
    let total = 0;
    for (let i = 0; i < locations.length - 1; i++) {
      total += this.haversineDistance(locations[i], locations[i + 1]);
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
   * Calculate accessibility score
   */
  private calculateAccessibilityScore(
    locations: Location[],
    options?: RouteOptimizationOptions
  ): number {
    let score = 70;

    if (options?.prioritizeAccessibility) {
      score += 20;
    }

    if (options?.avoidTolls || options?.avoidHighways) {
      score += 10;
    }

    return Math.min(100, score);
  }

  isEnabled(): boolean {
    return true; // Basic adapter is always available
  }
}
