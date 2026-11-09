"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Menu, Search } from "lucide-react";
import { getCurrentUser, logout, type AuthUser } from "../lib/auth-api";
import { spotsAuthPath } from "../lib/spots-auth-navigation";
import { SpotsHeader } from "../features/pocket/customer/navigation";
import { VenueDetailsScreen } from "../features/pocket/customer/venue-details";
import { TableEntry } from "../features/pocket/customer/table-entry";
import { TableVenueScreen } from "../features/pocket/customer/table-venue";
import { MyReservationsScreen } from "../features/pocket/customer/my-reservations";
import { GuestSettings, GuestProfileDialog } from "../features/pocket/customer/profile";
import { useI18n } from "../features/pocket/i18n";
import { VenueMenuSettings } from "../features/pocket/customer/venue-menu-settings";
import { useMenuView } from "../features/pocket/customer/menu-view";
import { DishNavigationContext } from "../features/pocket/customer/dish-navigation";
import { DishAccountMenu } from "../features/pocket/customer/dish-account-menu";
import { TooltipContext } from "../features/pocket/ui";

export default function DishApp({
  initialScreen = "menu",
  venueID,
  qrToken,
}: {
  initialScreen?: string;
  venueID?: string;
  qrToken?: string;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const { locale, t } = useI18n();
  const [menuView, setMenuView] = useMenuView();
  const [settingsPage, setSettingsPage] = useState<"menu" | "language" | null>(null);
  const closeSettings = useCallback(() => setSettingsPage(null), []);
  const [user, setUser] = useState<AuthUser | null>(null),
    [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [section, setSection] = useState<"profile" | "security" | "notifications" | null>(null);
  const [menuQuery, setMenuQuery] = useState(params.get("q") ?? "");
  const basePath = `/${locale}/${qrToken ? `qr/${encodeURIComponent(qrToken)}` : `r/${encodeURIComponent(venueID ?? "")}`}`;
  const publicScreen = ["menu", "table", "table-home", "table-bill", "reservation"].includes(
    initialScreen,
  );
  const notify = useCallback((message: string) => setToast(message), []);
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
      router.replace(spotsAuthPath(locale, "login", `${pathname}${window.location.search}`));
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
  const tableEntry = initialScreen === "table-home" || initialScreen === "table-bill";
  const venueScreen =
    initialScreen === "menu" || initialScreen === "table" || initialScreen === "reservation";
  const settingsSection =
    params.get("section") === "security"
      ? "security"
      : params.get("section") === "profile"
        ? "profile"
        : undefined;
  const edit = () => {
    if (window.matchMedia("(min-width: 761px)").matches) setSection("profile");
    else navigate("settings");
  };
  if (!ready && !publicScreen)
    return <main className="auth-loading">{t("Проверяем сессию...")}</main>;
  return (
    <DishNavigationContext.Provider value={{ basePath, onLogout: signOut }}>
      <div
        className={`pocket-dish pocket-dish ${user ? "signed-in" : "guest"} ${tableEntry ? "dish-table-entry-active" : ""} ${venueScreen ? "venue-detail-active" : "dish-account-active"}`}
      >
        {!tableEntry && (
          <SpotsHeader
            variant="dish"
            user={user}
            screen={initialScreen}
            city=""
            onCityChange={() => {}}
            searchQuery={menuQuery}
            onSearch={setMenuQuery}
            searchAutoFocus={params.get("search") === "1"}
            onNavigate={navigate}
            onLogin={() =>
              router.push(
                spotsAuthPath(
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
            aria-label="Мобильная навигация"
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
            <div className="dish-page">
              {(initialScreen === "menu" || initialScreen === "reservation") && venueID && (
                <VenueDetailsScreen
                  standalone
                  menuPage={initialScreen === "menu"}
                  initialCategoryID={params.get("category") ?? undefined}
                  initialSearchOpen={params.get("search") === "1"}
                  reservationPage={initialScreen === "reservation"}
                  onReserve={() => navigate("reservation")}
                  saved={false}
                  key={`${venueID}-${initialScreen}`}
                  venueID={venueID}
                  onBack={() => navigate("")}
                  user={user}
                  desktopMenuQuery={menuQuery}
                />
              )}
              {tableEntry && qrToken && (
                <TableEntry
                  key={qrToken}
                  token={qrToken}
                  basePath={basePath}
                  billPage={initialScreen === "table-bill"}
                  onSettings={setSettingsPage}
                />
              )}
              {initialScreen === "table" && qrToken && (
                <TableVenueScreen
                  key={qrToken}
                  user={user}
                  token={qrToken}
                  onBack={() => navigate("")}
                  notify={notify}
                  desktopMenuQuery={menuQuery}
                />
              )}
              {initialScreen === "reservations" && user && (
                <section className="dish-reservations-page">
                  <div className="dish-account-heading">
                    <button
                      type="button"
                      className="dish-back-button"
                      aria-label={t("Назад")}
                      onClick={() => navigate("profile")}
                    >
                      <ArrowLeft size={26} />
                    </button>
                    <h1>{t("Мои брони")}</h1>
                    <span />
                  </div>
                  <MyReservationsScreen
                    directOnly
                    onVenue={(id) => router.push(`/${locale}/r/${id}`)}
                    onDiscover={() => navigate("")}
                  />
                </section>
              )}
              {(initialScreen === "profile" ||
                (initialScreen === "settings" && !settingsSection)) &&
                user && (
                  <section className="dish-account-page" aria-label={t("Профиль")}>
                    <div className="dish-mobile-menu-heading">
                      <button
                        type="button"
                        className="dish-back-button"
                        aria-label={t("Назад")}
                        onClick={() => navigate("")}
                      >
                        <ArrowLeft size={26} />
                      </button>
                      <h2>
                        <span className="dish-menu-brand">
                          <Image src="/logo.svg" width={30} height={30} alt="" />
                          Pocket Dish
                        </span>
                      </h2>
                      <span />
                    </div>
                    <DishAccountMenu
                      user={user}
                      onNavigate={navigate}
                      onLogin={() => {}}
                      onLogout={signOut}
                    />
                  </section>
                )}
              {((initialScreen === "settings" && settingsSection) ||
                initialScreen === "notifications") &&
                user && (
                  <GuestSettings
                    key={`${initialScreen}-${settingsSection}`}
                    initialSection={settingsSection}
                    onBack={() => navigate("profile")}
                    user={user}
                    onNavigate={navigate}
                    onLogout={signOut}
                    onEditProfile={edit}
                    onUpdate={setUser}
                    notify={notify}
                    notifications={initialScreen === "notifications"}
                  />
                )}
            </div>
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
            {toast}
          </div>
        )}
      </div>
    </DishNavigationContext.Provider>
  );
}
