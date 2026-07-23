"use client";

// Pages of a Dish restaurant link (/r/[venueID]) and table QR (/qr/[token]).
// Each one renders inside the DishApp layout and takes what it needs from useDishShell().
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VenueDetailsScreen } from "../features/pocket/customer/venue-details";
import { TableEntry } from "../features/pocket/customer/table-entry";
import { TableVenueScreen } from "../features/pocket/customer/table-venue";
import { MyReservationsScreen } from "../features/pocket/customer/my-reservations";
import { GuestSettings } from "../features/pocket/customer/profile";
import { DishAccountMenu } from "../features/pocket/customer/dish-account-menu";
import { useI18n } from "../features/pocket/i18n";
import { useDishShell } from "./dish-shell-context";

function VenuePage({ reservation }: { reservation: boolean }) {
  const { venueID, user, navigate, menuQuery, openSettings } = useDishShell();
  const params = useSearchParams();
  if (!venueID) return null;
  return (
    <VenueDetailsScreen
      standalone
      menuPage={!reservation}
      initialCategoryID={params.get("category") ?? undefined}
      initialSearchOpen={params.get("search") === "1"}
      reservationPage={reservation}
      onReserve={() => navigate("reservation")}
      onViewReservations={() => navigate("reservations")}
      onOpenSettings={openSettings}
      saved={false}
      venueID={venueID}
      onBack={() => navigate("")}
      user={user}
      desktopMenuQuery={menuQuery}
    />
  );
}

export function VenueMenuPage() {
  return <VenuePage reservation={false} />;
}

export function VenueReservationPage() {
  return <VenuePage reservation />;
}

function TableEntryPage({ bill }: { bill: boolean }) {
  const { qrToken, basePath, openSettings } = useDishShell();
  if (!qrToken) return null;
  return (
    <TableEntry
      key={qrToken}
      token={qrToken}
      basePath={basePath}
      billPage={bill}
      onSettings={openSettings}
    />
  );
}

export function TableHomePage() {
  return <TableEntryPage bill={false} />;
}

export function TableBillPage() {
  return <TableEntryPage bill />;
}

export function TableMenuPage() {
  const { qrToken, user, navigate, notify, menuQuery, openSettings } = useDishShell();
  if (!qrToken) return null;
  return (
    <TableVenueScreen
      key={qrToken}
      user={user}
      token={qrToken}
      onBack={() => navigate("")}
      notify={notify}
      onOpenSettings={openSettings}
      desktopMenuQuery={menuQuery}
    />
  );
}

export function ReservationsPage() {
  const { user, navigate } = useDishShell();
  const { locale, t } = useI18n();
  const router = useRouter();
  if (!user) return null;
  return (
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
  );
}

function AccountMenuPage() {
  const { user, navigate, signOut } = useDishShell();
  const { t } = useI18n();
  if (!user) return null;
  return (
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
      <DishAccountMenu user={user} onNavigate={navigate} onLogin={() => {}} onLogout={signOut} />
    </section>
  );
}

function SettingsSectionPage({
  section,
  notifications,
}: {
  section?: "profile" | "security";
  notifications: boolean;
}) {
  const { user, setUser, navigate, signOut, editProfile, notify } = useDishShell();
  if (!user) return null;
  return (
    <GuestSettings
      key={section}
      initialSection={section}
      onBack={() => navigate("profile")}
      user={user}
      onNavigate={navigate}
      onLogout={signOut}
      onEditProfile={editProfile}
      onUpdate={setUser}
      notify={notify}
      notifications={notifications}
    />
  );
}

export function ProfilePage() {
  return <AccountMenuPage />;
}

const useSettingsSection = () => {
  const section = useSearchParams().get("section");
  return section === "profile" || section === "security" ? section : undefined;
};

// /settings without a section is the same account menu as /profile.
export function SettingsPage() {
  const section = useSettingsSection();
  if (section) return <SettingsSectionPage section={section} notifications={false} />;
  return <AccountMenuPage />;
}

export function NotificationsPage() {
  return <SettingsSectionPage section={useSettingsSection()} notifications />;
}
