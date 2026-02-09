/**
 * Service / module definitions for the services carousel and related UI.
 */

export type ServiceModule = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  category?: string;
};

/** Default list of service modules for the carousel. Override or extend as needed. */
export const DEFAULT_SERVICE_MODULES: ServiceModule[] = [];

export function getModules(): ServiceModule[] {
  return [...DEFAULT_SERVICE_MODULES];
}
