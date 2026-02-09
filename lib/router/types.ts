/**
 * Universal Router – type definitions
 */

export type RouteParams = {
  home: Record<string, never>;
  providerFinder: Record<string, never>;
  outletProfile: { slug: string };
  claimedProfile: { slug: string };
  jonathan: Record<string, never>;
  jonathanDashboard: Record<string, never>;
  jonathanParticipant: Record<string, never>;
  jonathanParticipantProfile: { slug: string };
  jonathanEmulate: Record<string, never>;
  login: Record<string, never>;
  register: Record<string, never>;
  providerRegister: Record<string, never>;
  onboarding: Record<string, never>;
  dashboard: Record<string, never>;
  map: Record<string, never>;
  accessiview: Record<string, never>;
};

export type RouteName = keyof RouteParams;

export type RouteMeta = {
  path: string;
  pattern: RegExp;
  paramKeys: string[];
  authRequired?: boolean;
};

export type RouteRegistry = {
  [K in RouteName]: RouteMeta;
};
