/**
 * Universal Router – route registry
 *
 * Single source of truth for all app routes.
 * Path patterns use :param for dynamic segments.
 */

import type { RouteName, RouteParams, RouteRegistry } from "./types";

const pathToPattern = (path: string): { regex: RegExp; paramKeys: string[] } => {
  const paramKeys: string[] = [];
  const patternStr = path
    .replace(/\[\.\.\.(\w+)\]/g, (_, k) => {
      paramKeys.push(k);
      return "([^/]+)";
    })
    .replace(/\[(\w+)\]/g, (_, k) => {
      paramKeys.push(k);
      return "([^/]+)";
    })
    .replace(/\//g, "\\/");
  const regex = new RegExp(`^${patternStr}$`);
  return { regex, paramKeys };
};

const define = (
  path: string,
  meta?: Partial<{ authRequired: boolean }>,
): { path: string; pattern: RegExp; paramKeys: string[]; authRequired?: boolean } => {
  const { regex, paramKeys } = pathToPattern(path);
  return {
    path,
    pattern: regex,
    paramKeys,
    ...meta,
  };
};

export const ROUTE_REGISTRY: RouteRegistry = {
  home: define("/"),
  providerFinder: define("/provider-finder"),
  outletProfile: define("/jonathan/profile/[slug]"),
  claimedProfile: define("/profiles/[slug]"),
  jonathan: define("/jonathan"),
  jonathanDashboard: define("/jonathan/dashboard", { authRequired: true }),
  jonathanParticipant: define("/jonathan/participant", { authRequired: true }),
  jonathanParticipantProfile: define("/jonathan/participant/[slug]"),
  jonathanEmulate: define("/jonathan/emulate"),
  login: define("/login"),
  register: define("/register"),
  providerRegister: define("/register/provider"),
  onboarding: define("/onboarding", { authRequired: true }),
  dashboard: define("/dashboard", { authRequired: true }),
  map: define("/map"),
  accessiview: define("/accessiview"),
} as const;

export type { RouteName, RouteParams };
