"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import { BellRing, CheckCircle2, Plus, Store, X } from "lucide-react";
import { AuthAPIError, getCurrentUser, logout, type AuthUser } from "../lib/auth-api";
import {
  createOwnerVenue,
  deleteOwnerVenue,
  listStaffVenues,
  type VenueInput,
} from "../lib/owner-api";
import {
  canManageVenueSpace,
  managerScreens,
  ownerNavigation,
  roleForVenue,
  selectedVenueKey,
  staffNavigation,
  type Venue,
} from "../features/pocket/model";
import { MobileBottomNavigation, Sidebar, Topbar } from "../features/pocket/navigation";
import { OwnerWorkspaceProvider, useOwnerWorkspace } from "../features/pocket/owner/context";
import { Modal, NewVenueModal } from "../features/pocket/dialogs";
import { Button } from "../features/pocket/ui";
import { useI18n } from "../features/pocket/i18n";
import { useLocalizedError } from "../features/pocket/error-message";
import { localeFromPathname, type Locale } from "../features/pocket/locales";
import { useAppShell } from "./use-app-shell";
import { VendorShellContext, type VendorModal, type VendorRole } from "./vendor-shell-context";

const defaultScreen: Record<VendorRole, string> = { owner: "overview", staff: "service" };
const roleScreens: Record<VendorRole, string[]> = {
  owner: [...ownerNavigation.map((item) => item.id), "account"],
  staff: [...staffNavigation.map((item) => item.id), "account"],
};
const screenForRole = (role: VendorRole, screen?: string) =>
  screen && roleScreens[role].includes(screen) ? screen : defaultScreen[role];
const vendorPath = (locale: Locale, role: VendorRole, screen: string) =>
  `/${locale}/${role}/${screen}`;

// The screen an account opens for a URL. Staff work on the service screen: waiters take every
// order there and pass it to the kitchen outside Pocket; managers also run the menu and the floor.
export function resolveScreen(
  role: VendorRole,
  routeScreen: string | undefined,
  venue: Venue | null,
) {
  if (role !== "staff" || routeScreen === "account") return screenForRole(role, routeScreen);
  if (routeScreen && managerScreens.includes(routeScreen) && canManageVenueSpace(venue))
    return routeScreen;
  return "service";
}

// Layout shell of the Vendor workspace: /[locale], /owner/[screen] and /staff/[screen].
// There is no role switch: the selected venue decides the workspace. Own venues open the owner's
// screens, venues where the user works open the staff screens for their venue role.
export default function VendorApp({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const errorMessage = useLocalizedError();
  const [routeRoleSegment, routeScreen] = useSelectedLayoutSegments();
  const routeRole: VendorRole = routeRoleSegment === "staff" ? "staff" : "owner";
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  // Without a venue an owner sees onboarding; a staff-only account waits for an invitation.
  const role: VendorRole = venue
    ? roleForVenue(venue)
    : currentUser?.capabilities.includes("staff") && !currentUser.capabilities.includes("owner")
      ? "staff"
      : "owner";
  const screen = resolveScreen(role, routeScreen, venue);
  const shell = useAppShell(`${currentUser?.id}:${venue?.id}:${role}`);
  const [orderRequest, setOrderRequest] = useState<{ id: string; scope: string }>();
  const scope = `${role}:${venue?.id}`;
  const request = orderRequest?.scope === scope ? orderRequest : undefined;
  const [modal, setModal] = useState<VendorModal | null>(null);

  useEffect(() => {
    let active = true;
    // Every venue the account owns or works at, with its venue role.
    Promise.all([getCurrentUser(), listStaffVenues()])
      .then(([user, venues]) => {
        if (!active) return;
        const selectedID = window.localStorage.getItem(selectedVenueKey(user.id));
        const initialRole = window.location.pathname.includes("/staff") ? "staff" : "owner";
        const selectedVenue =
          venues.find((item) => item.id === selectedID) ??
          venues.find((item) => roleForVenue(item) === initialRole) ??
          venues[0] ??
          null;
        setCurrentUser(user);
        setAvailableVenues(venues);
        setVenue(selectedVenue);
        setAuthReady(true);
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
  }, [router]);

  // Keep the URL on the role and screen the account can actually open.
  useEffect(() => {
    if (authReady && (role !== routeRole || screen !== routeScreen))
      router.replace(vendorPath(locale, role, screen));
  }, [authReady, locale, role, routeRole, routeScreen, router, screen]);

  const signOut = async () => {
    try {
      await logout();
    } finally {
      router.replace(`/${locale}/login`);
      router.refresh();
    }
  };

  const navigate = (next: string) => {
    setOrderRequest(undefined);
    router.push(vendorPath(locale, role, next));
    shell.setMobileNav(false);
    window.scrollTo(0, 0);
  };

  const createVenue = async (input: VenueInput) => {
    if (!currentUser) return;
    try {
      const newVenue: Venue = { ...(await createOwnerVenue(input)), access_role: "owner" };
      setAvailableVenues((current) => [...current, newVenue]);
      setCurrentUser((current) =>
        current
          ? { ...current, capabilities: [...new Set([...current.capabilities, "owner" as const])] }
          : current,
      );
      window.localStorage.setItem(selectedVenueKey(currentUser.id), newVenue.id);
      setVenue(newVenue);
      router.push(vendorPath(locale, "owner", "venue"));
      setModal(null);
      shell.setMobileNav(false);
      shell.notify(`${newVenue.name} добавлено`);
    } catch (caught) {
      shell.notify(errorMessage(caught, "Не удалось добавить заведение"));
      throw caught;
    }
  };

  // Switching venues may switch the workspace; the current screen stays when the new one has it.
  const selectVenue = (nextVenue: Venue) => {
    if (!currentUser) return;
    const nextRole = roleForVenue(nextVenue);
    setVenue(nextVenue);
    setOrderRequest(undefined);
    router.push(vendorPath(locale, nextRole, resolveScreen(nextRole, screen, nextVenue)));
    shell.setMobileNav(false);
    window.localStorage.setItem(selectedVenueKey(currentUser.id), nextVenue.id);
    shell.notify(`Выбрано заведение ${nextVenue.name}`);
  };

  // The saved venue comes back without the user's access role: keep the one already known.
  const updateVenueState = (updatedVenue: Venue) => {
    setVenue((current) =>
      current?.id === updatedVenue.id ? { ...current, ...updatedVenue } : updatedVenue,
    );
    setAvailableVenues((current) =>
      current.map((item) => (item.id === updatedVenue.id ? { ...item, ...updatedVenue } : item)),
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
    const nextRole = nextVenue ? roleForVenue(nextVenue) : "owner";
    router.push(vendorPath(locale, nextRole, defaultScreen[nextRole]));
    shell.notify("Заведение удалено");
  };

  if (!authReady || !currentUser)
    return (
      <main className="auth-loading" aria-live="polite">
        {t("Проверяем сессию...")}
      </main>
    );

  const navigation =
    role === "owner"
      ? ownerNavigation
      : staffNavigation.filter(
          (item) =>
            item.id === "service" ||
            (managerScreens.includes(item.id) && canManageVenueSpace(venue)),
        );

  const openOrder = (id: string) => {
    const target = role === "owner" ? "orders" : "service";
    if (target !== screen) navigate(target);
    setOrderRequest({ id, scope });
  };
  const banner = shell.orderBanner;

  return (
    <VendorShellContext.Provider
      value={{
        role,
        screen,
        user: currentUser,
        setUser: setCurrentUser,
        venue,
        venueCount: availableVenues.length,
        request,
        notify: shell.notify,
        navigate,
        openModal: setModal,
        updateVenue: updateVenueState,
        removeVenue: removeCurrentVenue,
        signOut,
      }}
    >
      <OwnerWorkspaceProvider
        key={`${currentUser.id}:${scope}`}
        readScope={`${currentUser.id}:${venue?.id}`}
        venueTimezone={venue?.timezone}
        ordersOnly={role === "staff"}
        withMenu={role === "staff" && canManageVenueSpace(venue)}
        venueID={venue?.id}
        onError={shell.notify}
        onArrivals={shell.notifyOrders}
      >
        <div
          data-screen={role === "staff" && screen === "service" ? "orders" : screen}
          className={`app-shell vendor-shell ${shell.sidebarCollapsed ? "sidebar-collapsed" : ""}`}
        >
          <VendorSidebar
            user={currentUser}
            role={role}
            brand="Pocket Vendor"
            screen={screen}
            navigation={navigation}
            venue={venue}
            venues={availableVenues}
            mobileNav={shell.mobileNav}
            collapsed={shell.sidebarCollapsed}
            onNavigate={navigate}
            onSignOut={() => void signOut()}
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
                  <h1>{t("Добавьте первое заведение")}</h1>
                  <p>{t("После создания откроются меню, команда, заказы и аналитика.")}</p>
                  <Button icon={Plus} onClick={() => setModal("venue")}>
                    {t("Добавить заведение")}
                  </Button>
                </section>
              )}
              {(venue || screen === "account") && children}
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
    </VendorShellContext.Provider>
  );
}

// The sidebar with attention counters: new orders and reviews waiting for a reply.
function VendorSidebar(props: Parameters<typeof Sidebar>[0]) {
  const { orders, reviews } = useOwnerWorkspace();
  const newOrders = orders.filter((order) => order.status === "new").length;
  const unanswered = reviews.filter((review) => !review.owner_reply).length;
  const counts: Record<string, number> = {
    orders: newOrders,
    service: newOrders,
    reviews: unanswered,
  };
  const navigation = props.navigation.map((item) =>
    counts[item.id] ? { ...item, count: counts[item.id] } : item,
  );
  return <Sidebar {...props} navigation={navigation} />;
}
