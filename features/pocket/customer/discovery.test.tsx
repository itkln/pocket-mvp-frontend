import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoverScreen, SavedPlacesScreen } from "./discover";
import { SpotsHeader } from "./navigation";
import { I18nProvider } from "../i18n";
import { spotCategories } from "./categories";
import { listPublicVenues, type PublicVenue, type PublicVenueSearch } from "../../../lib/public-catalog-api";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/ru/discover", useRouter: () => ({ replace }) }));
vi.mock("../../../lib/public-catalog-api", async (original) => ({ ...await original<object>(), listPublicVenues: vi.fn() }));

const venue = (id: string, name: string, category: string, cuisine: string, filters: string[] = [], image = ""): PublicVenue => ({
  id, slug: id, name, category_slug: category, cuisine_type: cuisine, address: "Dunajská 12", city: "Bratislava", country_code: "SK",
  image_url: image, rating: 4.8, review_count: 12, tags: [name === "North & Vine" ? "Стол через 20 мин" : "Открыто сейчас"], filters,
  preorder_enabled: filters.includes("С предзаказом"), created_at: "2026-09-19T00:00:00Z",
});
const catalogVenues = [
  venue("north", "North & Vine", "restaurants", "Европейская", ["Лучшие", "Открыто"]),
  venue("casa", "Casa Forma", "restaurants", "Итальянская", ["Итальянская", "Открыто"]),
  venue("mizu", "Mizu Table", "restaurants", "Азиатская", ["Азиатская", "С предзаказом"]),
  venue("basil", "Basil & Stone", "restaurants", "Средиземноморская"),
  venue("morning", "Morning Lab", "restaurants", "Завтраки", ["Завтраки"]),
  venue("cafe", "Café Dunaj", "restaurants", "Кофе и десерты", ["Кофе и десерты"]),
  venue("cinema", "Cinema Lumière", "entertainment", "Кино", ["Кино"]),
  venue("walks", "Danube Walks", "activities", "Экскурсии", ["Экскурсии"]),
  venue("gym", "Urban Gym", "sports", "Тренажёрный зал", ["Тренажёрный зал"]),
  venue("yoga", "Still Yoga", "yoga-pilates", "Йога", ["Йога"]),
  venue("spa", "Quiet Touch", "spa-massage", "Расслабляющий массаж", ["Расслабляющий"]),
  venue("beauty", "Old Town Barber", "beauty", "Стрижка", ["Стрижка"]),
  venue("clay", "Clay House", "masterclasses", "Керамика", ["Керамика"]),
];

const catalogResponse = (search: PublicVenueSearch = {}) => {
  let items = search.city === "Кошице" ? [] : catalogVenues;
  if (search.category) items = items.filter((item) => item.category_slug === search.category);
  if (search.query) {
    const query = search.query.toLocaleLowerCase();
    items = items.filter((item) => `${item.name} ${item.cuisine_type}`.toLocaleLowerCase().includes(query.includes("итальян") ? "итальян" : query));
  }
  if (search.filter && search.filter !== "Все") items = items.filter((item) => item.filters.includes(search.filter!));
  return Promise.resolve({ venues: items, page: search.page ?? 1, page_size: 24, total: items.length, total_pages: items.length ? 1 : 0, has_next: false });
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.mocked(listPublicVenues).mockImplementation(catalogResponse);
});
const defaults = { query: "", onVenue: vi.fn(), onReservation: vi.fn(), onCategoryChange: vi.fn(), onFilterChange: vi.fn() };
function FilterHarness() {
  const [filter, setFilter] = useState("Все");
  return <DiscoverScreen {...defaults} categorySlug="restaurants" filter={filter} onFilterChange={setFilter} />;
}

describe("Pocket Spots discovery", () => {
  it("shows all illustrated categories without a separate heading and navigates to their slugs", async () => {
    const onCategoryChange = vi.fn();
    render(<DiscoverScreen {...defaults} onCategoryChange={onCategoryChange} />);
    expect(screen.queryByRole("heading", { name: "Категории" })).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Категории" });
    expect(within(nav).getAllByRole("button")).toHaveLength(8);
    expect(nav.querySelectorAll("img")).toHaveLength(8);
    expect(screen.queryByRole("region", { name: /Фильтры заведений/ })).not.toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("button", { name: "Спорт", exact: true }));
    expect(onCategoryChange).toHaveBeenCalledWith("sports");
    expect(await screen.findByRole("button", { name: "Открыть North & Vine" })).toBeInTheDocument();
  });

  it.each(spotCategories)("limits $slug to its own data and filters", async ({ slug, label, filters }) => {
    render(<DiscoverScreen {...defaults} categorySlug={slug} />);
    const category = await screen.findByRole("region", { name: label, exact: true });
    expect(category).toBeInTheDocument();
    expect(within(category).queryByRole("heading", { name: label, exact: true })).not.toBeInTheDocument();
    for (const other of spotCategories.filter((item) => item.slug !== slug)) {
      expect(screen.queryByRole("region", { name: other.label, exact: true })).not.toBeInTheDocument();
    }
    const controls = screen.getByRole("region", { name: `Фильтры заведений: ${label}` });
    expect(within(controls).getAllByRole("button")).toHaveLength(filters.length + 1);
    for (const filter of filters) expect(within(controls).getByRole("button", { name: filter, exact: true })).toBeInTheDocument();
  });

  it("passes search and category to the public API and never renders another category", async () => {
    const view = render(<DiscoverScreen {...defaults} categorySlug="restaurants" query="Итальянский ресторан" />);
    expect(await screen.findByRole("button", { name: "Открыть Casa Forma" })).toBeInTheDocument();
    expect(listPublicVenues).toHaveBeenCalledWith(expect.objectContaining({ category: "restaurants", query: "Итальянский ресторан" }), expect.any(AbortSignal));
    expect(screen.queryByRole("button", { name: "Открыть North & Vine" })).not.toBeInTheDocument();
    view.rerender(<DiscoverScreen {...defaults} categorySlug="sports" query="Casa Forma" />);
    expect(await screen.findByText("В этой категории пока нет мест")).toBeInTheDocument();
    expect(screen.queryByText("Ничего не нашли")).not.toBeInTheDocument();
    expect(screen.queryByText("В этом городе пока нет заведений")).not.toBeInTheDocument();
    expect(screen.queryByText("Casa Forma")).not.toBeInTheDocument();
  });

  it("toggles contextual server filters and resets them inside the existing dialog", async () => {
    render(<FilterHarness />);
    await screen.findByRole("button", { name: "Открыть North & Vine" });
    fireEvent.click(screen.getByRole("button", { name: "Итальянская" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Открыть North & Vine" })).not.toBeInTheDocument());
    expect(listPublicVenues).toHaveBeenLastCalledWith(expect.objectContaining({ filter: "Итальянская" }), expect.any(AbortSignal));
    fireEvent.click(screen.getByRole("button", { name: "Итальянская" }));
    expect(await screen.findByRole("button", { name: "Открыть North & Vine" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Итальянская" }));
    await screen.findByRole("button", { name: "Открыть Casa Forma" });
    fireEvent.click(screen.getByRole("button", { name: "Фильтры", exact: true }));
    const dialog = screen.getByRole("dialog", { name: "Фильтры" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Сбросить" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Показать/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses the selected city for server filtering", async () => {
    render(<DiscoverScreen {...defaults} city="Кошице" />);
    expect(await screen.findByText("В этом городе пока нет заведений")).toBeInTheDocument();
    expect(listPublicVenues).toHaveBeenCalledWith(expect.objectContaining({ city: "Кошице" }), expect.any(AbortSignal));
    expect(screen.queryByText("North & Vine")).not.toBeInTheDocument();
  });

  it("shows loading and recovers from a catalog error", async () => {
    vi.mocked(listPublicVenues).mockRejectedValueOnce(new Error("offline"));
    render(<DiscoverScreen {...defaults} />);
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем заведения...");
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить заведения");
    vi.mocked(listPublicVenues).mockImplementation(catalogResponse);
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByRole("button", { name: "Открыть North & Vine" })).toBeInTheDocument();
  });

  it("requests the next server page from pagination controls", async () => {
    vi.mocked(listPublicVenues).mockImplementation((search = {}) => Promise.resolve({
      venues: [search.page === 2 ? catalogVenues[1] : catalogVenues[0]], page: search.page ?? 1, page_size: 1,
      total: 2, total_pages: 2, has_next: (search.page ?? 1) === 1,
    }));
    render(<DiscoverScreen {...defaults} categorySlug="restaurants" />);
    await screen.findByRole("button", { name: "Открыть North & Vine" });
    fireEvent.click(screen.getByRole("button", { name: "Далее" }));
    expect(await screen.findByRole("button", { name: "Открыть Casa Forma" })).toBeInTheDocument();
    expect(listPublicVenues).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal));
  });

  it("opens photos but does not navigate when toggling favorites", async () => {
    const onVenue = vi.fn();
    render(<DiscoverScreen {...defaults} onVenue={onVenue} onToggleSaved={vi.fn()} />);
    const favorite = (await screen.findAllByRole("button", { name: "В избранное" }))[0];
    fireEvent.click(favorite);
    expect(onVenue).not.toHaveBeenCalled();
    expect(favorite).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Открыть North & Vine" }));
    expect(onVenue).toHaveBeenCalledOnce();
  });

  it("keeps availability labels below venue images", async () => {
    render(<DiscoverScreen {...defaults} />);
    const card = (await screen.findByRole("button", { name: "Открыть North & Vine" })).closest(".venue-card");
    expect(card?.querySelector(".venue-card-image > span")).not.toBeInTheDocument();
    expect(card?.querySelector(".venue-card-copy .venue-card-tag")).toHaveTextContent("Стол через 20 мин");
  });

  it("uses the entertainment illustration for entertainment venues", async () => {
    render(<DiscoverScreen {...defaults} categorySlug="entertainment" />);
    const card = (await screen.findByRole("button", { name: "Открыть Cinema Lumière" })).closest(".venue-card");
    const image = card?.querySelector<HTMLElement>(".illustrated-venue-image");
    expect(image).toBeInTheDocument();
    expect(image?.style.getPropertyValue("--venue-illustration")).toContain("/assets/categories/entertainment.png");
  });

  it("shows only saved venues from the API and allows removing them", async () => {
    const onToggleSaved = vi.fn();
    render(<SavedPlacesScreen savedPlaces={["Casa Forma"]} onToggleSaved={onToggleSaved} onVenue={vi.fn()} />);
    expect(await screen.findByText("Casa Forma")).toBeInTheDocument();
    expect(screen.queryByText("North & Vine")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Убрать из избранного" }));
    expect(onToggleSaved).toHaveBeenCalledWith("Casa Forma");
  });

  it("searches and selects a city, with no cart button in the header", () => {
    const onCityChange = vi.fn();
    render(<SpotsHeader user={{ id: "test", email: "test@example.com", first_name: "Test", last_name: "User", role: "customer" }} screen="discover" city="Братислава" onCityChange={onCityChange} searchQuery="" onSearch={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Корзина/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pocket Spots, главная" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Выбрать город: Братислава" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Найти город" }), { target: { value: "кош" } });
    fireEvent.click(screen.getByRole("button", { name: "Кошице", exact: true }));
    expect(onCityChange).toHaveBeenCalledWith("Кошице");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens account destinations, closes on Escape and outside click, and signs out", () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();
    render(<SpotsHeader user={{ id: "test", email: "test@example.com", first_name: "Test", last_name: "User", role: "customer" }} screen="discover" city="Братислава" onCityChange={vi.fn()} searchQuery="" onSearch={vi.fn()} onNavigate={onNavigate} onLogout={onLogout} />);
    const trigger = screen.getByRole("button", { name: "Меню аккаунта" });
    for (const [label, route] of [["Личные данные", "profile"], ["Мои брони", "reservations"], ["Сохранённые места", "saved"], ["Уведомления", "notifications"], ["Безопасность", "settings"]]) {
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole("menuitem", { name: label }));
      expect(onNavigate).toHaveBeenLastCalledWith(route);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    }
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Выйти" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });


  it("switches the language and preserves the current route", () => {
    render(<I18nProvider initialLocale="ru"><SpotsHeader user={{ id: "test", email: "test@example.com", first_name: "Test", last_name: "User", role: "customer" }} screen="discover" city="Братислава" onCityChange={vi.fn()} searchQuery="" onSearch={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()} /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса", exact: true }));
    fireEvent.click(screen.getByRole("menuitem", { name: "English", exact: true }));
    expect(replace).toHaveBeenCalledWith("/en/discover");
    expect(screen.getByRole("textbox", { name: "Find a place or service" })).toBeInTheDocument();
    expect(localStorage.getItem("pocket:locale")).toBe("en");
    expect(screen.queryByRole("menu", { name: "Interface language" })).not.toBeInTheDocument();
  });

  it("keeps the previous language modal for authenticated mobile users", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(<I18nProvider initialLocale="ru"><SpotsHeader user={{ id: "test", email: "test@example.com", first_name: "Test", last_name: "User", role: "customer" }} screen="discover" city="Братислава" onCityChange={vi.fn()} searchQuery="" onSearch={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()} /></I18nProvider>);
    expect(screen.queryByRole("button", { name: "Открыть меню" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса", exact: true }));
    const dialog = screen.getByRole("dialog", { name: "Язык интерфейса" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "English", exact: true }));
    expect(replace).toHaveBeenCalledWith("/en/discover");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("adds a header shadow only after scrolling", () => {
    render(<SpotsHeader user={{ id: "test", email: "test@example.com", first_name: "Test", last_name: "User", role: "customer" }} screen="discover" city="Братислава" onCityChange={vi.fn()} searchQuery="" onSearch={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()} />);
    const header = screen.getByRole("banner");
    expect(header).not.toHaveClass("scrolled");
    Object.defineProperty(window, "scrollY", { configurable: true, value: 20 });
    fireEvent.scroll(window);
    expect(header).toHaveClass("scrolled");
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    fireEvent.scroll(window);
  });
});
