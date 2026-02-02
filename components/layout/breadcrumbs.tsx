"use client";

import { usePathname } from "next/navigation";
import { getBreadcrumbItems } from "@/lib/config/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export interface AppBreadcrumbsProps {
  className?: string;
  /** If true, hide breadcrumbs on the home page (single "Home" crumb). */
  hideOnHome?: boolean;
}

/**
 * Renders breadcrumbs from the current pathname using the central nav config.
 */
export function AppBreadcrumbs({ className, hideOnHome = true }: AppBreadcrumbsProps) {
  const pathname = usePathname();
  const items = pathname ? getBreadcrumbItems(pathname) : [];

  if (items.length === 0) return null;
  if (hideOnHome && items.length === 1 && items[0].href === "/") return null;

  return <Breadcrumb items={items} className={className} />;
}
