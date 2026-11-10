import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, it, vi } from "vitest";
import WorkspaceLayout from "../apps/vendor/app/[locale]/(workspace)/layout";
import LocaleLayout from "../apps/vendor/app/[locale]/layout";
import LoginPage from "../apps/vendor/app/[locale]/login/page";
import InvitePage from "../apps/vendor/app/[locale]/invite/page";
import WorkspaceIndex from "../apps/vendor/app/[locale]/(workspace)/page";
import OwnerMenuPage from "../apps/vendor/app/[locale]/(workspace)/owner/menu/page";
import OwnerAccountPage from "../apps/vendor/app/[locale]/(workspace)/owner/account/page";
import StaffServicePage from "../apps/vendor/app/[locale]/(workspace)/staff/service/page";
import StaffAccountPage from "../apps/vendor/app/[locale]/(workspace)/staff/account/page";
import StaffVenuePage from "../apps/vendor/app/[locale]/(workspace)/staff/venue/page";
import nextConfig from "../apps/vendor/next.config";
import VendorApp, { resolveScreen } from "./vendor-app";
import * as screens from "./vendor-screens";
import AuthPage from "./auth-page";
import StaffInvitationPage from "./staff-invitation-page";
import type { Venue } from "../features/pocket/model";
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
  useSelectedLayoutSegments: vi.fn(),
}));

const appDir = path.resolve(__dirname, "../apps/vendor/app/[locale]");
const pageRoutes = (dir: string, prefix = ""): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    // Route groups such as (workspace) do not appear in the URL.
    const segment = /^\(.*\)$/.test(name) ? "" : `/${name}`;
    if (statSync(full).isDirectory()) return pageRoutes(full, `${prefix}${segment}`);
    return name === "page.tsx" ? [prefix || "/"] : [];
  });

it("serves the workspace screens of each role and the sign-in routes", () => {
  const owner = [
    "overview",
    "orders",
    "menu",
    "floor",
    "team",
    "analytics",
    "reviews",
    "venue",
    "payments",
    "subscription",
    "account",
  ];
  const staff = ["service", "menu", "floor", "staff-floor", "venue", "account"];
  expect(pageRoutes(appDir).sort()).toEqual(
    [
      "/",
      "/forgot-password",
      "/invite",
      "/login",
      "/register",
      "/reset-password",
      "/owner",
      ...owner.map((screen) => `/owner/${screen}`),
      "/staff",
      ...staff.map((screen) => `/staff/${screen}`),
    ].sort(),
  );
});

it("renders every workspace page inside the Vendor shell", () => {
  const layout = WorkspaceLayout({ children: "page" });
  expect(layout.type).toBe(VendorApp);
  expect(layout.props.children).toBe("page");
  expect(WorkspaceIndex).toBe(screens.WorkspaceIndexPage);
  expect(OwnerMenuPage).toBe(screens.MenuPage);
  expect(OwnerAccountPage).toBe(screens.AccountPage);
  expect(StaffServicePage).toBe(screens.ServicePage);
  expect(StaffAccountPage).toBe(screens.AccountPage);
  expect(StaffVenuePage).toBe(screens.StaffVenuePage);
});

it("opens the screen the account may use", () => {
  const venue = (access_role?: Venue["access_role"]) => ({ access_role }) as Venue;
  expect(resolveScreen("owner", undefined, venue("owner"))).toBe("overview");
  expect(resolveScreen("owner", "menu", venue("owner"))).toBe("menu");
  // Staff work on the service screen; the kitchen screen no longer exists.
  expect(resolveScreen("staff", undefined, venue("waiter"))).toBe("service");
  expect(resolveScreen("staff", "kitchen", venue("manager"))).toBe("service");
  expect(resolveScreen("staff", "staff-floor", venue("manager"))).toBe("service");
  expect(resolveScreen("staff", "account", venue("waiter"))).toBe("account");
  // Managers also run the menu, the floor plan and the venue settings (V-BE-02); waiters do not.
  expect(resolveScreen("staff", "menu", venue("manager"))).toBe("menu");
  expect(resolveScreen("staff", "floor", venue("manager"))).toBe("floor");
  expect(resolveScreen("staff", "venue", venue("manager"))).toBe("venue");
  expect(resolveScreen("staff", "menu", venue("waiter"))).toBe("service");
  expect(resolveScreen("staff", "floor", venue("waiter"))).toBe("service");
  expect(resolveScreen("staff", "venue", venue("waiter"))).toBe("service");
  expect(resolveScreen("staff", "menu", null)).toBe("service");
});

it("checks the locale, keeps sign-in addresses and redirects the old Ukrainian prefix", async () => {
  await expect(
    LocaleLayout({ children: null, params: Promise.resolve({ locale: "de" }) }),
  ).rejects.toThrow("not-found");
  const login = await LoginPage({ searchParams: Promise.resolve({ returnTo: "/ru/invite" }) });
  expect(login.type).toBe(AuthPage);
  expect(login.props).toMatchObject({ mode: "login", product: "vendor", returnTo: "/ru/invite" });
  const invite = await InvitePage({ searchParams: Promise.resolve({ token: "invite-token" }) });
  expect(invite.type).toBe(StaffInvitationPage);
  expect(invite.props).toMatchObject({ token: "invite-token" });
  expect(await nextConfig.redirects?.()).toEqual([
    { source: "/uk/:path*", destination: "/ua/:path*", permanent: false },
  ]);
});
