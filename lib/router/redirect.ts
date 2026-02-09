/**
 * Universal Router – server-side redirect helpers
 */

import { redirect as nextRedirect } from "next/navigation";

import { buildPath } from "./build";
import type { RouteName, RouteParams } from "./types";

/**
 * Redirect to a route (server components / route handlers).
 */
export function redirect<N extends RouteName>(
  route: N,
  params: RouteParams[N],
): never {
  nextRedirect(buildPath(route, params));
}
