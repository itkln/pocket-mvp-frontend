import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../../lib/auth-api";
import { createPublicReservation, getPublicVenueMenu, getVenueAvailability, type PublicMenuCategory } from "../../../lib/public-catalog-api";
import { I18nProvider } from "../i18n";
import { DesktopBookingFlow } from "./desktop-booking-flow";

vi.mock("../../../lib/public-catalog-api", async (original) => ({ ...await original<object>(), getVenueAvailability: vi.fn(), getPublicVenueMenu: vi.fn(), createPublicReservation: vi.fn() }));

const date = (() => { const value = new Date(); value.setUTCDate(value.getUTCDate() + 2); return value.toISOString().slice(0, 10); })();
const menu: PublicMenuCategory[] = [{ id: "mains", name: "Основные блюда", items: [{ id: "pasta", name: "Паста", price_minor: 1200, currency: "EUR" }] }];
const account: AuthUser = { id: "user-1", email: "guest@example.test", first_name: "Anna", last_name: "Guest", role: "customer", capabilities: ["customer"] };

beforeEach(() => {
  vi.mocked(createPublicReservation).mockReset();
  vi.mocked(getPublicVenueMenu).mockReset();
  vi.mocked(getVenueAvailability).mockImplementation(async (venueID, selectedDate, guests) => ({
    venue_id: venueID, date: selectedDate || date, timezone: "Europe/Bratislava", guests, duration_minutes: 120,
    slots: [{ time: "18:00", starts_at: `${date}T16:00:00Z`, ends_at: `${date}T18:00:00Z`, tables: [{ id: "table-1", identifier: "1", seats: 2 }] }],
  }));
  vi.mocked(createPublicReservation).mockResolvedValue({ id: "reservation-1", code: "BOOK123", starts_at: `${date}T16:00:00Z`, guest_count: 2, preorder_total_minor: 0, currency: "EUR" });
});

const renderFlow = (user: AuthUser | null = null) => render(<I18nProvider initialLocale="ru"><DesktopBookingFlow venueID="venue-1" venueName="Demo Bistro" menu={menu} preorderEnabled user={user} /></I18nProvider>);
const chooseTime = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
  fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
};

describe("DesktopBookingFlow", () => {
  it("books without a pre-order using account details without asking for contacts", async () => {
    renderFlow(account);
    await chooseTime();
    expect(screen.getByText("В предзаказе пока пусто")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Забронировать без предзаказа" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledOnce());
    expect(screen.queryByRole("textbox", { name: "Имя" })).not.toBeInTheDocument();
    expect(vi.mocked(createPublicReservation).mock.calls[0][1]).toMatchObject({ items: [], guest_name: "", guest_email: "", guest_phone: "" });
    expect(await screen.findByText(/Номер брони: BOOK123/)).toBeInTheDocument();
  });

  it("collects a guest name and email before booking without dishes", async () => {
    renderFlow();
    await chooseTime();
    fireEvent.click(screen.getByRole("button", { name: "Забронировать без предзаказа" }));
    expect(createPublicReservation).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Guest Name" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Эл. почта" }), { target: { value: "guest@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Забронировать без предзаказа" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledOnce());
    expect(vi.mocked(createPublicReservation).mock.calls[0][1]).toMatchObject({ guest_name: "Guest Name", guest_email: "guest@example.test", items: [] });
  });

  it("opens only the menu in a left drawer, then shows review and payment details", async () => {
    vi.mocked(createPublicReservation).mockResolvedValue({ id: "reservation-2", code: "FOOD123", starts_at: `${date}T16:00:00Z`, guest_count: 2, preorder_total_minor: 1200, currency: "EUR" });
    renderFlow();
    await chooseTime();
    fireEvent.click(screen.getByRole("button", { name: "Добавить блюда" }));
    expect(screen.getByRole("dialog", { name: "Меню для предзаказа" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Добавить Паста" }));
    fireEvent.click(screen.getByRole("button", { name: /Готово/ }));
    fireEvent.click(screen.getByRole("button", { name: /Далее.*12/ }));
    expect(screen.getByText("Оплата в заведении")).toBeInTheDocument();
    expect(createPublicReservation).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Guest Name" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Эл. почта" }), { target: { value: "guest@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить бронь и предзаказ" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledOnce());
    expect(vi.mocked(createPublicReservation).mock.calls[0][1].items).toEqual([{ menu_item_id: "pasta", quantity: 1, expected_price_minor: 1200 }]);
  });
});
