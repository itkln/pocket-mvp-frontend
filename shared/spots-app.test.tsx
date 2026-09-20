import { useSyncExternalStore } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpotsApp from "./spots-app";
import { AuthAPIError, getCurrentUser, updateProfile } from "../lib/auth-api";
import { listPublicVenues, type PublicVenue } from "../lib/public-catalog-api";

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(useSyncExternalStore((callback) => {
    window.addEventListener("popstate", callback);
    return () => window.removeEventListener("popstate", callback);
  }, () => window.location.search)),
}));
vi.mock("../lib/auth-api", async (original) => ({ ...await original<object>(), getCurrentUser: vi.fn(), updateProfile: vi.fn() }));
vi.mock("../lib/public-catalog-api", async (original) => ({ ...await original<object>(), listPublicVenues: vi.fn() }));
const publicVenues: PublicVenue[] = [
  { id: "north", slug: "north", name: "North & Vine", category_slug: "restaurants", cuisine_type: "Европейская", address: "Dunajská 12", city: "Bratislava", country_code: "SK", rating: 4.8, review_count: 12, tags: ["Стол через 20 мин"], filters: ["Лучшие"], preorder_enabled: false, created_at: "2026-09-19T00:00:00Z" },
  { id: "casa", slug: "casa", name: "Casa Forma", category_slug: "restaurants", cuisine_type: "Итальянская", address: "Obchodná 24", city: "Bratislava", country_code: "SK", rating: 4.7, review_count: 8, tags: ["Есть места сегодня"], filters: ["Итальянская"], preorder_enabled: false, created_at: "2026-09-19T00:00:00Z" },
];
const nativeReplace = window.history.replaceState.bind(window.history);
let desktop = false;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  nativeReplace(null, "", "/ru/discover");
  desktop = false;
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: desktop, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(window.history, "replaceState").mockImplementation((state, unused, url) => {
    nativeReplace(state, unused, url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  router.push.mockImplementation((url: string) => { window.history.pushState(null, "", url); window.dispatchEvent(new PopStateEvent("popstate")); });
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "guest", email: "guest@example.com", first_name: "Anna", last_name: "Guest", role: "customer" });
  vi.mocked(listPublicVenues).mockResolvedValue({ venues: publicVenues, page: 1, page_size: 24, total: publicVenues.length, total_pages: 1, has_next: false });
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { if (this.hasAttribute("open")) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } };
});

describe("Spots guest experience", () => {
  it("shows guest discovery without bottom navigation and opens sign in from the header", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new AuthAPIError("unauthorized", "Unauthorized", 401));
    render(<SpotsApp initialScreen="discover" />);

    const login = await screen.findByRole("button", { name: "Войти" });
    expect(login).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Категории" })).getAllByRole("button")).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "В избранное" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Основная навигация Pocket Spots" })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalledWith("/ru/login");

    fireEvent.click(login);
    expect(router.push).toHaveBeenLastCalledWith("/ru/login");
  });

  it("opens guest city and language choices from collapsed mobile menu rows", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new AuthAPIError("unauthorized", "Unauthorized", 401));
    render(<SpotsApp initialScreen="discover" />);
    fireEvent.click(await screen.findByRole("button", { name: "Открыть меню" }));
    let menu = screen.getByRole("dialog", { name: "Меню" });
    expect(within(menu).getByRole("heading", { name: "Войдите в аккаунт" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(within(menu).queryByRole("button", { name: "English" })).not.toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("button", { name: "Город: Выбрать место" }));
    menu = screen.getByRole("dialog", { name: "Город" });
    fireEvent.click(within(menu).getByRole("button", { name: "Братислава" }));
    menu = screen.getByRole("dialog", { name: "Меню" });
    expect(within(menu).getByRole("button", { name: "Город: Братислава" })).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("button", { name: "Язык интерфейса: Русский" }));
    menu = screen.getByRole("dialog", { name: "Язык интерфейса" });
    expect(within(menu).getByRole("button", { name: "Русский" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(menu).getByRole("button", { name: "English" }));
    expect(router.replace).toHaveBeenLastCalledWith("/en/discover");
  });

  it("keeps authenticated mobile navigation compact without a duplicate home action", async () => {
    render(<SpotsApp initialScreen="discover" />);
    await screen.findByRole("button", { name: "Меню аккаунта" });
    expect(screen.queryByRole("button", { name: "Открыть меню" })).not.toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Основная навигация Pocket Spots" });
    expect(within(navigation).getAllByRole("button")).toHaveLength(3);
    expect(within(navigation).queryByRole("button", { name: "Главная" })).not.toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Избранное" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Мои брони" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Профиль" })).toBeInTheDocument();
  });

  it("migrates saved guest state from the previous product namespace", async () => {
    localStorage.setItem("pocket:eats-city", "Братислава");
    localStorage.setItem("pocket:eats-saved:guest", JSON.stringify(["Casa Forma"]));
    render(<SpotsApp initialScreen="saved" />);
    expect(await screen.findByRole("button", { name: "Выбрать город: Братислава" })).toBeInTheDocument();
    expect(await screen.findByText("Casa Forma")).toBeInTheDocument();
    expect(localStorage.getItem("pocket:spots-city")).toBe("Братислава");
    expect(localStorage.getItem("pocket:spots-saved:guest")).toBe(JSON.stringify(["Casa Forma"]));
    expect(localStorage.getItem("pocket:eats-city")).toBeNull();
    expect(localStorage.getItem("pocket:eats-saved:guest")).toBeNull();
  });

  it("requires an explicit city choice, and restores it across pages and reloads", async () => {
    const view = render(<SpotsApp initialScreen="discover" />);
    const choose = await screen.findByRole("button", { name: "Выбрать место" });
    expect(screen.getByRole("banner")).toHaveClass("needs-city");
    expect(localStorage.getItem("pocket:spots-city")).toBeNull();
    expect(within(screen.getByRole("navigation", { name: "Категории" })).getAllByRole("button")).toHaveLength(8);
    expect(document.querySelectorAll(".spots-category-illustration")).toHaveLength(8);
    fireEvent.click(choose);
    fireEvent.click(screen.getByRole("button", { name: "Братислава", exact: true }));
    expect(screen.getByRole("banner")).toHaveClass("has-city");
    expect(localStorage.getItem("pocket:spots-city")).toBe("Братислава");
    fireEvent.click(screen.getByRole("button", { name: "Профиль", exact: true }));
    expect(await screen.findByRole("heading", { name: "Профиль" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выбрать город: Братислава" })).toBeInTheDocument();
    view.unmount();
    render(<SpotsApp initialScreen="settings" />);
    expect(await screen.findByRole("button", { name: "Выбрать город: Братислава" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveClass("has-city");
  });

  it("opens dedicated profile settings while keeping working account forms and no content tooltips", async () => {
    render(<SpotsApp initialScreen="profile" />);
    await screen.findByRole("heading", { name: "Профиль" });
    expect(screen.queryByRole("button", { name: "Мои заказы", exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Настройки", exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Anna Guest.*Редактировать профиль/ }));
    expect(router.push).toHaveBeenLastCalledWith("/ru/settings");
    fireEvent.click(screen.getByRole("button", { name: "Личные данные", exact: true }));
    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveValue("Anna");
    expect(screen.getByRole("button", { name: "Сохранить изменения" })).toBeDisabled();
    expect(document.querySelector(".spots-main [title], .spots-main [data-tooltip]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Назад", exact: true }));
    expect(screen.getByRole("heading", { name: "Настройки", exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Безопасность", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Изменить пароль" }));
    expect(screen.getByLabelText("Текущий пароль")).toBeInTheDocument();
  });

  it("ignores an invalid stored city instead of choosing the first city", async () => {
    localStorage.setItem("pocket:spots-city", "unknown");
    render(<SpotsApp initialScreen="discover" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Выбрать место" })).toBeInTheDocument());
    expect(screen.getByRole("banner")).toHaveClass("needs-city");
  });

  it("persists category, search and filter through the venue page and a reload", async () => {
    const view = render(<SpotsApp initialScreen="restaurants" />);
    const input = await screen.findByRole("textbox", { name: "Поиск: Рестораны" });
    fireEvent.change(input, { target: { value: "Итальянский ресторан" } });
    expect(new URLSearchParams(window.location.search).get("q")).toBe("Итальянский ресторан");
    fireEvent.click(await screen.findByRole("button", { name: "Итальянская", exact: true }));
    expect(new URLSearchParams(window.location.search).get("filter")).toBe("Итальянская");
    expect(screen.queryByRole("region", { name: "Спорт", exact: true })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Открыть Casa Forma" }));
    expect(window.location.pathname).toBe("/ru/browse-menu");
    fireEvent.click(screen.getByRole("button", { name: "Назад к результатам" }));
    expect(window.location.pathname).toBe("/ru/restaurants");
    expect(screen.getByRole("textbox", { name: "Поиск: Рестораны" })).toHaveValue("Итальянский ресторан");
    expect(await screen.findByRole("button", { name: "Итальянская", exact: true })).toHaveAttribute("aria-pressed", "true");
    view.unmount();
    render(<SpotsApp initialScreen="restaurants" />);
    expect(await screen.findByRole("textbox", { name: "Поиск: Рестораны" })).toHaveValue("Итальянский ресторан");
    expect(await screen.findByRole("button", { name: "Открыть Casa Forma" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить категорию" }));
    expect(window.location.pathname).toBe("/ru/discover");
  });

  it("edits desktop profile in a single modal and closes it only after a successful save", async () => {
    desktop = true;
    vi.mocked(updateProfile).mockResolvedValue({ id: "guest", email: "guest@example.com", first_name: "Annie", last_name: "Guest", role: "customer" });
    render(<SpotsApp initialScreen="profile" />);
    const dialog = await screen.findByRole("dialog", { name: "Личные данные" });
    expect(router.replace).toHaveBeenCalledWith("/ru/discover?account=profile");
    expect(screen.queryByRole("heading", { name: "Профиль" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(within(dialog).queryByRole("heading", { name: "Настройки" })).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Имя" }), { target: { value: "Annie" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Сохранить изменения" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(updateProfile).toHaveBeenCalledWith({ first_name: "Annie", last_name: "Guest", phone: "" });
    expect(screen.getByRole("button", { name: "Меню аккаунта" })).toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("opens the desktop profile editor from the account dropdown without a profile page", async () => {
    desktop = true;
    render(<SpotsApp initialScreen="discover" />);
    fireEvent.click(await screen.findByRole("button", { name: "Меню аккаунта" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Личные данные" }));
    expect(await screen.findByRole("dialog", { name: "Личные данные" })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalledWith("/ru/profile");
    expect(screen.queryByRole("heading", { name: "Профиль" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Меню аккаунта" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Безопасность" }));
    expect(await screen.findByRole("dialog", { name: "Безопасность" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Изменить пароль" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Меню аккаунта" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Уведомления" }));
    expect(await screen.findByRole("dialog", { name: "Уведомления" })).toBeInTheDocument();
  });

  it("keeps the desktop editor open when saving fails", async () => {
    desktop = true;
    vi.mocked(updateProfile).mockRejectedValue(new Error("Save failed"));
    render(<SpotsApp initialScreen="profile" />);
    const dialog = await screen.findByRole("dialog", { name: "Личные данные" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Имя" }), { target: { value: "Annie" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Сохранить изменения" }));
    expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    expect(dialog).toHaveAttribute("open");
    fireEvent.click(within(dialog).getByRole("button", { name: "Закрыть", exact: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
