"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckCircle2, Plus, Store, X } from "lucide-react";
import { AuthAPIError, getCurrentUser, logout, type AuthUser } from "../lib/auth-api";
import {
  createOwnerVenue,
  deleteOwnerVenue,
  listOwnerVenues,
  listStaffVenues,
  type VenueInput,
} from "../lib/owner-api";
import {
  ownerNavigation,
  selectedVenueKey,
  staffNavigation,
  type Role,
  type Venue,
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
import { KitchenScreen, ServiceBoard } from "../features/pocket/staff";
import { FloorPlan } from "../features/pocket/floor-plan";
import { Modal, NewVenueModal } from "../features/pocket/dialogs";
import { Button } from "../features/pocket/ui";
import { useI18n } from "../features/pocket/i18n";
import { useLocalizedError } from "../features/pocket/error-message";
import { localeFromPathname, type Locale } from "../features/pocket/locales";
import { useAppShell } from "./use-app-shell";

type VendorRole = Extract<Role, "owner" | "staff">;

const defaultScreen: Record<VendorRole, string> = { owner: "overview", staff: "service" };
const roleScreens: Record<VendorRole, string[]> = {
  owner: [...ownerNavigation.map((item) => item.id), "account"],
  staff: [...staffNavigation.map((item) => item.id), "account"],
};
const screenForRole = (role: VendorRole, screen?: string) =>
  screen && roleScreens[role].includes(screen) ? screen : defaultScreen[role];
const vendorPath = (locale: Locale, role: VendorRole, screen: string) =>
  `/${locale}/${role}/${screen}`;

export default function VendorApp({
  initialRole = "owner",
  initialScreen,
}: {
  initialRole?: VendorRole;
  initialScreen?: string;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const errorMessage = useLocalizedError();
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<VendorRole>(initialRole);
  const [screen, setScreen] = useState(screenForRole(initialRole, initialScreen));
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const shell = useAppShell(`${currentUser?.id}:${venue?.id}:${role}`);
  const [orderRequest, setOrderRequest] = useState<{ id: string; scope: string }>();
  const scope = `${role}:${venue?.id}`;
  const request = orderRequest?.scope === scope ? orderRequest : undefined;
  const [modal, setModal] = useState<"item" | "invite" | "order" | "venue" | null>(null);

  useEffect(() => {
    let active = true;
    setAuthReady(false);
    getCurrentUser()
      .then(async (user) => {
        const isStaff = user.capabilities.includes("staff");
        const nextRole: VendorRole =
          (initialRole === "staff" && (isStaff || user.capabilities.includes("owner"))) ||
          (isStaff && !user.capabilities.includes("owner"))
            ? "staff"
            : "owner";
        const venues = await (nextRole === "staff" ? listStaffVenues() : listOwnerVenues());
        return { user, venues, nextRole };
      })
      .then(({ user, venues, nextRole }) => {
        if (!active) return;
        const selectedID = window.localStorage.getItem(selectedVenueKey(user.id));
        const selectedVenue = venues.find((item) => item.id === selectedID) ?? venues[0] ?? null;
        const staffScreen = selectedVenue?.access_role === "kitchen" ? "kitchen" : "service";
        const canUseBoth = ["owner", "manager"].includes(selectedVenue?.access_role ?? "");
        const nextScreen =
          nextRole === "staff" && initialScreen !== "account"
            ? canUseBoth && ["service", "kitchen"].includes(initialScreen ?? "")
              ? initialScreen!
              : staffScreen
            : screenForRole(nextRole, initialScreen);
        setRole(nextRole);
        setScreen(nextScreen);
        setCurrentUser(user);
        setAvailableVenues(venues);
        setVenue(selectedVenue);
        setAuthReady(true);
        if (initialRole !== nextRole || initialScreen !== nextScreen) {
          const routeLocale = localeFromPathname(window.location.pathname) ?? "ru";
          router.replace(vendorPath(routeLocale, nextRole, nextScreen));
        }
      })
      .catch((error) => {
        if (!active) return;
        const routeLocale = localeFromPathname(window.location.pathname) ?? "ru";
        router.replace(
          error instanceof AuthAPIError && error.status === 401
            ? `/${routeLocale}/login`
            : `/${routeLocale}/login?error=unavailable`,
        );
      });
    return () => {
      active = false;
    };
  }, [initialRole, initialScreen, router]);

  const signOut = async () => {
    try {
      await logout();
    } finally {
      router.replace(`/${locale}/login`);
      router.refresh();
    }
  };

  const changeRole = (next: Role) => {
    if (next === "customer") return;
    const nextScreen = defaultScreen[next];
    setRole(next);
    setScreen(nextScreen);
    router.push(vendorPath(locale, next, nextScreen));
    shell.setMobileNav(false);
    window.scrollTo(0, 0);
  };

  const navigate = (next: string) => {
    setOrderRequest(undefined);
    setScreen(next);
    router.push(vendorPath(locale, role, next));
    shell.setMobileNav(false);
    window.scrollTo(0, 0);
  };

  const createVenue = async (input: VenueInput) => {
    if (!currentUser) return;
    try {
      const newVenue = await createOwnerVenue(input);
      setAvailableVenues((current) => [...current, newVenue]);
      setCurrentUser((current) =>
        current
          ? { ...current, capabilities: [...new Set([...current.capabilities, "owner" as const])] }
          : current,
      );
      window.localStorage.setItem(selectedVenueKey(currentUser.id), newVenue.id);
      setVenue(newVenue);
      setRole("owner");
      setScreen("venue");
      router.push(vendorPath(locale, "owner", "venue"));
      setModal(null);
      shell.setMobileNav(false);
      shell.notify(`${newVenue.name} добавлено`);
    } catch (caught) {
      shell.notify(errorMessage(caught, "Не удалось добавить заведение"));
      throw caught;
    }
  };

  const selectVenue = (nextVenue: Venue) => {
    if (!currentUser) return;
    setVenue(nextVenue);
    if (role === "staff") {
      const nextScreen = nextVenue.access_role === "kitchen" ? "kitchen" : "service";
      setScreen(nextScreen);
      router.push(vendorPath(locale, role, nextScreen));
    }
    window.localStorage.setItem(selectedVenueKey(currentUser.id), nextVenue.id);
    shell.notify(`Выбрано заведение ${nextVenue.name}`);
  };

  const updateVenueState = (updatedVenue: Venue) => {
    setVenue(updatedVenue);
    setAvailableVenues((current) =>
      current.map((item) => (item.id === updatedVenue.id ? updatedVenue : item)),
    );
  };

  const removeCurrentVenue = async () => {
    if (!currentUser || !venue) return;
    await deleteOwnerVenue(venue.id);
    const remainingVenues = availableVenues.filter((item) => item.id !== venue.id);
    const nextVenue = remainingVenues[0] ?? null;
    setAvailableVenues(remainingVenues);
    setVenue(nextVenue);
    if (nextVenue) window.localStorage.setItem(selectedVenueKey(currentUser.id), nextVenue.id);
    else window.localStorage.removeItem(selectedVenueKey(currentUser.id));
    setScreen("overview");
    router.push(vendorPath(locale, "owner", "overview"));
    shell.notify("Заведение удалено");
  };

  if (!authReady || !currentUser)
    return (
      <main className="auth-loading" aria-live="polite">
        Проверяем сессию...
      </main>
    );

  const navigation =
    role === "owner"
      ? ownerNavigation
      : staffNavigation.filter((item) =>
          ["owner", "manager"].includes(venue?.access_role ?? "")
            ? ["service", "kitchen"].includes(item.id)
            : item.id === (venue?.access_role === "kitchen" ? "kitchen" : "service"),
        );
  const availableRoles: Role[] = currentUser.capabilities.includes("owner")
    ? ["owner", "staff"]
    : currentUser.capabilities.includes("staff")
      ? ["staff"]
      : ["owner"];

  const openOrder = (id: string) => {
    const target =
      role === "owner"
        ? "orders"
        : screen === "kitchen" || venue?.access_role === "kitchen"
          ? "kitchen"
          : "service";
    if (target !== screen) navigate(target);
    setOrderRequest({ id, scope });
  };
  const banner = shell.orderBanner;

  return (
    <OwnerWorkspaceProvider
      key={`${currentUser.id}:${scope}`}
      readScope={`${currentUser.id}:${venue?.id}`}
      venueTimezone={venue?.timezone}
      ordersOnly={role === "staff"}
      venueID={venue?.id}
      onError={shell.notify}
      onArrivals={shell.notifyOrders}
    >
      <div
        data-screen={
          role === "staff" && ["service", "kitchen"].includes(screen) ? "orders" : screen
        }
        className={`app-shell vendor-shell ${shell.sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        <Sidebar
          user={currentUser}
          role={role}
          availableRoles={availableRoles}
          brand="Pocket Vendor"
          screen={screen}
          navigation={navigation}
          venue={venue}
          venues={availableVenues}
          mobileNav={shell.mobileNav}
          collapsed={shell.sidebarCollapsed}
          onNavigate={navigate}
          onRole={changeRole}
          onVenue={selectVenue}
          onAddVenue={() => setModal("venue")}
          onClose={() => shell.setMobileNav(false)}
          onToggleCollapsed={shell.toggleSidebar}
        />
        <main className="main-shell">
          <Topbar
            role={role}
            screen={screen}
            navigation={navigation}
            venueName={venue?.name ?? "Мои заведения"}
            cartCount={0}
            notifications={shell.notifications}
            onOpenOrder={openOrder}
            onMenu={() => shell.setMobileNav(true)}
            onCart={() => undefined}
            onNavigate={navigate}
            onNotificationsRead={shell.markNotificationsRead}
            onNotificationsClear={shell.clearNotifications}
          />
          <div className="page-area">
            {role === "staff" && !venue && screen !== "account" && (
              <p role="status">{t("Нет доступных заведений")}</p>
            )}
            {role === "owner" && !venue && screen !== "account" && (
              <section className="owner-onboarding">
                <span>
                  <Store size={28} />
                </span>
                <h1>Добавьте первое заведение</h1>
                <p>После создания откроются меню, команда, заказы и аналитика.</p>
                <Button icon={Plus} onClick={() => setModal("venue")}>
                  Добавить заведение
                </Button>
              </section>
            )}
            {role === "owner" && venue && screen === "overview" && (
              <OwnerOverview ownerName={currentUser.first_name} onNavigate={navigate} />
            )}
            {role === "owner" && venue && screen === "orders" && <OrdersScreen request={request} />}
            {role === "owner" && venue && screen === "menu" && (
              <MenuManager
                key={venue.id}
                venueName={venue.name}
                venue={venue}
                onVenueUpdate={updateVenueState}
                notify={shell.notify}
              />
            )}
            {role === "owner" && venue && screen === "team" && (
              <TeamScreen onInvite={() => setModal("invite")} notify={shell.notify} />
            )}
            {role === "owner" && venue && screen === "analytics" && <AnalyticsScreen />}
            {role === "owner" && venue && screen === "reviews" && (
              <ReviewsScreen notify={shell.notify} />
            )}
            {role === "owner" && venue && screen === "venue" && (
              <VenueScreen
                key={venue.id}
                venue={venue}
                notify={shell.notify}
                onUpdate={updateVenueState}
                onDelete={removeCurrentVenue}
              />
            )}
            {role === "owner" && venue && screen === "payments" && <PaymentsScreen />}
            {role === "owner" && venue && screen === "subscription" && (
              <SubscriptionScreen venueCount={availableVenues.length} notify={shell.notify} />
            )}
            {role === "staff" && venue && screen === "service" && (
              <ServiceBoard request={request} />
            )}
            {role === "staff" && venue && screen === "kitchen" && (
              <KitchenScreen request={request} />
            )}
            {role === "staff" && venue && screen === "staff-floor" && (
              <FloorPlan mode="staff" venueName={venue.name} notify={shell.notify} />
            )}
            {screen === "account" && (
              <AccountScreen
                user={currentUser}
                notify={shell.notify}
                onLogout={signOut}
                onUpdate={setCurrentUser}
              />
            )}
          </div>
        </main>
        <MobileBottomNavigation
          role={role}
          screen={screen}
          navigation={navigation}
          onNavigate={navigate}
        />
        {banner?.orderID && (
          <aside className="vendor-order-banner" key={banner.id}>
            <button
              type="button"
              className="vendor-order-banner-body"
              onClick={() => {
                shell.dismissOrderBanner(banner.id);
                openOrder(banner.orderID!);
              }}
            >
              <BellRing size={23} aria-hidden="true" />
              <span role="status">
                <strong>
                  {t(banner.message)} № {banner.orderNumber}
                </strong>
                {banner.source && <small>{t(banner.source)}</small>}
              </span>
            </button>
            <button
              type="button"
              className="vendor-order-banner-close"
              aria-label={t("Закрыть")}
              onClick={() => shell.dismissOrderBanner(banner.id)}
            >
              <X size={18} />
            </button>
          </aside>
        )}
        {shell.toast && (
          <div className="toast">
            <CheckCircle2 size={18} />
            {t(shell.toast)}
          </div>
        )}
        {modal === "venue" && (
          <NewVenueModal onClose={() => setModal(null)} onCreate={createVenue} />
        )}
        {modal && modal !== "venue" && (
          <Modal
            type={modal}
            currency={venue?.currency}
            onClose={() => setModal(null)}
            notify={(message) => {
              setModal(null);
              shell.notify(message);
            }}
          />
        )}
      </div>
    </OwnerWorkspaceProvider>
  );
}
