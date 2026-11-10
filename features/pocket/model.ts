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
  Table2,
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
  { id: "team", label: "Команда", icon: Users },
  { id: "analytics", label: "Аналитика", icon: BarChart3 },
  { id: "reviews", label: "Отзывы", icon: MessageSquareText },
  { id: "venue", label: "Заведение", icon: Store },
  { id: "payments", label: "Платежи", icon: WalletCards },
  { id: "subscription", label: "Подписка", icon: Sparkles },
];

export const staffNavigation = [
  { id: "service", label: "Сервис", icon: Activity },
  { id: "staff-floor", label: "Столы", icon: Table2 },
];

export const mobilePrimaryNavigation: Record<Role, string[]> = {
  owner: ["overview", "orders", "menu"],
  customer: ["discover", "browse-menu", "reservation", "history"],
  staff: ["service", "staff-floor"],
};

export const navigationGroups: Record<Role, { label: string; ids: string[] }[]> = {
  owner: [
    { label: "Сегодня", ids: ["overview", "orders"] },
    { label: "Операции", ids: ["menu", "team"] },
    { label: "Контроль", ids: ["analytics", "reviews", "payments"] },
    { label: "Настройки", ids: ["venue", "subscription"] },
  ],
  customer: [
    { label: "Главное", ids: ["discover", "browse-menu"] },
    { label: "Мои действия", ids: ["reservation", "history"] },
  ],
  staff: [{ label: "Смена", ids: ["service", "staff-floor"] }],
};
