"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthAPIError, getCurrentUser, logout, type AuthUser } from "../lib/auth-api";
import {
  type Role,
  type Venue,
  customerNavigation,
  initialVenues,
  loadSavedVenues,
  menuItems,
  ownerNavigation,
  savedVenuesKey,
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

export default function PocketApp() {
  const router = useRouter();
	const [authReady, setAuthReady] = useState(false);
	const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<Role>("owner");
  const [screen, setScreen] = useState("overview");
	const [availableVenues, setAvailableVenues] = useState<Venue[]>(initialVenues);
	const [venue, setVenue] = useState(initialVenues[0]);
  const [cart, setCart] = useState<Record<number, number>>({ 1: 1, 3: 1 });
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
		getCurrentUser()
			.then((user) => {
				if (!active) return;
				const restoredVenues = loadSavedVenues(user.id);
				const selectedID = window.localStorage.getItem(selectedVenueKey(user.id));
				setRole(user.role === "venue_owner" ? "owner" : "customer");
				setScreen(user.role === "venue_owner" ? "overview" : "discover");
				setCurrentUser(user);
				setAvailableVenues(restoredVenues);
				setVenue(restoredVenues.find((item) => item.id === selectedID) ?? restoredVenues[0]);
				setAuthReady(true);
			})
			.catch((error) => {
				if (!active) return;
				if (error instanceof AuthAPIError && error.status === 401) router.replace("/login");
				else router.replace("/login?error=unavailable");
			});
		return () => { active = false; };
	}, [router]);

	const signOut = async () => {
		try { await logout(); } finally {
			router.replace("/login");
			router.refresh();
		}
	};

  const navigation = role === "owner" ? ownerNavigation : role === "customer" ? customerNavigation : staffNavigation;
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = menuItems.reduce((sum, item) => sum + item.price * (cart[item.id] || 0), 0);

  const changeRole = (next: Role) => {
    setRole(next);
    setScreen(next === "owner" ? "overview" : next === "customer" ? "discover" : "service");
    setMobileNav(false);
  };

  const navigate = (next: string) => {
    setScreen(next);
    setMobileNav(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(sidebarCollapsedKey, String(next));
      return next;
    });
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

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

	const createVenue = (newVenue: Venue) => {
		if (!currentUser) return;
		const userID = currentUser.id;
		setAvailableVenues((current) => {
			const next = [...current, newVenue];
			window.localStorage.setItem(savedVenuesKey(userID), JSON.stringify(next.slice(initialVenues.length)));
			return next;
		});
		window.localStorage.setItem(selectedVenueKey(userID), newVenue.id);
		setVenue(newVenue);
		setScreen("venue");
		setModal(null);
		setMobileNav(false);
		notify(`${newVenue.name} добавлено`);
	};

	const selectVenue = (nextVenue: Venue) => {
		if (!currentUser) return;
		setVenue(nextVenue);
		window.localStorage.setItem(selectedVenueKey(currentUser.id), nextVenue.id);
		notify(`Выбрано заведение ${nextVenue.name}`);
	};

	if (!authReady || !currentUser) return <main className="auth-loading" aria-live="polite">Проверяем сессию...</main>;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
	  <Sidebar user={currentUser} role={role} screen={screen} navigation={navigation} venue={venue} venues={availableVenues} mobileNav={mobileNav} collapsed={sidebarCollapsed} onNavigate={navigate} onRole={changeRole} onVenue={selectVenue} onAddVenue={() => setModal("venue")} onClose={() => setMobileNav(false)} onToggleCollapsed={toggleSidebar} />
      <main className="main-shell">
        <Topbar role={role} screen={screen} navigation={navigation} venueName={venue.name} cartCount={cartCount} onMenu={() => setMobileNav(true)} onCart={() => navigate("checkout")} />
        <div className={`page-area ${role === "customer" ? "customer-area" : ""}`}>
          {role === "owner" && screen === "overview" && <OwnerOverview ownerName={currentUser.first_name} onNavigate={navigate} onOrder={() => setModal("order")} />}
          {role === "owner" && screen === "orders" && <OrdersScreen onOrder={() => setModal("order")} />}
          {role === "owner" && screen === "menu" && <MenuManager venueName={venue.name} onAdd={() => setModal("item")} notify={notify} />}
          {role === "owner" && screen === "team" && <TeamScreen onInvite={() => setModal("invite")} notify={notify} />}
          {role === "owner" && screen === "analytics" && <AnalyticsScreen />}
          {role === "owner" && screen === "reviews" && <ReviewsScreen notify={notify} />}
          {role === "owner" && screen === "venue" && <VenueScreen key={venue.id} venue={venue} notify={notify} />}
          {role === "owner" && screen === "payments" && <PaymentsScreen notify={notify} />}
		  {role === "owner" && screen === "subscription" && <SubscriptionScreen venueCount={availableVenues.length} notify={notify} />}

          {role === "customer" && screen === "discover" && <DiscoverScreen onVenue={() => navigate("browse-menu")} />}
          {role === "customer" && screen === "browse-menu" && <CustomerMenu cart={cart} onAdd={addItem} onCart={() => navigate("checkout")} />}
          {role === "customer" && screen === "checkout" && <Checkout cart={cart} total={cartTotal} updateQty={updateQty} onBack={() => navigate("browse-menu")} onDone={() => { setCart({}); navigate("history"); notify("Заказ #1049 принят"); }} />}
          {role === "customer" && screen === "reservation" && <ReservationScreen onMenu={() => navigate("browse-menu")} notify={notify} />}
          {role === "customer" && screen === "history" && <HistoryScreen notify={notify} />}
		  {role === "customer" && screen === "profile" && <ProfileScreen user={currentUser} notify={notify} onLogout={signOut} />}

          {role === "staff" && screen === "service" && <ServiceBoard notify={notify} />}
          {role === "staff" && screen === "kitchen" && <KitchenScreen notify={notify} />}
          {role === "staff" && screen === "staff-floor" && <FloorPlan mode="staff" venueName={venue.name} notify={notify} />}
		  {role !== "customer" && screen === "account" && <AccountScreen user={currentUser} notify={notify} onLogout={signOut} />}
        </div>
      </main>
      <MobileBottomNavigation role={role} screen={screen} navigation={navigation} onNavigate={navigate} />
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
	  {modal === "venue" && <NewVenueModal onClose={() => setModal(null)} onCreate={createVenue} />}
	  {modal && modal !== "venue" && <Modal type={modal} onClose={() => setModal(null)} notify={(message) => { setModal(null); notify(message); }} />}
    </div>
  );
}
