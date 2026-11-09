import { categoryForRoute } from "../features/pocket/customer/categories";
import type { Locale } from "../features/pocket/locales";

// Only return to a known Spots screen on this origin and in the active locale.
export function spotsReturnTo(value: string | undefined, locale: Locale): string {
  const fallback = `/${locale}`;
  if (
    !value ||
    value.length > 8192 ||
    !value.startsWith(`/${locale}`) ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return fallback;
  const url = new URL(value, "https://pocket.local");
  const [pathLocale, screen, id, ...rest] = url.pathname.split("/").filter(Boolean);
  if (url.origin !== "https://pocket.local" || pathLocale !== locale) return fallback;
  const contextualPage =
    (screen === "r" || screen === "qr") &&
    Boolean(id && /^[a-zA-Z0-9_-]+$/.test(id)) &&
    rest.length === 1 &&
    (["profile", "reservations", "settings", "notifications"].includes(rest[0]) ||
      (screen === "r" ? ["reservation", "menu"] : ["menu", "bill"]).includes(rest[0]));
  if (rest.length) return contextualPage ? `${url.pathname}${url.search}${url.hash}` : fallback;
  const detail =
    (screen === "venue" || screen === "r" || screen === "qr") &&
    Boolean(id && /^[a-zA-Z0-9_-]+$/.test(id));
  const page =
    !id &&
    (!screen ||
      [
        "discover",
        "saved",
        "reservations",
        "history",
        "profile",
        "settings",
        "notifications",
      ].includes(screen) ||
      Boolean(categoryForRoute(screen)));
  return detail || page ? `${url.pathname}${url.search}${url.hash}` : fallback;
}

export function spotsAuthPath(
  locale: Locale,
  screen: "login" | "register" | "forgot-password",
  returnTo?: string,
  unavailable = false,
): string {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", spotsReturnTo(returnTo, locale));
  if (unavailable) params.set("error", "unavailable");
  return `/${locale}/${screen}${params.size ? `?${params}` : ""}`;
}
