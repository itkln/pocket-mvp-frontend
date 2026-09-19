import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoverScreen, SavedPlacesScreen } from "./discover";
import { SpotsHeader } from "./navigation";
import { I18nProvider } from "../i18n";
import { spotCategories } from "./categories";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/ru/discover", useRouter: () => ({ replace }) }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
const defaults = { query: "", onVenue: vi.fn(), onReservation: vi.fn(), onCategoryChange: vi.fn(), onFilterChange: vi.fn() };
function FilterHarness() {
  const [filter, setFilter] = useState("Все");
  return <DiscoverScreen {...defaults} categorySlug="restaurants" filter={filter} onFilterChange={setFilter} />;
}

describe("Pocket Spots discovery", () => {
  it("shows all illustrated categories without a separate heading and navigates to their slugs", () => {
    const onCategoryChange = vi.fn();
    render(<DiscoverScreen {...defaults} onCategoryChange={onCategoryChange} />);
    expect(screen.queryByRole("heading", { name: "Категории" })).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Категории" });
    expect(within(nav).getAllByRole("button")).toHaveLength(8);
    expect(nav.querySelectorAll("img")).toHaveLength(8);
    expect(screen.queryByRole("region", { name: /Фильтры заведений/ })).not.toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("button", { name: "Спорт", exact: true }));
    expect(onCategoryChange).toHaveBeenCalledWith("sports");
  });

  it.each(spotCategories)("limits $slug to its own data and filters", ({ slug, label, filters }) => {
    render(<DiscoverScreen {...defaults} categorySlug={slug} />);
    expect(screen.getByRole("region", { name: label, exact: true })).toBeInTheDocument();
    for (const other of spotCategories.filter((item) => item.slug !== slug)) {
      expect(screen.queryByRole("region", { name: other.label, exact: true })).not.toBeInTheDocument();
    }
    const controls = screen.getByRole("region", { name: `Фильтры заведений: ${label}` });
    expect(within(controls).getAllByRole("button")).toHaveLength(filters.length + 1);
    for (const filter of filters) expect(within(controls).getByRole("button", { name: filter, exact: true })).toBeInTheDocument();
  });

  it("searches multiple words inside a category and never returns matches from another", () => {
    const view = render(<DiscoverScreen {...defaults} categorySlug="restaurants" query="Итальянский ресторан" />);
    expect(screen.getByRole("button", { name: "Открыть Casa Forma" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Открыть North & Vine" })).not.toBeInTheDocument();
    view.rerender(<DiscoverScreen {...defaults} categorySlug="sports" query="Casa Forma" />);
    expect(screen.getByText("В этой категории пока нет мест")).toBeInTheDocument();
    expect(screen.queryByText("Casa Forma")).not.toBeInTheDocument();
  });

  it("toggles contextual filters and resets them inside the existing dialog", () => {
    render(<FilterHarness />);
    const italian = screen.getByRole("button", { name: "Итальянская" });
    fireEvent.click(italian);
    expect(screen.queryByRole("button", { name: "Открыть North & Vine" })).not.toBeInTheDocument();
    fireEvent.click(italian);
    expect(screen.getByRole("button", { name: "Открыть North & Vine" })).toBeInTheDocument();
    fireEvent.click(italian);
    fireEvent.click(screen.getByRole("button", { name: "Фильтры", exact: true }));
    const dialog = screen.getByRole("dialog", { name: "Фильтры" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Сбросить" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Показать (6)" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not show Bratislava venues for a different city", () => {
    render(<DiscoverScreen {...defaults} city="Кошице" />);
    expect(screen.getByText("В этом городе пока нет заведений")).toBeInTheDocument();
    expect(screen.queryByText("North & Vine")).not.toBeInTheDocument();
  });

  it("opens photos but does not navigate when toggling favorites", () => {
    const onVenue = vi.fn();
    render(<DiscoverScreen {...defaults} onVenue={onVenue} onToggleSaved={vi.fn()} />);
    const favorite = screen.getAllByRole("button", { name: "В избранное" })[0];
    fireEvent.click(favorite);
    expect(onVenue).not.toHaveBeenCalled();
    expect(favorite).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Открыть North & Vine" }));
    expect(onVenue).toHaveBeenCalledOnce();
  });

  it("keeps availability labels below venue images", () => {
    render(<DiscoverScreen {...defaults} />);
    const card = screen.getByRole("button", { name: "Открыть North & Vine" }).closest(".venue-card");
    expect(card?.querySelector(".venue-card-image > span")).not.toBeInTheDocument();
    expect(card?.querySelector(".venue-card-copy .venue-card-tag")).toHaveTextContent("Стол через 20 мин");
  });

  it("uses the entertainment illustration for entertainment venues", () => {
    render(<DiscoverScreen {...defaults} categorySlug="entertainment" />);
    const card = screen.getByRole("button", { name: "Открыть Cinema Lumière" }).closest(".venue-card");
    const image = card?.querySelector<HTMLElement>(".illustrated-venue-image");
    expect(image).toBeInTheDocument();
    expect(image?.style.getPropertyValue("--venue-illustration")).toContain("/assets/categories/entertainment.png");
  });

  it("shows only saved venues and allows removing them", () => {
    const onToggleSaved = vi.fn();
    render(<SavedPlacesScreen savedPlaces={["Casa Forma"]} onToggleSaved={onToggleSaved} onVenue={vi.fn()} />);
    expect(screen.getByText("Casa Forma")).toBeInTheDocument();
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

  it("opens language selection as a modal on mobile", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(<I18nProvider initialLocale="ru"><SpotsHeader user={{ id: "test", email: "test@example.com", first_name: "Test", last_name: "User", role: "customer" }} screen="discover" city="Братислава" onCityChange={vi.fn()} searchQuery="" onSearch={vi.fn()} onNavigate={vi.fn()} onLogout={vi.fn()} /></I18nProvider>);
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
