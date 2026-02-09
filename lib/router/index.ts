/**
 * Universal Router System
 *
 * Usage:
 *   import { buildPath, useAppRouter, AppLink } from "@/lib/router";
 *
 *   // Build paths
 *   buildPath("outletProfile", { slug: "harbour-support" })
 *
 *   // Navigate
 *   const router = useAppRouter();
 *   router.push("claimedProfile", { slug: "harbour-support" });
 *
 *   // Type-safe links
 *   <AppLink route="providerFinder" params={{}}>Browse</AppLink>
 */

export { buildPath, parsePath, matchesRoute } from "./build";
export { redirect } from "./redirect";
export type { ParsedRoute } from "./build";
export { ROUTE_REGISTRY } from "./registry";
export type { RouteName, RouteParams } from "./types";
export { useAppRouter } from "./useAppRouter";
export type { AppRouter } from "./useAppRouter";
export { AppLink } from "./AppLink";
export type { AppLinkProps } from "./AppLink";
