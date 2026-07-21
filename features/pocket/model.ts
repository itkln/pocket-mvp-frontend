import { type AuthUser } from "../../lib/auth-api";
import { type OwnerVenue } from "../../lib/owner-api";
import { Activity, BarChart3, CalendarDays, Coffee, LayoutDashboard, MessageSquareText, ReceiptText, Search, Sparkles, Store, Table2, UserRound, Users, Utensils, UtensilsCrossed, WalletCards } from "lucide-react";

export type Role = "owner" | "customer" | "staff";
export type Status = "Новый" | "Готовится" | "Готов" | "Подан";

export const userInitials = (user: AuthUser) => `${user.first_name.at(0) ?? ""}${user.last_name.at(0) ?? ""}`.toUpperCase();
export const makeVenueSlug = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "venue";

export type Venue = OwnerVenue;

export const venueInitials = (venue: Venue) => venue.name.split(/\s+/).slice(0, 2).map((part) => part.at(0) ?? "").join("").toUpperCase();
export const venueLocation = (venue: Venue) => [venue.city, venue.address].filter(Boolean).join(" · ");
export const selectedVenueKey = (userID: string) => `pocket:selected-venue:${userID}`;
export const sidebarCollapsedKey = "pocket:sidebar-collapsed";

export type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  position: string;
  popular?: boolean;
};

export const menuItems: MenuItem[] = [
  { id: 1, name: "Тальятелле с трюфелем", description: "Лесные грибы, пармезан, трюфельное масло", price: 18.5, category: "Паста", position: "0% 0%", popular: true },
  { id: 2, name: "Сибас на гриле", description: "Лимон, травы, молодой картофель", price: 24, category: "Основное", position: "50% 0%", popular: true },
  { id: 3, name: "Буррата и томаты", description: "Сезонные томаты, базилик, оливковое масло", price: 13.5, category: "Закуски", position: "100% 0%" },
  { id: 4, name: "Куриный шницель", description: "Рукола, редис, лимонный соус", price: 17, category: "Основное", position: "0% 100%" },
  { id: 5, name: "Тирамису", description: "Маскарпоне, эспрессо, какао", price: 8.5, category: "Десерты", position: "50% 100%", popular: true },
  { id: 6, name: "Красный апельсин", description: "Цитрус, тоник, розмарин", price: 7, category: "Напитки", position: "100% 100%" },
];

export const liveOrders = [
  { id: "#1048", source: "Стол 08", guest: "4 гостя", total: 76.5, status: "Новый" as Status, time: "2 мин" },
  { id: "#1047", source: "Онлайн", guest: "Анна К.", total: 42, status: "Готовится" as Status, time: "8 мин" },
  { id: "#1046", source: "Стол 03", guest: "2 гостя", total: 58.5, status: "Готов" as Status, time: "14 мин" },
  { id: "#1045", source: "Стол 12", guest: "6 гостей", total: 124, status: "Подан" as Status, time: "26 мин" },
  { id: "#1044", source: "Самовывоз", guest: "Марк С.", total: 31.5, status: "Готовится" as Status, time: "29 мин" },
];

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

export const customerNavigation = [
  { id: "discover", label: "Заведения", icon: Search },
  { id: "browse-menu", label: "Меню", icon: Utensils },
  { id: "reservation", label: "Бронь", icon: CalendarDays },
  { id: "history", label: "Мои заказы", icon: ReceiptText },
  { id: "profile", label: "Профиль", icon: UserRound },
];

export const staffNavigation = [
  { id: "service", label: "Сервис", icon: Activity, count: 5 },
  { id: "kitchen", label: "Кухня", icon: Coffee },
  { id: "staff-floor", label: "Столы", icon: Table2 },
];

export const mobilePrimaryNavigation: Record<Role, string[]> = {
  owner: ["overview", "orders", "menu"],
  customer: ["discover", "browse-menu", "reservation", "history"],
  staff: ["service", "kitchen", "staff-floor"],
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
  staff: [{ label: "Смена", ids: ["service", "kitchen", "staff-floor"] }],
};
