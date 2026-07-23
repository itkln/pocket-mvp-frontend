import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "./i18n";
import { Sidebar, Topbar } from "./navigation";
import { type Venue } from "./model";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/ru/owner/overview", useRouter: () => ({ replace }) }));

describe("Topbar language menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("switches the whole interface and keeps the selected short code visible", async () => {
    render(<I18nProvider><Topbar
      role="owner"
      screen="overview"
      navigation={[{ id: "overview", label: "Обзор" }]}
      venueName="Pocket"
      cartCount={0}
      notifications={[]}
      onMenu={vi.fn()}
      onCart={vi.fn()}
      onNavigate={vi.fn()}
      onNotificationsRead={vi.fn()}
      onNotificationsClear={vi.fn()}
    /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса: RU" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "EN English" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Interface language: EN" })).toBeInTheDocument());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(window.localStorage.getItem("pocket:locale")).toBe("en");
    expect(replace).toHaveBeenCalledWith("/en/owner/overview");
  });

  it("opens quick navigation and the notification history", () => {
    const onNavigate = vi.fn();
    const onNotificationsRead = vi.fn();
    render(<I18nProvider><Topbar
      role="owner"
      screen="overview"
      navigation={[{ id: "overview", label: "Обзор" }, { id: "menu", label: "Меню" }]}
      venueName="Pocket"
      cartCount={0}
      notifications={[{ id: 1, message: "Изменения сохранены", createdAt: 1, read: false }]}
      onMenu={vi.fn()}
      onCart={vi.fn()}
      onNavigate={onNavigate}
      onNotificationsRead={onNotificationsRead}
      onNotificationsClear={vi.fn()}
    /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Поиск" }));
    fireEvent.change(screen.getByPlaceholderText("Найти раздел"), { target: { value: "мен" } });
    fireEvent.click(screen.getByRole("button", { name: "Меню" }));
    expect(onNavigate).toHaveBeenCalledWith("menu");

    fireEvent.click(screen.getByRole("button", { name: "Уведомления" }));
    expect(onNotificationsRead).toHaveBeenCalled();
    expect(screen.getByText("Изменения сохранены")).toBeInTheDocument();
  });
});

const owner = {
  id: "user-1",
  email: "owner@example.com",
  first_name: "Denys",
  last_name: "Itkin",
  role: "venue_owner" as const,
  capabilities: ["customer", "owner"] as ("customer" | "owner")[],
};

const venue = (id: string, name: string, city: string): Venue => ({
  id,
  name,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  address: "Hidden address",
  city,
  country_code: "SK",
  timezone: "Europe/Bratislava",
  currency: "EUR",
  status: "active",
  settings: {},
  created_at: "2026-01-01T00:00:00Z",
});

const sidebarProps = {
  user: owner,
  role: "owner" as const,
  screen: "overview",
  navigation: [],
  mobileNav: false,
  collapsed: false,
  onNavigate: vi.fn(),
  onRole: vi.fn(),
  onVenue: vi.fn(),
  onAddVenue: vi.fn(),
  onClose: vi.fn(),
  onToggleCollapsed: vi.fn(),
};

describe("Sidebar venue navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows venue creation below a single non-expandable venue", () => {
    const zenGarden = venue("venue-1", "Zen Garden", "Bratislava");
    render(<I18nProvider><Sidebar {...sidebarProps} venue={zenGarden} venues={[zenGarden]} /></I18nProvider>);

    expect(screen.getByRole("button", { name: /Zen Garden/ })).toBeDisabled();
    expect(screen.queryByText("Bratislava")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Добавить заведение" }));
    expect(sidebarProps.onAddVenue).toHaveBeenCalledOnce();
  });

  it("opens venue switching only when multiple venues are available", () => {
    const zenGarden = venue("venue-1", "Zen Garden", "Bratislava");
    const northVine = venue("venue-2", "North & Vine", "Kosice");
    render(<I18nProvider><Sidebar {...sidebarProps} venue={zenGarden} venues={[zenGarden, northVine]} /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: /Zen Garden/ }));

    expect(screen.getByText("North & Vine")).toBeInTheDocument();
    expect(screen.queryByText("Kosice")).not.toBeInTheDocument();
  });
});
