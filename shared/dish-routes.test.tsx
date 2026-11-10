import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import RestaurantLayout from "../apps/dish/app/[locale]/r/[venueID]/layout";
import TableLayout from "../apps/dish/app/[locale]/qr/[token]/layout";
import LocaleLayout from "../apps/dish/app/[locale]/layout";
import LoginPage from "../apps/dish/app/[locale]/login/page";
import LegacyVenuePage from "../apps/dish/app/[locale]/venue/[venueID]/page";
import RestaurantPage from "../apps/dish/app/[locale]/r/[venueID]/page";
import RestaurantMenuPage from "../apps/dish/app/[locale]/r/[venueID]/menu/page";
import RestaurantReservationPage from "../apps/dish/app/[locale]/r/[venueID]/reservation/page";
import RestaurantProfilePage from "../apps/dish/app/[locale]/r/[venueID]/profile/page";
import TablePage from "../apps/dish/app/[locale]/qr/[token]/page";
import TableMenuPage from "../apps/dish/app/[locale]/qr/[token]/menu/page";
import TableBillPage from "../apps/dish/app/[locale]/qr/[token]/bill/page";
import TableProfilePage from "../apps/dish/app/[locale]/qr/[token]/profile/page";
import nextConfig from "../apps/dish/next.config";
import DishApp, { dishScreen } from "./dish-app";
import * as screens from "./dish-screens";
import AuthPage from "./auth-page";
import { dishReturnTo } from "../lib/dish-auth-navigation";
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
  useSelectedLayoutSegment: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());

const appDir = path.resolve(__dirname, "../apps/dish/app/[locale]");
const pageRoutes = (dir: string, prefix = ""): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return pageRoutes(full, `${prefix}/${name}`);
    return name === "page.tsx" ? [prefix || "/"] : [];
  });

it("serves only restaurant, table QR and sign-in routes", () => {
  const account = ["profile", "reservations", "settings", "notifications"];
  expect(pageRoutes(appDir).sort()).toEqual(
    [
      "/forgot-password",
      "/login",
      "/register",
      "/reset-password",
      "/venue/[venueID]",
      "/r/[venueID]",
      "/r/[venueID]/menu",
      "/r/[venueID]/reservation",
      ...account.map((screen) => `/r/[venueID]/${screen}`),
      "/qr/[token]",
      "/qr/[token]/menu",
      "/qr/[token]/bill",
      ...account.map((screen) => `/qr/[token]/${screen}`),
    ].sort(),
  );
});

it("opens the same restaurant and QR capabilities through Dish", async () => {
  const venue = await RestaurantLayout({
    children: null,
    params: Promise.resolve({ venueID: "venue-id" }),
  });
  expect(venue.type).toBe(DishApp);
  expect(venue.props).toMatchObject({ venueID: "venue-id" });
  const qr = await TableLayout({
    children: null,
    params: Promise.resolve({ token: "existing-token" }),
  });
  expect(qr.props).toMatchObject({ qrToken: "existing-token" });
  await expect(
    LegacyVenuePage({
      params: Promise.resolve({ locale: "ru", venueID: "venue-id" }),
      searchParams: Promise.resolve({ q: "кофе", from: "/ru/discover" }),
    }),
  ).rejects.toThrow("redirect:/ru/r/venue-id?q=%D0%BA%D0%BE%D1%84%D0%B5");
});

it("rejects malformed links and unknown locales", async () => {
  await expect(
    RestaurantLayout({ children: null, params: Promise.resolve({ venueID: "bad id" }) }),
  ).rejects.toThrow("not-found");
  await expect(
    TableLayout({ children: null, params: Promise.resolve({ token: "../token" }) }),
  ).rejects.toThrow("not-found");
  await expect(
    LocaleLayout({ children: null, params: Promise.resolve({ locale: "de" }) }),
  ).rejects.toThrow("not-found");
  expect(await LocaleLayout({ children: "page", params: Promise.resolve({ locale: "sk" }) })).toBe(
    "page",
  );
});

it("renders each URL with its page and screen", () => {
  expect(RestaurantPage).toBe(screens.VenueMenuPage);
  expect(RestaurantMenuPage).toBe(screens.VenueMenuPage);
  expect(RestaurantReservationPage).toBe(screens.VenueReservationPage);
  expect(RestaurantProfilePage).toBe(screens.ProfilePage);
  expect(TablePage).toBe(screens.TableHomePage);
  expect(TableMenuPage).toBe(screens.TableMenuPage);
  expect(TableBillPage).toBe(screens.TableBillPage);
  expect(TableProfilePage).toBe(screens.ProfilePage);
  for (const [segment, table, screen] of [
    [null, false, "menu"],
    ["menu", false, "menu"],
    ["reservation", false, "reservation"],
    ["profile", false, "profile"],
    [null, true, "table-home"],
    ["menu", true, "table"],
    ["bill", true, "table-bill"],
    ["settings", true, "settings"],
  ] as const)
    expect(dishScreen(segment, table)).toBe(screen);
});

it("signs in with a return address and redirects the old Ukrainian prefix", async () => {
  const login = await LoginPage({ searchParams: Promise.resolve({ returnTo: "/ru/r/venue-id" }) });
  expect(login.type).toBe(AuthPage);
  expect(login.props).toMatchObject({ mode: "login", product: "dish", returnTo: "/ru/r/venue-id" });
  expect(await nextConfig.redirects?.()).toEqual([
    { source: "/uk/:path*", destination: "/ua/:path*", permanent: false },
  ]);
});

it("keeps restaurant and QR destinations after sign-in without allowing external redirects", () => {
  expect(dishReturnTo("/ru/r/venue-id?q=tea#menu", "ru")).toBe("/ru/r/venue-id?q=tea#menu");
  expect(dishReturnTo("/ru/qr/existing-token", "ru")).toBe("/ru/qr/existing-token");
  expect(dishReturnTo("//evil.example/ru/r/id", "ru")).toBe("/ru");
  expect(dishReturnTo("/ru/r/venue-id/menu?category=breakfast", "ru")).toBe(
    "/ru/r/venue-id/menu?category=breakfast",
  );
  expect(dishReturnTo("/ru/r/venue-id/reservation", "ru")).toBe("/ru/r/venue-id/reservation");
  expect(dishReturnTo("/ru/qr/table-token/profile", "ru")).toBe("/ru/qr/table-token/profile");
  expect(dishReturnTo("/ru/r/id/reservation/extra", "ru")).toBe("/ru");
  for (const child of ["menu", "bill"])
    expect(dishReturnTo(`/ru/qr/token/${child}`, "ru")).toBe(`/ru/qr/token/${child}`);
});
