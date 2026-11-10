"use client";

// Pages of the Vendor workspace (/owner/* and /staff/*). Each one renders inside the VendorApp
// layout, and only while the layout agrees that its role and screen are the current ones:
// right after sign-in the layout may still be redirecting to the screen the account can open.
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
import { ServiceBoard } from "../features/pocket/staff";
import { FloorPlan } from "../features/pocket/floor-plan";
import { useVendorShell, type VendorRole } from "./vendor-shell-context";

function useVenuePage(role: VendorRole, screen: string) {
  const shell = useVendorShell();
  if (shell.role !== role || shell.screen !== screen || !shell.venue) return null;
  return { ...shell, venue: shell.venue };
}

export function OverviewPage() {
  const page = useVenuePage("owner", "overview");
  if (!page) return null;
  return <OwnerOverview ownerName={page.user.first_name} onNavigate={page.navigate} />;
}

export function OrdersPage() {
  const page = useVenuePage("owner", "orders");
  if (!page) return null;
  return <OrdersScreen request={page.request} />;
}

export function MenuPage() {
  const page = useVenuePage("owner", "menu");
  if (!page) return null;
  return (
    <MenuManager
      key={page.venue.id}
      venueName={page.venue.name}
      venue={page.venue}
      onVenueUpdate={page.updateVenue}
      notify={page.notify}
    />
  );
}

export function TeamPage() {
  const page = useVenuePage("owner", "team");
  if (!page) return null;
  return <TeamScreen onInvite={() => page.openModal("invite")} notify={page.notify} />;
}

export function AnalyticsPage() {
  const page = useVenuePage("owner", "analytics");
  if (!page) return null;
  return <AnalyticsScreen />;
}

export function ReviewsPage() {
  const page = useVenuePage("owner", "reviews");
  if (!page) return null;
  return <ReviewsScreen notify={page.notify} />;
}

export function VenuePage() {
  const page = useVenuePage("owner", "venue");
  if (!page) return null;
  return (
    <VenueScreen
      key={page.venue.id}
      venue={page.venue}
      notify={page.notify}
      onUpdate={page.updateVenue}
      onDelete={page.removeVenue}
    />
  );
}

export function PaymentsPage() {
  const page = useVenuePage("owner", "payments");
  if (!page) return null;
  return <PaymentsScreen />;
}

export function SubscriptionPage() {
  const page = useVenuePage("owner", "subscription");
  if (!page) return null;
  return <SubscriptionScreen venueCount={page.venueCount} notify={page.notify} />;
}

export function ServicePage() {
  const page = useVenuePage("staff", "service");
  if (!page) return null;
  return <ServiceBoard request={page.request} />;
}

export function StaffFloorPage() {
  const page = useVenuePage("staff", "staff-floor");
  if (!page) return null;
  return <FloorPlan mode="staff" venueName={page.venue.name} notify={page.notify} />;
}

// The account page works for both roles and without a venue.
export function AccountPage() {
  const shell = useVendorShell();
  if (shell.screen !== "account") return null;
  return (
    <AccountScreen
      user={shell.user}
      notify={shell.notify}
      onLogout={shell.signOut}
      onUpdate={shell.setUser}
    />
  );
}

// /[locale], /owner and /staff have no content of their own: the layout redirects to a screen.
export function WorkspaceIndexPage() {
  return null;
}
