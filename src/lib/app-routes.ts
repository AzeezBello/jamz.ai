/**
 * Routes that get the signed-in app chrome (sidebar offset + topbar). Public
 * pages keep the marketing header instead.
 *
 * Kept out of the component file so fast refresh keeps working.
 */
export const APP_ROUTES = ['/dashboard', '/settings', '/billing', '/moderation'] as const;

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
