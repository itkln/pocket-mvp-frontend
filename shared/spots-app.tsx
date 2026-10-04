"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthAPIError, getCurrentUser, logout, type AuthUser } from "../lib/auth-api";
import { customerNavigation } from "../features/pocket/model";
import { DiscoverScreen, HistoryScreen } from "../features/pocket/customer";
import { spotsCities, SpotsBottomNavigation, SpotsHeader } from "../features/pocket/customer/navigation";
import { SavedPlacesScreen } from "../features/pocket/customer/discover";
import { VenueDetailsScreen } from "../features/pocket/customer/venue-details";
import { MyReservationsScreen } from "../features/pocket/customer/my-reservations";
import type { PublicVenue } from "../lib/public-catalog-api";
import { addSavedVenue, listSavedVenueIDs, removeSavedVenue } from "../lib/saved-venues-api";
import { TooltipContext } from "../features/pocket/ui";
import { GuestProfile, GuestSettings, GuestProfileDialog } from "../features/pocket/customer/profile";
import { useI18n } from "../features/pocket/i18n";
import { localeFromPathname, type Locale } from "../features/pocket/locales";
import { useAppShell } from "./use-app-shell";
import { categoryForRoute, spotCategories } from "../features/pocket/customer/categories";

const screens = [...spotCategories.map((item) => item.slug), ...customerNavigation.filter((item) => !["browse-menu", "reservation"].includes(item.id)).map((item) => item.id), "saved", "reservations", "settings", "notifications", "venue"];
const screenForRoute = (screen?: string) => screen && screens.includes(screen) ? screen : "discover";
const spotsPath = (locale: Locale, screen: string) => `/${locale}/${screen}`;
const isPublicScreen = (screen: string) => screen === "discover" || screen === "venue" || Boolean(categoryForRoute(screen));
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

export default function SpotsApp({ initialScreen, initialVenueId }: { initialScreen?: string; initialVenueId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const shell = useAppShell();
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [screen, setScreen] = useState(screenForRoute(initialScreen));
  const searchQuery = searchParams.get("q") ?? "";
  const category = categoryForRoute(screen);
  const filter = searchParams.get("filter") ?? "Все";
  const [accountDialogSection, setAccountDialogSection] = useState<AccountDialogSection | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<string[]>([]);
	const [savedForUser, setSavedForUser] = useState("");
	const [savedErrorUser, setSavedErrorUser] = useState("");
	const [savedRetry, setSavedRetry] = useState(0);
	const pendingSaved = useRef(new Set<string>());
	const [selectedVenueID, setSelectedVenueID] = useState(initialVenueId ?? "");
	const savedReady = Boolean(currentUser && savedForUser === currentUser.id);
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screen !== "discover" || !authReady) return;
    const app = appRef.current;
    if (!app) return;
    let start: { x: number; y: number } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start || !touch || event.touches.length !== 1 || !event.cancelable) return;
      if (event.target instanceof Element && event.target.closest('dialog[open], [aria-modal="true"], input, textarea, select, [contenteditable="true"]')) return;
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      if (Math.abs(deltaY) < 6 || Math.abs(deltaY) <= Math.abs(deltaX)) return;
      const scrollRoot = document.scrollingElement ?? document.documentElement;
      const scrollTop = Math.max(0, scrollRoot.scrollTop, window.scrollY);
      const maxScroll = Math.max(0, scrollRoot.scrollHeight - window.innerHeight);
      if (maxScroll <= 1 || (deltaY > 0 && scrollTop <= 1) || (deltaY < 0 && scrollTop >= maxScroll - 1)) event.preventDefault();
    };
    app.addEventListener("touchstart", onTouchStart, { passive: true });
    app.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      app.removeEventListener("touchstart", onTouchStart);
      app.removeEventListener("touchmove", onTouchMove);
    };
  }, [authReady, screen]);

  const toggleSaved = async (id: string) => {
    if (!currentUser) {
      router.push(`/${locale}/login`);
      return;
    }
    if (!savedReady || pendingSaved.current.has(id)) return;
    pendingSaved.current.add(id);
    const wasSaved = savedPlaces.includes(id);
    setSavedPlaces((current) => wasSaved ? current.filter((value) => value !== id) : [id, ...current]);
    try {
      if (wasSaved) await removeSavedVenue(id);
      else await addSavedVenue(id);
    } catch {
      setSavedPlaces((current) => wasSaved ? [id, ...current] : current.filter((value) => value !== id));
      shell.notify("Не удалось обновить избранное");
    } finally {
      pendingSaved.current.delete(id);
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
        setCurrentUser(user);
        setSelectedVenueID(initialVenueId ?? "");
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
          setSavedPlaces([]);
          setSavedForUser("");
          setSelectedVenueID(initialVenueId ?? "");
          setScreen(nextScreen);
          setAuthReady(true);
          if (initialScreen !== nextScreen) router.replace(spotsPath(routeLocale, nextScreen));
          return;
        }
        router.replace(error instanceof AuthAPIError && error.status === 401 ? `/${routeLocale}/login` : `/${routeLocale}/login?error=unavailable`);
      });
    return () => { active = false; };
  }, [initialScreen, initialVenueId, router]);

  useEffect(() => {
    const userID = currentUser?.id;
    if (!userID) return;
    const controller = new AbortController();
    listSavedVenueIDs(controller.signal)
      .then((ids) => { if (!controller.signal.aborted) { setSavedPlaces(ids); setSavedForUser(userID); setSavedErrorUser(""); } })
      .catch(() => { if (!controller.signal.aborted) setSavedErrorUser(userID); });
    return () => controller.abort();
  }, [currentUser?.id, savedRetry]);

  const navigate = (next: string, params = new URLSearchParams()) => {
    const nextScreen = next.startsWith("venue/") ? "venue" : next;
    if (!currentUser && !isPublicScreen(nextScreen)) {
      router.push(`/${locale}/login`);
      return;
    }
    setScreen(nextScreen);
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
  const validSource = sourceURL && (sourceScreen === "discover" || sourceScreen === "saved" || sourceScreen === "reservations" || categoryForRoute(sourceScreen));
  const openVenue = (venue: Pick<PublicVenue, "id">) => {
    const sourceParams = new URLSearchParams(searchParams.toString());
    if (city) sourceParams.set("city", city);
    const from = `${spotsPath(locale, screen)}${sourceParams.size ? `?${sourceParams}` : ""}`;
    setSelectedVenueID(venue.id);
    navigate(`venue/${venue.id}`, new URLSearchParams({ from }));
  };
  const backToSource = () => {
    if (!validSource) return navigate("discover");
    const sourceCity = sourceURL.searchParams.get("city");
    if (sourceCity && spotsCities.includes(sourceCity)) {
      setCity(sourceCity);
      try { localStorage.setItem("pocket:spots-city", sourceCity); } catch { /* Keep the city for this session. */ }
    }
    const params = new URLSearchParams(sourceURL.searchParams);
    params.delete("city");
    navigate(sourceScreen!, params);
  };

  const signOut = async () => {
    try {
      await logout();
    } catch {
      shell.notify("Не удалось выйти из аккаунта");
      return;
    }
    setCurrentUser(null);
    setSavedPlaces([]);
    setSavedForUser("");
    setSavedErrorUser("");
    setAccountDialogSection(null);
    setSelectedVenueID("");
    setScreen("discover");
    shell.setMobileNav(false);
    router.replace(spotsPath(locale, "discover"));
    window.scrollTo(0, 0);
  };

  if (!authReady) return <main className="auth-loading" aria-live="polite">Проверяем сессию...</main>;

  return <div ref={appRef} className={`pocket-spots ${currentUser ? "signed-in" : "guest"} ${screen === "venue" ? "venue-detail-active" : ""}`}>
    <SpotsHeader user={currentUser} screen={screen} city={city} onCityChange={(value) => {
      setCity(value);
      try { localStorage.setItem("pocket:spots-city", value); } catch { /* Keep the selection for this session. */ }
      navigate(category?.slug ?? "discover", category ? new URLSearchParams(searchParams.toString()) : new URLSearchParams());
    }} searchQuery={searchQuery} categoryLabel={category?.label} onClearCategory={() => navigateCategory("discover")} onSearch={(value) => updateSearch("q", value)} onNavigate={navigate} onLogin={() => router.push(`/${locale}/login`)} onLogout={signOut} onEditProfile={editProfile} onAccountSection={openAccountSection} />
    <TooltipContext.Provider value={false}><main className="spots-main">
      <div className={`spots-page ${category ? "has-category" : ""}`}>
        {(screen === "discover" || category) && <DiscoverScreen city={city} query={searchQuery} categorySlug={category?.slug} filter={filter} onCategoryChange={navigateCategory} onFilterChange={(value) => updateSearch("filter", value)} savedPlaces={savedReady ? savedPlaces : []} onToggleSaved={currentUser && savedReady ? toggleSaved : undefined} onVenue={openVenue} />}
        {screen === "saved" && (savedReady ? <SavedPlacesScreen savedPlaces={savedPlaces} onToggleSaved={toggleSaved} onVenue={openVenue} /> : savedErrorUser === currentUser?.id ? <div className="spots-catalog-status" role="alert">Не удалось загрузить избранное <button type="button" className="button secondary" onClick={() => { setSavedErrorUser(""); setSavedRetry((value) => value + 1); }}>Повторить</button></div> : <div className="spots-catalog-status" role="status">Загружаем избранное...</div>)}
        {screen === "venue" && selectedVenueID && <VenueDetailsScreen key={selectedVenueID} venueID={selectedVenueID} saved={savedReady && savedPlaces.includes(selectedVenueID)} onToggleSaved={currentUser && savedReady ? toggleSaved : undefined} onBack={backToSource} user={currentUser} />}
        {screen === "reservations" && currentUser && <MyReservationsScreen key={currentUser.id} onVenue={(id) => openVenue({ id })} onDiscover={() => navigate("discover")} />}
        {screen === "history" && <HistoryScreen />}
        {screen === "profile" && currentUser && <GuestProfile user={currentUser} onEditProfile={editProfile} onNavigate={navigate} onLogout={signOut} />}
        {["settings", "notifications"].includes(screen) && currentUser && <GuestSettings key={screen} notifications={screen === "notifications"} onEditProfile={editProfile} user={currentUser} onNavigate={navigate} notify={shell.notify} onLogout={signOut} onUpdate={setCurrentUser} />}
      </div>
    </main>{currentUser && <GuestProfileDialog open={Boolean(accountDialogSection)} section={accountDialogSection ?? "profile"} user={currentUser} notify={shell.notify} onUpdate={setCurrentUser} onClose={closeAccountDialog} />}</TooltipContext.Provider>
    {currentUser && <SpotsBottomNavigation screen={screen} onNavigate={navigate} />}
    {shell.toast && <div className="toast"><CheckCircle2 size={18} />{t(shell.toast)}</div>}
  </div>;
}
