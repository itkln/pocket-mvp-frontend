import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { VenueHome } from "./venue-home";
import { getPublicVenue, getPublicVenueMenu, type PublicVenue } from "../../../lib/public-catalog-api";
vi.mock("../../../lib/public-catalog-api", () => ({ getPublicVenue: vi.fn(), getPublicVenueMenu: vi.fn() }));
beforeEach(() => {
  vi.mocked(getPublicVenue).mockResolvedValue({ id: "cafe", name: "Demo Bistro", address: "Main 12", city: "Bratislava", description: "Наш ресторан", review_count: 4, rating: 4.3, filters: [], tags: [] } as unknown as PublicVenue);
  vi.mocked(getPublicVenueMenu).mockResolvedValue([{ id: "breakfast", name: "Завтраки", items: [{ id: "dish", name: "Паста", price_minor: 1000, currency: "EUR" }] }]);
});
it("opens menu categories and reservations from a restaurant front page", async () => {
  const onSettings = vi.fn(), onAccount = vi.fn();
  render(<I18nProvider initialLocale="ru"><VenueHome venueID="cafe" basePath="/ru/r/cafe" onSettings={onSettings} onAccount={onAccount}/></I18nProvider>);
  expect(await screen.findByRole("heading", { name: "Demo Bistro" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Завтраки" })).toHaveAttribute("href", "/ru/r/cafe/menu?category=breakfast");
  expect(screen.getByRole("link", { name: "Забронировать онлайн" })).toHaveAttribute("href", "/ru/r/cafe/reservation");
  expect(screen.getByRole("link", { name: "Поиск по меню" })).toHaveAttribute("href", "/ru/r/cafe/menu?search=1");
  fireEvent.click(screen.getByText("Информация о заведении"));
  expect(screen.getByText("Наш ресторан").closest("details")).toHaveAttribute("open");
  fireEvent.click(screen.getByRole("button", { name: "Настройки меню" }));
  expect(onSettings).toHaveBeenCalledWith("menu");
  fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса" }));
  expect(onSettings).toHaveBeenCalledWith("language");
  fireEvent.click(screen.getByRole("button", { name: "Профиль" }));
  expect(onAccount).toHaveBeenCalledOnce();
});
it("keeps restaurant information and booking available when the menu fails", async () => {
  vi.mocked(getPublicVenueMenu).mockRejectedValue(new Error("offline"));
  render(<I18nProvider initialLocale="ru"><VenueHome venueID="cafe" basePath="/ru/r/cafe" onSettings={vi.fn()} onAccount={vi.fn()}/></I18nProvider>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить меню");
  expect(screen.getByRole("link", { name: "Забронировать онлайн" })).toBeInTheDocument();
});
