"use client";
import Image from "next/image";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams, useSelectedLayoutSegment } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { getCurrentUser, logout, type AuthUser } from "../lib/auth-api";
import { dishAuthPath } from "../lib/dish-auth-navigation";
import { DishCatalogHeader } from "../features/pocket/customer/catalog-header";
import { GuestProfileDialog } from "../features/pocket/customer/profile";
import { useI18n } from "../features/pocket/i18n";
import { VenueMenuSettings } from "../features/pocket/customer/venue-menu-settings";
import { useMenuView } from "../features/pocket/customer/menu-view";
import { DishNavigationContext } from "../features/pocket/customer/dish-navigation";
import { TooltipContext } from "../features/pocket/ui";
import { DishShellContext } from "./dish-shell-context";

const publicScreens = ["menu", "table", "table-home", "table-bill", "reservation"];

// Which screen the URL opens: the route segment under /r/[venueID] or /qr/[token].
export function dishScreen(segment: string | null, table: boolean) {
  if (!table) return segment ?? "menu";
  if (segment === null) return "table-home";
  if (segment === "menu") return "table";
  if (segment === "bill") return "table-bill";
  return segment;
}

// Layout shell shared by every page of a restaurant link (/r/[venueID]) or table QR (/qr/[token]).
export default function DishApp({
  venueID,
  qrToken,
  children,
}: {
  venueID?: string;
  qrToken?: string;
  children?: ReactNode;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams(),
    segment = useSelectedLayoutSegment();
  const screen = dishScreen(segment, Boolean(qrToken));
  const { locale, t } = useI18n();
  const [menuView, setMenuView] = useMenuView();
  const [settingsPage, setSettingsPage] = useState<"menu" | "language" | null>(null);
  const closeSettings = useCallback(() => setSettingsPage(null), [setSettingsPage]);
  const [user, setUser] = useState<AuthUser | null>(null),
    [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [section, setSection] = useState<"profile" | "security" | "notifications" | null>(null);
  const [menuQuery, setMenuQuery] = useState(params.get("q") ?? "");
  const basePath = `/${locale}/${qrToken ? `qr/${encodeURIComponent(qrToken)}` : `r/${encodeURIComponent(venueID ?? "")}`}`;
  const publicScreen = publicScreens.includes(screen);
  // The layout stays mounted between its pages; per-page state starts over on each navigation.
  const [routeKey, setRouteKey] = useState(pathname);
  if (routeKey !== pathname) {
    setRouteKey(pathname);
    setMenuQuery(params.get("q") ?? "");
    setSettingsPage(null);
    setSection(null);
    setSigningOut(false);
  }
  const notify = useCallback((message: string) => setToast(message), [setToast]);
  const navigate = (screen: string) => {
    if (screen === "discover" || screen === "saved") screen = "";
    router.push(`${basePath}${screen ? `/${screen}` : ""}`);
  };
  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((value) => {
        if (active) {
          setUser(value);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready && !user && !publicScreen && !signingOut)
      router.replace(dishAuthPath(locale, "login", `${pathname}${window.location.search}`));
  }, [ready, user, publicScreen, signingOut, router, locale, pathname]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      setUser(null);
      setSection(null);
      router.push(basePath);
    } catch {
      setSigningOut(false);
      notify(t("Не удалось выйти из аккаунта"));
    }
  };
  const tableEntry = screen === "table-home" || screen === "table-bill";
  const venueScreen = screen === "menu" || screen === "table" || screen === "reservation";
  const edit = () => {
    if (window.matchMedia("(min-width: 761px)").matches) setSection("profile");
    else navigate("settings");
  };
  if (!ready && !publicScreen)
    return <main className="auth-loading">{t("Проверяем сессию...")}</main>;
  return (
    <DishNavigationContext.Provider value={{ basePath, onLogout: signOut }}>
      <DishShellContext.Provider
        value={{
          venueID,
          qrToken,
          basePath,
          user,
          setUser,
          notify,
          menuQuery,
          navigate,
          signOut,
          editProfile: edit,
          openSettings: setSettingsPage,
        }}
      >
        <div
          className={`pocket-dish ${user ? "signed-in" : "guest"} ${tableEntry ? "dish-table-entry-active" : ""} ${venueScreen ? "venue-detail-active" : "dish-account-active"}`}
        >
          {!tableEntry && (
            <DishCatalogHeader
              user={user}
              screen={screen}
              searchQuery={menuQuery}
              onSearch={setMenuQuery}
              searchAutoFocus={params.get("search") === "1"}
              onNavigate={navigate}
              onLogin={() =>
                router.push(
                  dishAuthPath(
                    locale,
                    "login",
                    `${pathname}${window.location.search}${window.location.hash}`,
                  ),
                )
              }
              onLogout={signOut}
              onAccountSection={setSection}
            />
          )}
          {!tableEntry && (
            <header
              aria-label={t("Мобильная навигация")}
              className={`dish-header ${venueScreen ? "dish-header-venue" : ""}`}
            >
              <div className="dish-header-leading">
                <button
                  type="button"
                  className="dish-icon-button"
                  aria-label={t("Настройки меню")}
                  aria-haspopup="dialog"
                  aria-expanded={settingsPage !== null}
                  onClick={() => setSettingsPage("menu")}
                >
                  <Menu size={23} />
                </button>
                <button type="button" className="dish-brand" onClick={() => navigate("")}>
                  <Image src="/logo.svg" width={28} height={28} alt="" />
                  <strong>Pocket Dish</strong>
                </button>
              </div>
              {venueScreen && (
                <label className="dish-menu-search">
                  <Search size={21} aria-hidden="true" />
                  <input
                    autoFocus={params.get("search") === "1"}
                    type="search"
                    aria-label={t("Поиск по меню")}
                    placeholder={t("Поиск по меню")}
                    value={menuQuery}
                    onChange={(e) => setMenuQuery(e.target.value)}
                  />
                </label>
              )}
            </header>
          )}
          {settingsPage && (
            <VenueMenuSettings
              initialPage={settingsPage}
              view={menuView}
              onViewChange={setMenuView}
              user={user}
              onClose={closeSettings}
            />
          )}
          <TooltipContext.Provider value={false}>
            <main className="dish-main">
              <div className="dish-page">{children}</div>
            </main>
            {user && (
              <GuestProfileDialog
                open={!!section}
                section={section ?? "profile"}
                user={user}
                notify={notify}
                onUpdate={setUser}
                onClose={() => setSection(null)}
              />
            )}
          </TooltipContext.Provider>
          {toast && (
            <div className="toast" role="status">
              {t(toast)}
            </div>
          )}
        </div>
      </DishShellContext.Provider>
    </DishNavigationContext.Provider>
  );
}
