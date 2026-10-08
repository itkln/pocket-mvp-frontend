import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicVenue, getPublicVenueMenu, getSavedPublicReservation, getVenueAvailability, type PublicMenuCategory, type PublicVenue } from "../../../lib/public-catalog-api";
import { I18nProvider } from "../i18n";
import { VenueDetailsScreen } from "./venue-details";

vi.mock("../../../lib/public-catalog-api", async (original) => ({ ...await original<object>(), getPublicVenue: vi.fn(), getPublicVenueMenu: vi.fn(), getSavedPublicReservation: vi.fn(), getVenueAvailability: vi.fn() }));
const date = (() => { const value = new Date(); value.setUTCDate(value.getUTCDate() + 2); return value.toISOString().slice(0, 10); })();
const menu: PublicMenuCategory[] = [
  { id: "food", name: "Еда", preorder_enabled: true, items: [{ id: "pasta", name: "Паста", price_minor: 1200, currency: "EUR" }] },
  { id: "drinks", name: "Напитки", preorder_enabled: false, items: [{ id: "tea", name: "Чай", price_minor: 300, currency: "EUR" }] },
];
beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(getPublicVenue).mockResolvedValue({ id: "venue-a", name: "Demo Bistro", category_slug: "restaurants", address: "Main 1", city: "Bratislava", tags: [], filters: [], preorder_enabled: true } as unknown as PublicVenue);
  vi.mocked(getPublicVenueMenu).mockResolvedValue(menu);
  vi.mocked(getSavedPublicReservation).mockResolvedValue(null);
  vi.mocked(getVenueAvailability).mockImplementation(async (venueID, selectedDate, guests) => ({
    venue_id: venueID, date: selectedDate || date, timezone: "Europe/Bratislava", guests, duration_minutes: 120,
    slots: [{ time: "18:00", starts_at: `${date}T16:00:00Z`, ends_at: `${date}T18:00:00Z`, tables: [] }],
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("VenueDetailsScreen preorder categories", () => {
  it("keeps ordinary menu and dish information intact, filters preorder and permits removing newly disabled dishes", async () => {
    render(<I18nProvider initialLocale="ru"><VenueDetailsScreen venueID="venue-a" onBack={vi.fn()} saved={false} /></I18nProvider>);
    expect(await screen.findByRole("button", { name: "Напитки" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Подробнее о блюде: Чай" }));
    expect(screen.getByRole("dialog", { name: "Чай" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Чай" })).getByRole("button", { name: "Закрыть" }));
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Забронировать", exact: true }));
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Anna Guest" } });
    fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    const preorder = screen.getByRole("dialog", { name: "Меню для предзаказа" });
    expect(within(preorder).getByRole("button", { name: "Еда" })).toHaveAttribute("aria-current", "location");
    expect(within(preorder).queryByRole("button", { name: "Напитки" })).not.toBeInTheDocument();
    expect(within(preorder).queryByRole("button", { name: "Подробнее о блюде: Чай" })).not.toBeInTheDocument();
    fireEvent.click(within(preorder).getByRole("button", { name: "Добавить Паста" }));
    vi.mocked(getPublicVenueMenu).mockResolvedValue([{ ...menu[0], preorder_enabled: false }, menu[1]]);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(within(preorder).getByText("Блюдо недоступно · 1")).toBeInTheDocument());
    expect(within(preorder).getByRole("button", { name: /^Продолжить к оплате/ })).toBeDisabled();
    fireEvent.click(within(preorder).getByRole("button", { name: "Убрать", exact: true }));
    expect(within(preorder).getByRole("button", { name: "Забронировать без предзаказа" })).toBeEnabled();
    fireEvent.click(within(preorder).getByRole("button", { name: "Назад к бронированию" }));
    expect(screen.getByLabelText("Имя")).toHaveValue("Anna Guest");
    expect(screen.getByRole("button", { name: "Напитки" })).toBeInTheDocument();
  });
});
