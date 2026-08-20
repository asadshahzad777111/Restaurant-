/**
 * Help / impersonate is a separate, explicit mode.
 * Super (platform owner) must never become a restaurant Admin by visiting HQ tabs,
 * editing plans, or opening messages. Only "Help this restaurant" sets this cookie.
 * Middleware on control.asfins.com uses it to allow /home /pos /settings — without it,
 * those restaurant-admin routes bounce back to /control.
 *
 * Set the cookie from the browser on control.asfins.com (not only from api.ordo.asfins.com),
 * so Help mode is visible to the control-host middleware.
 */
export const HELP_MODE_COOKIE = "ordo_help_mode";

const MAX_AGE = 8 * 60 * 60;

export function helpModeCookieSetOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: false,
    maxAge: MAX_AGE,
  };
}

export function setHelpModeCookieClient(on: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? `${HELP_MODE_COOKIE}=1; path=/; max-age=${MAX_AGE}; samesite=lax`
    : `${HELP_MODE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
