import { useSyncExternalStore } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpotsApp from "./spots-app";
import { AuthAPIError, getCurrentUser, logout, updateProfile } from "../lib/auth-api";
import { createPublicReservation, getPublicVenue, getPublicVenueMenu, getPublicVenueReviews, getVenueAvailability, listPublicVenues, type PublicVenue } from "../lib/public-catalog-api";
import { addSavedVenue, listSavedVenueIDs, removeSavedVenue } from "../lib/saved-venues-api";

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(useSyncExternalStore((callback) => {
    window.addEventListener("popstate", callback);
    return () => window.removeEventListener("popstate", callback);
  }, () => window.location.search)),
}));
vi.mock("../lib/auth-api", async (original) => ({ ...await original<object>(), getCurrentUser: vi.fn(), logout: vi.fn(), updateProfile: vi.fn() }));
vi.mock("../lib/public-catalog-api", async (original) => ({ ...await original<object>(), createPublicReservation: vi.fn(), listPublicVenues: vi.fn(), getPublicVenue: vi.fn(), getPublicVenueMenu: vi.fn(), getPublicVenueReviews: vi.fn(), getVenueAvailability: vi.fn() }));
vi.mock("../lib/saved-venues-api", () => ({ listSavedVenueIDs: vi.fn(), addSavedVenue: vi.fn(), removeSavedVenue: vi.fn() }));
const publicVenues: PublicVenue[] = [
  { id: "north", slug: "north", name: "North & Vine", description: "A small neighborhood bistro.", category_slug: "restaurants", cuisine_type: "Европейская", address: "Dunajská 12", city: "Bratislava", country_code: "SK", rating: 4.8, review_count: 12, tags: ["Стол через 20 мин"], filters: ["Лучшие"], preorder_enabled: false, created_at: "2026-09-19T00:00:00Z" },
  { id: "casa", slug: "casa", name: "Casa Forma", description: "Fresh pasta on Obchodná.", category_slug: "restaurants", cuisine_type: "Итальянская", address: "Obchodná 24", city: "Bratislava", country_code: "SK", rating: 4.7, review_count: 8, tags: ["Есть места сегодня"], filters: ["Итальянская"], preorder_enabled: false, created_at: "2026-09-19T00:00:00Z" },
];
const nativeReplace = window.history.replaceState.bind(window.history);
let desktop = false;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  nativeReplace(null, "", "/ru/discover");
  desktop = false;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: query === "(max-width: 760px)" ? !desktop : desktop, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(window.history, "replaceState").mockImplementation((state, unused, url) => {
    nativeReplace(state, unused, url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  router.push.mockImplementation((url: string) => { window.history.pushState(null, "", url); window.dispatchEvent(new PopStateEvent("popstate")); });
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "guest", email: "guest@example.com", first_name: "Anna", last_name: "Guest", role: "customer" });
  vi.mocked(createPublicReservation).mockResolvedValue({ id: "reservation-1", code: "BOOK123", starts_at: "2026-09-27T17:00:00Z", guest_count: 2, preorder_total_minor: 0, currency: "EUR" });
  vi.mocked(logout).mockResolvedValue();
  vi.mocked(listPublicVenues).mockImplementation(async (search = {}) => {
    const venues = search.ids ? publicVenues.filter((venue) => search.ids!.includes(venue.id)) : publicVenues;
    return { venues, page: 1, page_size: search.pageSize ?? 24, total: venues.length, total_pages: venues.length ? 1 : 0, has_next: false };
  });
  vi.mocked(getPublicVenue).mockImplementation(async (id) => publicVenues.find((venue) => venue.id === id)!);
  vi.mocked(getPublicVenueMenu).mockResolvedValue([]);
  vi.mocked(getPublicVenueReviews).mockResolvedValue([]);
  vi.mocked(getVenueAvailability).mockImplementation(async (id, date, guests) => ({
    venue_id: id, date: date || new Date().toISOString().slice(0, 10), timezone: "Europe/Bratislava", guests,
    duration_minutes: 120, slots: [{ time: "19:00", starts_at: "2026-09-27T17:00:00Z", ends_at: "2026-09-27T19:00:00Z", tables: [{ id: "table-1", identifier: "01", seats: 4 }] }],
  }));
  vi.mocked(listSavedVenueIDs).mockResolvedValue([]);
  vi.mocked(addSavedVenue).mockResolvedValue();
  vi.mocked(removeSavedVenue).mockResolvedValue();
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { if (this.hasAttribute("open")) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } };
});

describe("Spots guest experience", () => {
  it("blocks vertical overscroll on a short discovery page without blocking horizontal carousels", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new AuthAPIError("unauthorized", "Unauthorized", 401));
    const { container } = render(<SpotsApp initialScreen="discover" />);
    await screen.findByRole("navigation", { name: "Категории" });
    const app = container.querySelector(".pocket-spots") as HTMLElement;
    const touch = (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: [{ clientX: x, clientY: y }] });
      app.dispatchEvent(event);
      return event;
    };

    touch("touchstart", 100, 100);
    expect(touch("touchmove", 100, 160).defaultPrevented).toBe(true);
    touch("touchstart", 100, 100);
    expect(touch("touchmove", 160, 105).defaultPrevented).toBe(false);

    const heightDescriptor = Object.getOwnPropertyDescriptor(document.documentElement, "scrollHeight");
    const scrollDescriptor = Object.getOwnPropertyDescriptor(window, "scrollY");
    try {
      Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2000 });
      Object.defineProperty(window, "scrollY", { configurable: true, value: 100 });
      touch("touchstart", 100, 100);
      expect(touch("touchmove", 100, 40).defaultPrevented).toBe(false);
    } finally {
      if (heightDescriptor) Object.defineProperty(document.documentElement, "scrollHeight", heightDescriptor);
      else Reflect.deleteProperty(document.documentElement, "scrollHeight");
      if (scrollDescriptor) Object.defineProperty(window, "scrollY", scrollDescriptor);
      else Reflect.deleteProperty(window, "scrollY");
    }
  });

  it("shows guest discovery without bottom navigation and opens sign in from the header", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new AuthAPIError("unauthorized", "Unauthorized", 401));
    render(<SpotsApp initialScreen="discover" />);

    const login = await screen.findByRole("button", { name: "Войти" });
    expect(login).toBeInTheDocument();
    expect(login.querySelector(".lucide-log-in")).toBeInTheDocument();
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

  it("returns to guest discovery after signing out from the account menu, even when already there", async () => {
    render(<SpotsApp initialScreen="discover" />);
    fireEvent.click(await screen.findByRole("button", { name: "Меню аккаунта" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Выйти" }));

    await waitFor(() => expect(router.replace).toHaveBeenLastCalledWith("/ru/discover"));
    expect(logout).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Основная навигация Pocket Spots" })).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("returns to discovery after signing out from the mobile profile", async () => {
    nativeReplace(null, "", "/ru/profile");
    render(<SpotsApp initialScreen="profile" />);
    fireEvent.click(await screen.findByRole("button", { name: "Выйти из аккаунта" }));

    await waitFor(() => expect(router.replace).toHaveBeenLastCalledWith("/ru/discover"));
    expect(screen.getByRole("navigation", { name: "Категории" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Выйти из аккаунта" })).not.toBeInTheDocument();
  });

  it("keeps the account active when the sign-out request fails", async () => {
    vi.mocked(logout).mockRejectedValue(new Error("Network unavailable"));
    render(<SpotsApp initialScreen="discover" />);
    fireEvent.click(await screen.findByRole("button", { name: "Меню аккаунта" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Выйти" }));

    expect(await screen.findByText("Не удалось выйти из аккаунта")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Основная навигация Pocket Spots" })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalledWith("/ru/discover");
  });

  it("uses the server favorites for the current account while preserving city migration", async () => {
    localStorage.setItem("pocket:eats-city", "Братислава");
    localStorage.setItem("pocket:eats-saved:guest", JSON.stringify(["Casa Forma"]));
    vi.mocked(listSavedVenueIDs).mockResolvedValue(["casa"]);
    render(<SpotsApp initialScreen="saved" />);
    expect(await screen.findByRole("button", { name: "Выбрать город: Братислава" })).toBeInTheDocument();
    expect(await screen.findByText("Casa Forma")).toBeInTheDocument();
    expect(localStorage.getItem("pocket:spots-city")).toBe("Братислава");
    expect(listPublicVenues).toHaveBeenCalledWith(expect.objectContaining({ ids: ["casa"] }), expect.any(AbortSignal));
    expect(localStorage.getItem("pocket:spots-saved:guest")).toBeNull();
    expect(localStorage.getItem("pocket:eats-city")).toBeNull();
    expect(localStorage.getItem("pocket:eats-saved:guest")).toBe(JSON.stringify(["Casa Forma"]));
  });

  it("saves and removes a venue through the account API using its stable ID", async () => {
    render(<SpotsApp initialScreen="discover" />);
    fireEvent.click((await screen.findAllByRole("button", { name: "В избранное" }))[0]);
    await waitFor(() => expect(addSavedVenue).toHaveBeenCalledWith("north"));
    expect(screen.getByRole("button", { name: "Убрать из избранного" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Убрать из избранного" }));
    await waitFor(() => expect(removeSavedVenue).toHaveBeenCalledWith("north"));
  });

  it("opens a venue deep link for a guest using its stable ID", async () => {
    nativeReplace(null, "", "/ru/venue/casa");
    vi.mocked(getCurrentUser).mockRejectedValue(new AuthAPIError("unauthorized", "Unauthorized", 401));
    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    expect(await screen.findByRole("heading", { name: "Casa Forma" })).toBeInTheDocument();
    expect(document.querySelector(".venue-public-category")).toBeNull();
    expect(getPublicVenue).toHaveBeenCalledWith("casa", expect.any(AbortSignal));
    expect(router.replace).not.toHaveBeenCalledWith("/ru/login");
    expect(screen.queryByRole("button", { name: "В избранное" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Разделы заведения" })).not.toBeInTheDocument();
    expect(screen.getByText("Меню этого заведения пока недоступно")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Бронирование" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "19:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Назад к результатам" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Назад", exact: true }).querySelector(".lucide-arrow-left")).toBeInTheDocument();
    expect(screen.queryByText("Подтверждение брони пока недоступно")).not.toBeInTheDocument();
    expect(screen.queryByText("North & Vine")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Поиск по меню" }));
    expect(screen.getByRole("search", { name: "Поиск по меню" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Что будем искать?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Отменить" }));
    expect(screen.queryByRole("search", { name: "Поиск по меню" })).not.toBeInTheDocument();
  });

  it("redirects legacy demo menu, checkout and reservation routes to real venue discovery", async () => {
    nativeReplace(null, "", "/ru/browse-menu");
    vi.mocked(getCurrentUser).mockRejectedValue(new AuthAPIError("unauthorized", "Unauthorized", 401));
    const guest = render(<SpotsApp initialScreen="browse-menu" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/ru/discover"));
    expect(screen.queryByRole("button", { name: /Добавить в заказ/ })).not.toBeInTheDocument();
    guest.unmount();

    router.replace.mockClear();
    nativeReplace(null, "", "/ru/checkout");
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "guest", email: "guest@example.com", first_name: "Anna", last_name: "Guest", role: "customer" });
    const checkout = render(<SpotsApp initialScreen="checkout" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/ru/discover"));
    expect(screen.queryByText("Предзаказ принят")).not.toBeInTheDocument();
    checkout.unmount();
    router.replace.mockClear();
    nativeReplace(null, "", "/ru/reservation");
    render(<SpotsApp initialScreen="reservation" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/ru/discover"));
    expect(screen.queryByText("19 июля")).not.toBeInTheDocument();
  });

  it("searches published menu items and opens venue information from the mobile action", async () => {
    nativeReplace(null, "", "/ru/venue/casa");
    vi.mocked(getPublicVenueMenu).mockResolvedValue([
      { id: "pasta", name: "Паста", items: [
        { id: "carbonara", name: "Карбонара", price_minor: 1290, currency: "EUR", description: "Сливочная паста" },
        { id: "bolognese", name: "Болоньезе", price_minor: 1190, currency: "EUR" },
      ] },
      { id: "drinks", name: "Напитки", items: [{ id: "tea", name: "Чай", price_minor: 390, currency: "EUR" }] },
    ]);
    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    expect(await screen.findByText("Карбонара")).toBeInTheDocument();
    expect(getPublicVenueMenu).toHaveBeenCalledWith("casa", expect.any(AbortSignal));
    const categories = screen.getByRole("navigation", { name: "Категории меню" });
    expect(categories.parentElement).toHaveClass("venue-public-category-sticky-shell");
    fireEvent.click(within(categories).getByRole("button", { name: "Напитки" }));
    expect(within(categories).getByRole("button", { name: "Напитки" })).toHaveAttribute("aria-current", "location");
    expect(screen.queryByRole("button", { name: "Ещё о заведении" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Открыть информацию о заведении" }));
    const info = screen.getByRole("dialog", { name: "Информация о заведении" });
    expect(within(info).getByText("Fresh pasta on Obchodná.")).toBeInTheDocument();
    expect(within(info).getByText(/Obchodná 24/)).toBeInTheDocument();
    fireEvent.click(within(info).getByRole("button", { name: "Закрыть" }));
    fireEvent.click(screen.getByRole("button", { name: "Поиск по меню" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Поиск по меню" }), { target: { value: "карб" } });
    const search = screen.getByRole("search", { name: "Поиск по меню" });
    expect(within(search).getByText("Карбонара")).toBeInTheDocument();
    expect(within(search).queryByText("Болоньезе")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Очистить поиск" }));
    expect(screen.getByRole("heading", { name: "Что будем искать?" })).toBeInTheDocument();
  });

  it("adds dishes from the venue menu to the desktop preorder cart", async () => {
    desktop = true;
    nativeReplace(null, "", "/ru/venue/casa");
    vi.mocked(getPublicVenue).mockResolvedValue({ ...publicVenues[1], preorder_enabled: true });
    vi.mocked(getPublicVenueMenu).mockResolvedValue([{ id: "mains", name: "Основные блюда", items: [{ id: "pasta", name: "Паста", price_minor: 1200, currency: "EUR" }] }]);
    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    await screen.findByRole("heading", { name: "Паста" });
    fireEvent.click(await screen.findByRole("button", { name: "19:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Забронировать" }));
    expect(screen.getByRole("dialog", { name: "Бронирование" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Anna Guest" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Телефон" }), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Свидание" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Комментарий к ресторану" }), { target: { value: "Тихий стол" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));

    const menu = screen.getByRole("dialog", { name: "Меню для предзаказа" });
    expect(menu).toHaveClass("venue-detail-content", "venue-preorder-menu-mode");
    expect(within(menu).getByRole("navigation", { name: "Категории меню" })).toBeInTheDocument();
    expect(within(menu).getByRole("heading", { name: "Паста" })).toBeInTheDocument();
    const cart = within(menu).getByRole("complementary", { name: "Предзаказ" });
    const bookingSummary = within(cart).getByRole("region", { name: "Бронирование" });
    expect(bookingSummary).toHaveTextContent("19:00");
    expect(bookingSummary).toHaveTextContent("Гостей: 2");
    expect(bookingSummary).toHaveTextContent("Anna Guest");
    expect(bookingSummary).toHaveTextContent("+421900123456");
    expect(bookingSummary).toHaveTextContent("Свидание");
    expect(bookingSummary).toHaveTextContent("Тихий стол");
    expect(within(menu).getByRole("button", { name: "Забронировать без предзаказа" })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("button", { name: "Добавить Паста" }));
    expect(within(menu).getByLabelText("Паста: 1")).toBeInTheDocument();
    expect(cart).toHaveTextContent("Паста");
    fireEvent.click(within(menu).getByRole("button", { name: "Подробнее о блюде: Паста" }));
    const product = within(menu).getByRole("dialog", { name: "Паста" });
    fireEvent.click(within(product).getByRole("button", { name: "Добавить" }));
    expect(cart).toHaveTextContent("24,00");
    fireEvent.click(within(cart).getByRole("button", { name: "Убрать Паста" }));
    expect(cart).toHaveTextContent("12,00");
    expect(createPublicReservation).not.toHaveBeenCalled();
    fireEvent.click(within(menu).getByRole("button", { name: /Продолжить к оплате.*12/ }));
    expect(screen.queryByRole("dialog", { name: "Меню для предзаказа" })).not.toBeInTheDocument();
    const review = await screen.findByRole("dialog", { name: "Подтверждение брони" });
    expect(review).toHaveClass("checkout-open");
    expect(within(review).getByText("Оплата в заведении")).toBeInTheDocument();
    expect(within(review).getByText("Тихий стол")).toBeInTheDocument();
    expect(within(review).getByText("Anna Guest")).toBeInTheDocument();
    expect(within(review).getByText(/Паста × 1/)).toBeInTheDocument();
    expect(createPublicReservation).not.toHaveBeenCalled();
    vi.mocked(createPublicReservation).mockResolvedValue({ id: "reservation-2", code: "BOOK123", starts_at: "2026-09-27T17:00:00Z", guest_count: 2, preorder_total_minor: 1200, currency: "EUR" });
    fireEvent.click(within(review).getByRole("button", { name: "Забронировать" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledOnce());
    const confirmation = await screen.findByRole("dialog", { name: "Бронь подтверждена" });
    expect(confirmation).toHaveTextContent("Номер брони: BOOK123");
    expect(confirmation).toHaveTextContent("Паста × 1");
    fireEvent.click(within(confirmation).getByRole("button", { name: "Вернуться к заведению" }));
    expect(screen.queryByRole("dialog", { name: "Бронь подтверждена" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Забронировать" })).toBeDisabled();
  });

  it("returns from the menu to the filled booking form and can reopen the menu", async () => {
    desktop = true;
    nativeReplace(null, "", "/ru/venue/casa");
    vi.mocked(getPublicVenue).mockResolvedValue({ ...publicVenues[1], preorder_enabled: true });
    vi.mocked(getPublicVenueMenu).mockResolvedValue([{ id: "mains", name: "Основные блюда", items: [{ id: "pasta", name: "Паста", price_minor: 1200, currency: "EUR" }] }]);
    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    fireEvent.click(await screen.findByRole("button", { name: "19:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Забронировать" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Other Guest" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Телефон" }), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Свидание" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Комментарий к ресторану" }), { target: { value: "Тихий стол" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    const menu = screen.getByRole("dialog", { name: "Меню для предзаказа" });
    expect(within(menu).getByRole("button", { name: "Назад к бронированию" })).toHaveClass("venue-preorder-menu-close");
    fireEvent.click(within(menu).getByRole("button", { name: "Добавить Паста" }));
    fireEvent.click(within(menu).getByRole("button", { name: "Назад к бронированию" }));
    expect(screen.queryByRole("dialog", { name: "Меню для предзаказа" })).not.toBeInTheDocument();
    const booking = screen.getByRole("dialog", { name: "Бронирование" });
    expect(within(booking).getByRole("button", { name: "19:00" })).toHaveAttribute("aria-pressed", "true");
    expect(within(booking).getByRole("textbox", { name: "Имя" })).toHaveValue("Other Guest");
    expect(within(booking).getByRole("textbox", { name: "Телефон" })).toHaveValue("+421900123456");
    expect(within(booking).getByRole("button", { name: "Свидание" })).toHaveAttribute("aria-pressed", "true");
    expect(within(booking).getByRole("textbox", { name: "Комментарий к ресторану" })).toHaveValue("Тихий стол");
    fireEvent.click(within(booking).getByRole("button", { name: "Продолжить" }));
    expect(within(screen.getByRole("dialog", { name: "Меню для предзаказа" })).getByRole("complementary", { name: "Предзаказ" })).toHaveTextContent("Паста");
    expect(createPublicReservation).not.toHaveBeenCalled();
  });

  it("books directly from an empty desktop preorder cart with entered contacts", async () => {
    desktop = true;
    nativeReplace(null, "", "/ru/venue/casa");
    vi.mocked(getPublicVenue).mockResolvedValue({ ...publicVenues[1], preorder_enabled: true });
    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    fireEvent.click(await screen.findByRole("button", { name: "19:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Забронировать" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Other Guest" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Телефон" }), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    const menu = screen.getByRole("dialog", { name: "Меню для предзаказа" });
    fireEvent.click(within(menu).getByRole("button", { name: "Забронировать без предзаказа" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledOnce());
    expect(vi.mocked(createPublicReservation).mock.calls[0][1]).toMatchObject({ guest_name: "Other Guest", guest_phone: "+421900123456", items: [] });
    expect(await screen.findByText(/Номер брони: BOOK123/)).toBeInTheDocument();
  });

  it("renders server menu order, prices and photos, then refreshes changed availability on focus", async () => {
    nativeReplace(null, "", "/ru/venue/casa");
    vi.mocked(getCurrentUser).mockRejectedValue(new AuthAPIError("unauthorized", "Unauthorized", 401));
    vi.mocked(getPublicVenueMenu)
      .mockResolvedValueOnce([
        { id: "food", name: "Еда", items: [
          { id: "salad", name: "Салат", price_minor: 990, currency: "EUR", image_url: "https://example.test/salad.jpg" },
          { id: "soup", name: "Суп", price_minor: 825, currency: "USD" },
        ] },
        { id: "drinks", name: "Напитки", items: [{ id: "tea", name: "Чай", price_minor: 390, currency: "EUR" }] },
      ])
      .mockResolvedValue([
        { id: "drinks", name: "Напитки", items: [{ id: "tea", name: "Чай", price_minor: 450, currency: "EUR" }] },
      ]);
    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    await screen.findByRole("heading", { name: "Салат" });
    const sections = document.querySelectorAll(".venue-public-menu-category");
    expect(Array.from(sections, (section) => section.getAttribute("aria-label"))).toEqual(["Еда", "Напитки"]);
    expect(Array.from(sections[0].querySelectorAll(".venue-public-menu-card h3"), (name) => name.textContent)).toEqual(["Салат", "Суп"]);
    expect(within(sections[0] as HTMLElement).getByText(/9,90\s*€/)).toBeInTheDocument();
    expect(within(sections[0] as HTMLElement).getByText(/8,25\s*\$/)).toBeInTheDocument();
    expect(within(sections[0] as HTMLElement).getByRole("img", { name: "Салат" })).toHaveStyle({ backgroundImage: 'url("https://example.test/salad.jpg")' });
    expect(screen.queryByRole("button", { name: /Добавить в заказ/ })).not.toBeInTheDocument();

    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(getPublicVenueMenu).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Салат" })).not.toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Суп" })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".venue-public-menu-category")).toHaveLength(1);
    expect(screen.getByText(/4,50\s*€/)).toBeInTheDocument();
  });

  it("closes the mobile venue information sheet with a downward swipe but not while scrolling its content", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    try {
      nativeReplace(null, "", "/ru/venue/casa");
      render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
      await screen.findByRole("heading", { name: "Casa Forma" });
      fireEvent.click(screen.getByRole("button", { name: "Открыть информацию о заведении" }));
      const info = screen.getByRole("dialog", { name: "Информация о заведении" });
      info.scrollTop = 20;
      fireEvent.touchStart(info, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchMove(info, { touches: [{ clientX: 100, clientY: 220 }] });
      fireEvent.touchEnd(info);
      expect(info).toBeInTheDocument();

      info.scrollTop = 0;
      fireEvent.touchStart(info, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchMove(info, { touches: [{ clientX: 100, clientY: 220 }] });
      expect(info).toHaveStyle({ transform: "translateY(120px)" });
      fireEvent.touchEnd(info);
      expect(screen.queryByRole("dialog", { name: "Информация о заведении" })).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });

  it("opens real published reviews from the rating without exposing private order data", async () => {
    nativeReplace(null, "", "/ru/venue/casa");
    vi.mocked(getPublicVenueReviews).mockResolvedValue([{ id: "review-1", rating: 5, body: "Отличная паста", owner_reply: "Спасибо!", created_at: "2026-09-20T10:00:00Z" }]);
    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    await screen.findByRole("heading", { name: "Casa Forma" });
    fireEvent.click(screen.getByRole("button", { name: "Открыть отзывы" }));
    const reviews = screen.getByRole("dialog", { name: "Рейтинг и отзывы" });
    expect(await within(reviews).findByText("Отличная паста")).toBeInTheDocument();
    expect(within(reviews).getByText("Спасибо!")).toBeInTheDocument();
    expect(within(reviews).getByText("Гость")).toBeInTheDocument();
    expect(getPublicVenueReviews).toHaveBeenCalledWith("casa", expect.any(AbortSignal));
    fireEvent.click(within(reviews).getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog", { name: "Рейтинг и отзывы" })).not.toBeInTheDocument();
  });

  it("opens each selected venue in the rich detail layout without mixing demo data", async () => {
    render(<SpotsApp initialScreen="discover" />);
    fireEvent.click(await screen.findByRole("button", { name: "Открыть North & Vine" }));
    expect(window.location.pathname).toBe("/ru/venue/north");
    expect(await screen.findByRole("heading", { name: "North & Vine" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Информация о заведении" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Назад", exact: true }));
    fireEvent.click(await screen.findByRole("button", { name: "Открыть Casa Forma" }));
    expect(window.location.pathname).toBe("/ru/venue/casa");
    expect(await screen.findByRole("heading", { name: "Casa Forma" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casa Forma" })).toBeInTheDocument();
    expect(getPublicVenue).toHaveBeenCalledWith("north", expect.any(AbortSignal));
    expect(getPublicVenue).toHaveBeenCalledWith("casa", expect.any(AbortSignal));
  });

  it("opens mobile booking from the bottom action and keeps the selection after closing", async () => {
    nativeReplace(null, "", "/ru/venue/casa");
    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    await screen.findByRole("heading", { name: "Casa Forma" });
    const open = screen.getByRole("button", { name: "Забронировать онлайн" });
    expect(screen.queryByText("Бронирование пока недоступно")).not.toBeInTheDocument();
    fireEvent.click(open);
    const booking = screen.getByRole("dialog", { name: "Бронирование" });
    expect(booking).toHaveAttribute("aria-modal", "true");
    expect(within(booking).getByRole("button", { name: "Выбрать дату" })).toBeInTheDocument();
    fireEvent.click(await within(booking).findByRole("button", { name: "19:00" }));
    fireEvent.change(within(booking).getByRole("textbox", { name: "Комментарий к ресторану" }), { target: { value: "Тихий стол" } });
    fireEvent.click(within(booking).getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog", { name: "Бронирование" })).not.toBeInTheDocument();
    await waitFor(() => expect(open).toHaveFocus());
    fireEvent.click(open);
    expect(within(screen.getByRole("dialog", { name: "Бронирование" })).getByRole("textbox", { name: "Комментарий к ресторану" })).toHaveValue("Тихий стол");
  });

  it("restores city, category, query and filter after reloading a venue deep link", async () => {
    localStorage.setItem("pocket:spots-city", "Братислава");
    nativeReplace(null, "", "/ru/restaurants?q=pasta&filter=Итальянская");
    const view = render(<SpotsApp initialScreen="restaurants" />);
    fireEvent.click(await screen.findByRole("button", { name: "Открыть Casa Forma" }));
    expect(window.location.pathname).toBe("/ru/venue/casa");
    expect(new URLSearchParams(window.location.search).get("from")).toContain("city=");
    await screen.findByRole("heading", { name: "Casa Forma" });
    view.unmount();
    localStorage.removeItem("pocket:spots-city");

    render(<SpotsApp initialScreen="venue" initialVenueId="casa" />);
    fireEvent.click(await screen.findByRole("button", { name: "Назад", exact: true }));
    expect(window.location.pathname).toBe("/ru/restaurants");
    expect(new URLSearchParams(window.location.search).get("q")).toBe("pasta");
    expect(new URLSearchParams(window.location.search).get("filter")).toBe("Итальянская");
    expect(localStorage.getItem("pocket:spots-city")).toBe("Братислава");
    expect(screen.getByRole("button", { name: "Выбрать город: Братислава" })).toBeInTheDocument();
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
    expect(window.location.pathname).toBe("/ru/venue/casa");
    expect(await screen.findByRole("heading", { name: "Casa Forma" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Назад", exact: true }));
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
