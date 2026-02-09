"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { buildPath } from "./build";
import type { RouteName, RouteParams } from "./types";

export type AppLinkProps<N extends RouteName> = Omit<
  ComponentProps<typeof Link>,
  "href"
> & {
  route: N;
  params: RouteParams[N];
  href?: never;
};

/**
 * Type-safe Link that uses the route registry.
 * Prefer over raw Link for in-app navigation.
 */
export function AppLink<N extends RouteName>({
  route,
  params,
  children,
  ...props
}: AppLinkProps<N>) {
  const href = buildPath(route, params);
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
