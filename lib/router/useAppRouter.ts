"use client";

import { usePathname, useRouter as useNextRouter } from "next/navigation";

import { buildPath, parsePath, type ParsedRoute } from "./build";
import { ROUTE_REGISTRY } from "./registry";
import type { RouteName, RouteParams } from "./types";

export type AppRouter = {
  push: <N extends RouteName>(route: N, params: RouteParams[N]) => void;
  replace: <N extends RouteName>(route: N, params: RouteParams[N]) => void;
  buildPath: typeof buildPath;
  parsePath: typeof parsePath;
  pathname: string;
  current: ParsedRoute | null;
  isActive: (route: RouteName, params?: Partial<RouteParams[RouteName]>) => boolean;
};

export function useAppRouter(): AppRouter {
  const nextRouter = useNextRouter();
  const pathname = usePathname() ?? "/";

  const current = parsePath(pathname);

  const push = <N extends RouteName>(route: N, params: RouteParams[N]) => {
    nextRouter.push(buildPath(route, params));
  };

  const replace = <N extends RouteName>(route: N, params: RouteParams[N]) => {
    nextRouter.replace(buildPath(route, params));
  };

  const isActive = (
    route: RouteName,
    params?: Partial<RouteParams[RouteName]>,
  ): boolean => {
    if (!current || current.route !== route) return false;
    if (!params) return true;
    return Object.entries(params).every(
      ([k, v]) => (current.params as Record<string, string>)[k] === v,
    );
  };

  return {
    push,
    replace,
    buildPath,
    parsePath,
    pathname,
    current,
    isActive,
  };
}

export { ROUTE_REGISTRY };
