import { type AuthUser } from "../../lib/auth-api";
import { type OwnerVenue } from "../../lib/owner-api";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  Sparkles,
  Store,
  PanelsTopLeft,
  Users,
  UtensilsCrossed,
  WalletCards,
} from "lucide-react";

export type Role = "owner" | "customer" | "staff";

export const userInitials = (user: AuthUser) =>
  `${user.first_name.at(0) ?? ""}${user.last_name.at(0) ?? ""}`.toUpperCase();
export const makeVenueSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "venue";

export type Venue = OwnerVenue;

export const venueInitials = (venue: Venue) =>
  venue.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.at(0) ?? "")
    .join("")
    .toUpperCase();
export const selectedVenueKey = (userID: string) => `pocket:selected-venue:${userID}`;
export const sidebarCollapsedKey = "pocket:sidebar-collapsed";

export const ownerNavigation = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "orders", label: "Заказы", icon: ReceiptText },
  { id: "menu", label: "Меню", icon: UtensilsCrossed },
  { id: "floor", label: "План зала", icon: PanelsTopLeft },
  { id: "team", label: "Команда", icon: Users },
  { id: "analytics", label: "Аналитика", icon: BarChart3 },
  { id: "reviews", label: "Отзывы", icon: MessageSquareText },
  { id: "venue", label: "Настройки заведения", icon: Store },
  { id: "payments", label: "Платежи", icon: WalletCards },
  { id: "subscription", label: "Подписка", icon: Sparkles },
];

export const staffNavigation = [
  { id: "service", label: "Сервис", icon: Activity },
  { id: "menu", label: "Меню", icon: UtensilsCrossed },
  { id: "floor", label: "План зала", icon: PanelsTopLeft },
  { id: "staff-floor", label: "Зал", icon: PanelsTopLeft },
  { id: "venue", label: "Настройки заведения", icon: Store },
];
// Staff screens beyond the service desk, by venue role (V-BE-02: managers run the menu, the floor
// and the venue settings).
export const managerScreens = ["menu", "floor", "venue"];
// Waiters work the live floor (V-SRV-02: seating, freeing tables, bills) without its editor;
// managers have it inside "floor".
export const waiterScreens = ["staff-floor"];
export const canManageVenueSpace = (venue?: { access_role?: string } | null) =>
  venue?.access_role === "manager" || venue?.access_role === "owner";

export const mobilePrimaryNavigation: Record<Role, string[]> = {
  owner: ["overview", "orders", "menu"],
  customer: ["discover", "browse-menu", "reservation", "history"],
  staff: ["service", "staff-floor", "menu", "floor"],
};

// Sidebar groups. The first group has no title; settings sit at the bottom next to the profile.
export const navigationGroups: Record<Role, { label: string; ids: string[] }[]> = {
  owner: [
    { label: "", ids: ["overview", "orders"] },
    { label: "Заведение", ids: ["menu", "floor", "team", "reviews"] },
    { label: "Бизнес", ids: ["analytics", "payments"] },
  ],
  customer: [
    { label: "Главное", ids: ["discover", "browse-menu"] },
    { label: "Мои действия", ids: ["reservation", "history"] },
  ],
  staff: [
    { label: "", ids: ["service", "staff-floor"] },
    { label: "Заведение", ids: ["menu", "floor"] },
  ],
};
export const sidebarFooterNavigation: Record<Role, string[]> = {
  owner: ["venue", "subscription"],
  customer: [],
  staff: ["venue"],
};

// The role a venue opens in: the owner's workspace for own venues, the staff one elsewhere.
export const roleForVenue = (venue: { access_role?: string }) =>
  venue.access_role === "owner" ? ("owner" as const) : ("staff" as const);

export const venueRoleLabels: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  waiter: "Официант",
};
