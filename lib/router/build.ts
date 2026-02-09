/**
 * Universal Router – path building & parsing
 */

import { ROUTE_REGISTRY } from "./registry";
import type { RouteName, RouteParams } from "./types";

function encodeParam(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Build a path for a route with the given params.
 */
export function buildPath<N extends RouteName>(
  route: N,
  params: RouteParams[N],
): string {
  const meta = ROUTE_REGISTRY[route];
  let path = meta.path;

  for (const key of meta.paramKeys) {
    const value = (params as Record<string, string>)[key];
    if (value === undefined || value === null)
      throw new Error(`Missing param "${key}" for route "${route}"`);
    path = path.replace(`[${key}]`, encodeParam(String(value)));
  }

  return path;
}

export type ParsedRoute<N extends RouteName = RouteName> = {
  route: N;
  params: RouteParams[N];
  pathname: string;
};

/**
 * Parse a pathname into a route name and params.
 * Returns null if no route matches.
 */
export function parsePath(pathname: string): ParsedRoute | null {
  const normalized = pathname.replace(/\?.*$/, "").replace(/\/$/, "") || "/";

  for (const [route, meta] of Object.entries(ROUTE_REGISTRY) as [
    RouteName,
    (typeof ROUTE_REGISTRY)[RouteName],
  ][]) {
    const match = normalized.match(meta.pattern);
    if (!match) continue;

    const params: Record<string, string> = {};
    meta.paramKeys.forEach((key, i) => {
      params[key] = decodeURIComponent(match[i + 1] ?? "");
    });

    return {
      route,
      params: params as RouteParams[typeof route],
      pathname: normalized,
    };
  }

  return null;
}

/**
 * Check if a pathname matches a route (optionally with exact route name).
 */
export function matchesRoute(
  pathname: string,
  route?: RouteName,
): boolean {
  const parsed = parsePath(pathname);
  if (!parsed) return false;
  if (route) return parsed.route === route;
  return true;
}
