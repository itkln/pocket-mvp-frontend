"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthAPIError, getCurrentUser, logout, type AuthUser } from "../lib/auth-api";
import { customerNavigation, menuItems } from "../features/pocket/model";
import { Checkout, CustomerMenu, DiscoverScreen, HistoryScreen, ReservationScreen } from "../features/pocket/customer";
import { spotsCities, SpotsBottomNavigation, SpotsHeader } from "../features/pocket/customer/navigation";
import { SavedPlacesScreen } from "../features/pocket/customer/discover";
import { CalendarDays } from "lucide-react";
import { Button, PageHeader, TooltipContext } from "../features/pocket/ui";
import { GuestProfile, GuestSettings, GuestProfileDialog } from "../features/pocket/customer/profile";
import { useI18n } from "../features/pocket/i18n";
import { localeFromPathname, type Locale } from "../features/pocket/locales";
import { useAppShell } from "./use-app-shell";
import { categoryForRoute, spotCategories } from "../features/pocket/customer/categories";

const screens = [...spotCategories.map((item) => item.slug), ...customerNavigation.map((item) => item.id), "checkout", "saved", "reservations", "settings", "notifications"];
const screenForRoute = (screen?: string) => screen && screens.includes(screen) ? screen : "discover";
const spotsPath = (locale: Locale, screen: string) => `/${locale}/${screen}`;
const isPublicScreen = (screen: string) => screen === "discover" || screen === "browse-menu" || Boolean(categoryForRoute(screen));
type AccountDialogSection = "profile" | "security" | "notifications";
const isAccountDialogSection = (value: string | null): value is AccountDialogSection => value === "profile" || value === "security" || value === "notifications";

const migratedStorageValue = (key: string, legacyKey: string) => {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy === null) return null;
  localStorage.setItem(key, legacy);
  localStorage.removeItem(legacyKey);
  return legacy;
};

const initialCity = () => {
  if (typeof window === "undefined") return "";
  try {
    const savedCity = migratedStorageValue("pocket:spots-city", "pocket:eats-city");
    return savedCity && spotsCities.includes(savedCity) ? savedCity : "";
  } catch {
    return "";
  }
};

export default function SpotsApp({ initialScreen }: { initialScreen?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const shell = useAppShell();
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [screen, setScreen] = useState(screenForRoute(initialScreen));
  const [cart, setCart] = useState<Record<number, number>>({});
  const searchQuery = searchParams.get("q") ?? "";
  const category = categoryForRoute(screen);
  const filter = searchParams.get("filter") ?? "Все";
  const [accountDialogSection, setAccountDialogSection] = useState<AccountDialogSection | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<string[]>([]);

  const toggleSaved = (name: string) => {
    if (!currentUser) {
      router.push(`/${locale}/login`);
      return;
    }
    const next = savedPlaces.includes(name) ? savedPlaces.filter((place) => place !== name) : [...savedPlaces, name];
    setSavedPlaces(next);
    if (currentUser) {
      try { localStorage.setItem(`pocket:spots-saved:${currentUser.id}`, JSON.stringify(next)); } catch { /* Retain favorites for this session. */ }
    }
  };

  const [city, setCity] = useState(initialCity);

  useEffect(() => {
    let active = true;
    const nextScreen = screenForRoute(initialScreen);
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        const desktop = window.matchMedia("(min-width: 761px)").matches;
        const urlParams = new URLSearchParams(window.location.search);
        const settingsSection = urlParams.get("section");
        const directAccountSection: AccountDialogSection | null = !desktop ? null
          : nextScreen === "profile" ? "profile"
            : nextScreen === "notifications" ? "notifications"
              : nextScreen === "settings" ? settingsSection === "security" ? "security" : "profile"
                : null;
        const requestedAccountSection = desktop && isAccountDialogSection(urlParams.get("account")) ? urlParams.get("account") as AccountDialogSection : null;
        try {
          const stored: unknown = JSON.parse(migratedStorageValue(`pocket:spots-saved:${user.id}`, `pocket:eats-saved:${user.id}`) ?? "[]");
          setSavedPlaces(Array.isArray(stored) ? stored.filter((name): name is string => typeof name === "string") : []);
        } catch { /* Keep session favorites when storage is unavailable. */ }
        setCurrentUser(user);
        setScreen(directAccountSection ? "discover" : nextScreen);
        setAccountDialogSection(directAccountSection || requestedAccountSection);
        setAuthReady(true);
        if (initialScreen !== nextScreen || directAccountSection) {
          const routeLocale = localeFromPathname(window.location.pathname) ?? "ru";
          router.replace(`${spotsPath(routeLocale, directAccountSection ? "discover" : nextScreen)}${directAccountSection ? `?account=${directAccountSection}` : ""}`);
        }
      })
      .catch((error) => {
        if (!active) return;
        const routeLocale = localeFromPathname(window.location.pathname) ?? "ru";
        if (isPublicScreen(nextScreen)) {
          setCurrentUser(null);
          setScreen(nextScreen);
          setAuthReady(true);
          return;
        }
        router.replace(error instanceof AuthAPIError && error.status === 401 ? `/${routeLocale}/login` : `/${routeLocale}/login?error=unavailable`);
      });
    return () => { active = false; };
  }, [initialScreen, router]);

  const navigate = (next: string, params = new URLSearchParams()) => {
    if (!currentUser && !isPublicScreen(next)) {
      router.push(`/${locale}/login`);
      return;
    }
    setScreen(next);
    router.push(`${spotsPath(locale, next)}${params.size ? `?${params}` : ""}`);
    shell.setMobileNav(false);
    window.scrollTo(0, 0);
  };


  const updateSearch = (key: "q" | "filter", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "Все") params.set(key, value); else params.delete(key);
    if (screen !== "discover" && !category) {
      navigate("discover", new URLSearchParams(value ? { q: value } : {}));
      return;
    }
    // Next App Router syncs useSearchParams with the native History API.
    window.history.replaceState(null, "", `${spotsPath(locale, screen)}${params.size ? `?${params}` : ""}`);
  };
  const navigateCategory = (slug: string) => navigate(slug, new URLSearchParams(searchQuery ? { q: searchQuery } : {}));
  const editProfile = () => {
    if (window.matchMedia("(min-width: 761px)").matches) setAccountDialogSection("profile");
    else navigate("settings");
  };
  const openAccountSection = (section: AccountDialogSection) => {
    if (window.matchMedia("(min-width: 761px)").matches) {
      setAccountDialogSection(section);
      return;
    }
    if (section === "notifications") navigate("notifications");
    else navigate("settings", new URLSearchParams({ section }));
  };
  const closeAccountDialog = () => {
    setAccountDialogSection(null);
    const params = new URLSearchParams(window.location.search);
    if (!params.has("account")) return;
    params.delete("account");
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  };
  const source = searchParams.get("from");
  const sourceURL = source?.startsWith(`/${locale}/`) ? new URL(source, "http://pocket.local") : null;
  const sourceScreen = sourceURL?.pathname.split("/")[2];
  const validSource = sourceURL && (sourceScreen === "discover" || categoryForRoute(sourceScreen));
  const openVenue = () => {
    const from = `${spotsPath(locale, screen)}${searchParams.size ? `?${searchParams}` : ""}`;
    navigate("browse-menu", new URLSearchParams({ from }));
  };

  const signOut = async () => {
    try { await logout(); } finally {
      router.replace(`/${locale}/login`);
      router.refresh();
    }
  };

  const addItem = (id: number) => {
    if (!currentUser) {
      router.push(`/${locale}/login`);
      return;
    }
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));
    shell.notify("Добавлено в заказ");
  };

  const updateQty = (id: number, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const copy = { ...current };
      if (next === 0) delete copy[id]; else copy[id] = next;
      return copy;
    });
  };

  if (!authReady) return <main className="auth-loading" aria-live="polite">Проверяем сессию...</main>;

  const cartTotal = menuItems.reduce((sum, item) => sum + item.price * (cart[item.id] || 0), 0);

  return <div className={`pocket-spots ${currentUser ? "signed-in" : "guest"}`}>
    <SpotsHeader user={currentUser} screen={screen} city={city} onCityChange={(value) => {
      setCity(value);
      try { localStorage.setItem("pocket:spots-city", value); } catch { /* Keep the selection for this session. */ }
      navigate(category?.slug ?? "discover", category ? new URLSearchParams(searchParams.toString()) : new URLSearchParams());
    }} searchQuery={searchQuery} categoryLabel={category?.label} onClearCategory={() => navigateCategory("discover")} onSearch={(value) => updateSearch("q", value)} onNavigate={navigate} onLogin={() => router.push(`/${locale}/login`)} onLogout={signOut} onEditProfile={editProfile} onAccountSection={openAccountSection} />
    <TooltipContext.Provider value={false}><main className="spots-main">
      <div className={`spots-page ${category ? "has-category" : ""}`}>
        {(screen === "discover" || category) && <DiscoverScreen city={city} query={searchQuery} categorySlug={category?.slug} filter={filter} onCategoryChange={navigateCategory} onFilterChange={(value) => updateSearch("filter", value)} savedPlaces={savedPlaces} onToggleSaved={currentUser ? toggleSaved : undefined} onVenue={openVenue} onReservation={() => navigate("reservation")} />}
        {screen === "saved" && <SavedPlacesScreen savedPlaces={savedPlaces} onToggleSaved={toggleSaved} onVenue={() => navigate("browse-menu")} />}
        {screen === "reservations" && <section className="spots-reservations"><PageHeader title={t("Мои брони")} /><div className="spots-search-empty spots-reservations-empty"><CalendarDays size={28} /><strong>{t("Список броней пока недоступен")}</strong><Button onClick={() => navigate("reservation")}>{t("Забронировать стол")}</Button></div></section>}
        {screen === "browse-menu" && <>{validSource && <button type="button" className="back-link" onClick={() => navigate(sourceScreen!, sourceURL.searchParams)}><ArrowLeft size={18} />{t("Назад к результатам")}</button>}<CustomerMenu cart={cart} onAdd={addItem} onUpdateQty={updateQty} onCart={() => navigate("checkout")} onReserve={() => navigate("reservation")} /></>}
        {screen === "checkout" && <Checkout cart={cart} total={cartTotal} updateQty={updateQty} onBack={() => navigate("browse-menu")} onDone={() => { setCart({}); navigate("history"); shell.notify("Предзаказ принят"); }} />}
        {screen === "reservation" && <ReservationScreen onMenu={() => navigate("browse-menu")} notify={shell.notify} />}
        {screen === "history" && <HistoryScreen notify={shell.notify} />}
        {screen === "profile" && currentUser && <GuestProfile user={currentUser} onEditProfile={editProfile} onNavigate={navigate} onLogout={signOut} />}
        {["settings", "notifications"].includes(screen) && currentUser && <GuestSettings key={screen} notifications={screen === "notifications"} onEditProfile={editProfile} user={currentUser} onNavigate={navigate} notify={shell.notify} onLogout={signOut} onUpdate={setCurrentUser} />}
      </div>
    </main>{currentUser && <GuestProfileDialog open={Boolean(accountDialogSection)} section={accountDialogSection ?? "profile"} user={currentUser} notify={shell.notify} onUpdate={setCurrentUser} onClose={closeAccountDialog} />}</TooltipContext.Provider>
    {currentUser && <SpotsBottomNavigation screen={screen} onNavigate={navigate} />}
    {shell.toast && <div className="toast"><CheckCircle2 size={18} />{t(shell.toast)}</div>}
  </div>;
}
