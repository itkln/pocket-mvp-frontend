"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Store } from "lucide-react";
import { AuthAPIError, getCurrentUser, logout, type AuthUser } from "../lib/auth-api";
import { createOwnerVenue, listOwnerVenues, type VenueInput } from "../lib/owner-api";
import {
  type Role,
  type Venue,
  customerNavigation,
  menuItems,
  ownerNavigation,
  selectedVenueKey,
  sidebarCollapsedKey,
  staffNavigation,
} from "../features/pocket/model";
import { MobileBottomNavigation, Sidebar, Topbar } from "../features/pocket/navigation";
import {
  AccountScreen,
  AnalyticsScreen,
  MenuManager,
  OrdersScreen,
  OwnerOverview,
  PaymentsScreen,
  ReviewsScreen,
  SubscriptionScreen,
  TeamScreen,
  VenueScreen,
} from "../features/pocket/owner";
import { OwnerWorkspaceProvider } from "../features/pocket/owner/context";
import { Button } from "../features/pocket/ui";
import { FloorPlan } from "../features/pocket/floor-plan";
import {
  Checkout,
  CustomerMenu,
  DiscoverScreen,
  HistoryScreen,
  ProfileScreen,
  ReservationScreen,
} from "../features/pocket/customer";
import { KitchenScreen, ServiceBoard } from "../features/pocket/staff";
import { Modal, NewVenueModal } from "../features/pocket/dialogs";
import { useI18n } from "../features/pocket/i18n";
import { useLocalizedError } from "../features/pocket/error-message";
import { localeFromPathname, type Locale } from "../features/pocket/locales";

const defaultScreen: Record<Role, string> = { owner: "overview", customer: "discover", staff: "service" };
const roleScreens: Record<Role, string[]> = {
  owner: [...ownerNavigation.map((item) => item.id), "account"],
  customer: [...customerNavigation.map((item) => item.id), "checkout"],
  staff: [...staffNavigation.map((item) => item.id), "account"],
};
const screenForRole = (role: Role, screen?: string) => screen && roleScreens[role].includes(screen) ? screen : defaultScreen[role];
const appPath = (locale: Locale, role: Role, screen: string) => `/${locale}/${role}/${screen}`;

export default function PocketApp({ initialRole, initialScreen }: { initialRole?: Role; initialScreen?: string }) {
  const router = useRouter();
	const { locale, t } = useI18n();
	const errorMessage = useLocalizedError();
	const [authReady, setAuthReady] = useState(false);
	const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<Role>(initialRole ?? "customer");
  const [screen, setScreen] = useState(screenForRole(initialRole ?? "customer", initialScreen));
	const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
	const [venue, setVenue] = useState<Venue | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
	const [modal, setModal] = useState<"item" | "invite" | "order" | "venue" | null>(null);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarCollapsed(window.localStorage.getItem(sidebarCollapsedKey) === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

	useEffect(() => {
		let active = true;
		Promise.all([getCurrentUser(), listOwnerVenues()])
			.then(([user, venues]) => {
				if (!active) return;
				const selectedID = window.localStorage.getItem(selectedVenueKey(user.id));
				const startsAsOwner = venues.length > 0;
				const nextRole = initialRole === "staff" && !user.capabilities.includes("staff") ? (startsAsOwner ? "owner" : "customer") : initialRole ?? (startsAsOwner ? "owner" : "customer");
				const nextScreen = screenForRole(nextRole, initialScreen);
				setRole(nextRole);
				setScreen(nextScreen);
				setCurrentUser(user);
				setAvailableVenues(venues);
				setVenue(venues.find((item) => item.id === selectedID) ?? venues[0] ?? null);
				setAuthReady(true);
				if (initialRole !== nextRole || initialScreen !== nextScreen) {
					const routeLocale = localeFromPathname(window.location.pathname) ?? "ru";
					router.replace(appPath(routeLocale, nextRole, nextScreen));
				}
			})
			.catch((error) => {
				if (!active) return;
				const routeLocale = localeFromPathname(window.location.pathname) ?? "ru";
				if (error instanceof AuthAPIError && error.status === 401) router.replace(`/${routeLocale}/login`);
				else router.replace(`/${routeLocale}/login?error=unavailable`);
			});
		return () => { active = false; };
	}, [initialRole, initialScreen, router]);

	const signOut = async () => {
		try { await logout(); } finally {
			router.replace(`/${locale}/login`);
			router.refresh();
		}
	};

  const navigation = role === "owner" ? ownerNavigation : role === "customer" ? customerNavigation : staffNavigation;
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = menuItems.reduce((sum, item) => sum + item.price * (cart[item.id] || 0), 0);

  const changeRole = (next: Role) => {
    const nextScreen = defaultScreen[next];
    setRole(next);
    setScreen(nextScreen);
    router.push(appPath(locale, next, nextScreen));
    setMobileNav(false);
    window.scrollTo(0, 0);
  };

  const navigate = (next: string) => {
    setScreen(next);
    router.push(appPath(locale, role, next));
    setMobileNav(false);
    window.scrollTo(0, 0);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(sidebarCollapsedKey, String(next));
      return next;
    });
  };

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const addItem = (id: number) => {
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));
    notify("Добавлено в заказ");
  };

  const updateQty = (id: number, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const copy = { ...current };
      if (next === 0) delete copy[id]; else copy[id] = next;
      return copy;
    });
  };

	const createVenue = async (input: VenueInput) => {
		if (!currentUser) return;
		try {
			const newVenue = await createOwnerVenue(input);
			setAvailableVenues((current) => [...current, newVenue]);
			setCurrentUser((current) => current ? { ...current, capabilities: [...new Set([...current.capabilities, "owner" as const])] } : current);
			window.localStorage.setItem(selectedVenueKey(currentUser.id), newVenue.id);
			setVenue(newVenue);
			setRole("owner");
			setScreen("venue");
			router.push(appPath(locale, "owner", "venue"));
			setModal(null);
			setMobileNav(false);
			notify(`${newVenue.name} добавлено`);
		} catch (caught) {
			notify(errorMessage(caught, "Не удалось добавить заведение"));
			throw caught;
		}
	};

	const selectVenue = (nextVenue: Venue) => {
		if (!currentUser) return;
		setVenue(nextVenue);
		window.localStorage.setItem(selectedVenueKey(currentUser.id), nextVenue.id);
		notify(`Выбрано заведение ${nextVenue.name}`);
	};

	const updateVenueState = (updatedVenue: Venue) => {
		setVenue(updatedVenue);
		setAvailableVenues((current) => current.map((item) => item.id === updatedVenue.id ? updatedVenue : item));
	};

	if (!authReady || !currentUser) return <main className="auth-loading" aria-live="polite">Проверяем сессию...</main>;

  return (
    <OwnerWorkspaceProvider venueID={venue?.id} onError={notify}>
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
	  <Sidebar user={currentUser} role={role} screen={screen} navigation={navigation} venue={venue} venues={availableVenues} mobileNav={mobileNav} collapsed={sidebarCollapsed} onNavigate={navigate} onRole={changeRole} onVenue={selectVenue} onAddVenue={() => setModal("venue")} onClose={() => setMobileNav(false)} onToggleCollapsed={toggleSidebar} />
      <main className="main-shell">
        <Topbar role={role} screen={screen} navigation={navigation} venueName={venue?.name ?? "Мои заведения"} cartCount={cartCount} onMenu={() => setMobileNav(true)} onCart={() => navigate("checkout")} />
        <div className={`page-area ${role === "customer" ? "customer-area" : ""}`}>
          {role === "owner" && !venue && screen !== "account" && <section className="owner-onboarding"><span><Store size={28} /></span><h1>Добавьте первое заведение</h1><p>После создания откроются меню, команда, заказы и аналитика.</p><Button icon={Plus} onClick={() => setModal("venue")}>Добавить заведение</Button></section>}
          {role === "owner" && venue && screen === "overview" && <OwnerOverview ownerName={currentUser.first_name} onNavigate={navigate} />}
          {role === "owner" && venue && screen === "orders" && <OrdersScreen />}
          {role === "owner" && venue && screen === "menu" && <MenuManager venueName={venue.name} onAdd={() => setModal("item")} notify={notify} />}
          {role === "owner" && venue && screen === "team" && <TeamScreen onInvite={() => setModal("invite")} notify={notify} />}
          {role === "owner" && venue && screen === "analytics" && <AnalyticsScreen />}
          {role === "owner" && venue && screen === "reviews" && <ReviewsScreen notify={notify} />}
          {role === "owner" && venue && screen === "venue" && <VenueScreen key={venue.id} venue={venue} notify={notify} onUpdate={updateVenueState} />}
          {role === "owner" && venue && screen === "payments" && <PaymentsScreen />}
		  {role === "owner" && venue && screen === "subscription" && <SubscriptionScreen venueCount={availableVenues.length} notify={notify} />}

          {role === "customer" && screen === "discover" && <DiscoverScreen onVenue={() => navigate("browse-menu")} />}
          {role === "customer" && screen === "browse-menu" && <CustomerMenu cart={cart} onAdd={addItem} onCart={() => navigate("checkout")} />}
          {role === "customer" && screen === "checkout" && <Checkout cart={cart} total={cartTotal} updateQty={updateQty} onBack={() => navigate("browse-menu")} onDone={() => { setCart({}); navigate("history"); notify("Заказ #1049 принят"); }} />}
          {role === "customer" && screen === "reservation" && <ReservationScreen onMenu={() => navigate("browse-menu")} notify={notify} />}
          {role === "customer" && screen === "history" && <HistoryScreen notify={notify} />}
		  {role === "customer" && screen === "profile" && <ProfileScreen user={currentUser} notify={notify} onLogout={signOut} />}

          {role === "staff" && screen === "service" && <ServiceBoard notify={notify} />}
          {role === "staff" && screen === "kitchen" && <KitchenScreen notify={notify} />}
          {role === "staff" && venue && screen === "staff-floor" && <FloorPlan mode="staff" venueName={venue.name} notify={notify} />}
		  {role !== "customer" && screen === "account" && <AccountScreen user={currentUser} role={role} notify={notify} onLogout={signOut} />}
        </div>
      </main>
      <MobileBottomNavigation role={role} screen={screen} navigation={navigation} onNavigate={navigate} />
      {toast && <div className="toast"><CheckCircle2 size={18} />{t(toast)}</div>}
	  {modal === "venue" && <NewVenueModal onClose={() => setModal(null)} onCreate={createVenue} />}
		  {modal && modal !== "venue" && <Modal type={modal} currency={venue?.currency} onClose={() => setModal(null)} notify={(message) => { setModal(null); notify(message); }} />}
    </div>
    </OwnerWorkspaceProvider>
  );
}
