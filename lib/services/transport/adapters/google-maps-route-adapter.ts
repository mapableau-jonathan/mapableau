/**
 * Google Maps Route Adapter
 * Concrete implementation using Google Maps Directions API
 */

import { RouteAdapter, Location, Route, RouteOptimizationOptions } from "./route-adapter";
import { logger } from "@/lib/logger";

/**
 * Google Maps Route Adapter
 */
export class GoogleMapsRouteAdapter implements RouteAdapter {
  private apiKey: string;
  private baseUrl: string = "https://maps.googleapis.com/maps/api/directions/json";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || "";
  }

  async optimizeRoute(
    start: Location,
    end: Location,
    waypoints: Location[],
    options?: RouteOptimizationOptions
  ): Promise<Route> {
    try {
      if (!this.isEnabled()) {
        // Fallback to basic calculation
        return this.calculateBasicRoute(start, end, waypoints, options);
      }

      const params = new URLSearchParams({
        origin: `${start.latitude},${start.longitude}`,
        destination: `${end.latitude},${end.longitude}`,
        key: this.apiKey,
        ...(options?.avoidTolls && { avoid: "tolls" }),
        ...(options?.avoidHighways && { avoid: "highways" }),
      });

      if (waypoints.length > 0) {
        const waypointStr = waypoints
          .map((w) => `${w.latitude},${w.longitude}`)
          .join("|");
        params.append("waypoints", waypointStr);
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      const data = await response.json();

      if (data.status !== "OK" || !data.routes?.[0]) {
        logger.warn("Google Maps API error, falling back to basic route", {
          status: data.status,
        });
        return this.calculateBasicRoute(start, end, waypoints, options);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      const allWaypoints: Location[] = [start];
      if (leg.steps) {
        // Extract intermediate waypoints from steps (simplified)
        for (const step of leg.steps.slice(0, -1)) {
          allWaypoints.push({
            address: step.end_address || "",
            latitude: step.end_location.lat,
            longitude: step.end_location.lng,
          });
        }
      }
      allWaypoints.push(...waypoints);
      allWaypoints.push(end);

      // Calculate accessibility score
      const accessibilityScore = this.calculateAccessibilityScore(
        allWaypoints,
        options
      );

      return {
        waypoints: allWaypoints,
        distance: leg.distance.value / 1000, // Convert meters to km
        duration: Math.round(leg.duration.value / 60), // Convert seconds to minutes
        accessibilityScore,
        metadata: {
          googleMapsRouteId: route.summary,
          bounds: route.bounds,
        },
      };
    } catch (error) {
      logger.error("Google Maps route optimization error", { error });
      // Fallback to basic calculation
      return this.calculateBasicRoute(start, end, waypoints, options);
    }
  }

  async findAccessibleRoutes(
    start: Location,
    end: Location,
    requirements: string[]
  ): Promise<Route[]> {
    const routes: Route[] = [];

    // Primary route with accessibility prioritization
    const primaryRoute = await this.optimizeRoute(start, end, [], {
      prioritizeAccessibility: requirements.length > 0,
      avoidTolls: true,
      avoidHighways: requirements.includes("NO_STAIRS"),
    });
    routes.push(primaryRoute);

    // Alternative route if primary score is low
    if (primaryRoute.accessibilityScore < 80) {
      const altRoute = await this.optimizeRoute(start, end, [], {
        prioritizeAccessibility: true,
        avoidTolls: false,
        avoidHighways: false,
      });
      routes.push(altRoute);
    }

    return routes.sort((a, b) => b.accessibilityScore - a.accessibilityScore);
  }

  /**
   * Calculate basic route when API is unavailable
   */
  private calculateBasicRoute(
    start: Location,
    end: Location,
    waypoints: Location[],
    options?: RouteOptimizationOptions
  ): Route {
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
    return !!this.apiKey;
  }
}
