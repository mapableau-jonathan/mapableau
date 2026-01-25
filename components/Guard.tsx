/**
 * Guard Component
 * Renders children only if user has permission for the action
 */

"use client";

import { ReactNode } from "react";
import { useSessionUser } from "@/lib/ui/useSessionUser";
import { can, PermissionAction } from "@/lib/ui/permissions";

interface GuardProps {
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Guard({ action, children, fallback = null }: GuardProps) {
  const { user, loading } = useSessionUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!can(user, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
