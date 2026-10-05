import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../../lib/auth-api";
import { createPublicReservation, getPublicVenueMenu, getVenueAvailability, type PublicMenuCategory } from "../../../lib/public-catalog-api";
import { I18nProvider } from "../i18n";
import { DesktopBookingFlow, type DesktopBookingFlowHandle } from "./desktop-booking-flow";

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

const renderFlow = (user: AuthUser | null = null, quantities: Record<string, number> = {}, onMenuModeChange = vi.fn(), ref = createRef<DesktopBookingFlowHandle>()) => render(<I18nProvider initialLocale="ru"><DesktopBookingFlow ref={ref} venueID="venue-1" venueName="Demo Bistro" menu={menu} preorderEnabled user={user} quantities={quantities} onQuantityChange={vi.fn()} menuModeOpen={false} onMenuModeChange={onMenuModeChange} onMenuUpdated={vi.fn()} onConfirmationClose={vi.fn()} /></I18nProvider>);
const chooseTime = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
  fireEvent.click(screen.getByRole("button", { name: "Забронировать" }));
};

describe("DesktopBookingFlow", () => {
  it("uses editable booking contacts for a signed-in user", async () => {
    const ref = createRef<DesktopBookingFlowHandle>();
    const onMenuModeChange = vi.fn();
    renderFlow(account, {}, onMenuModeChange, ref);
    await chooseTime();
    expect(screen.getByRole("dialog", { name: "Бронирование" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Имя" })).toHaveValue("Anna Guest");
    expect(screen.getByRole("textbox", { name: "Эл. почта (необязательно)" })).toHaveValue("guest@example.test");
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Other Guest" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Телефон" }), { target: { value: "+421900123456" } });
    expect(screen.queryByRole("button", { name: "Свидание" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Комментарий к ресторану" }), { target: { value: "Тихий столик" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    expect(onMenuModeChange).toHaveBeenCalledWith(true);
    ref.current?.bookWithoutPreorder();
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledOnce());
    expect(vi.mocked(createPublicReservation).mock.calls[0][1]).toMatchObject({ items: [], guest_name: "Other Guest", guest_email: "guest@example.test", guest_phone: "+421900123456", notes: "Тихий столик" });
    expect(await screen.findByText(/Номер брони: BOOK123/)).toBeInTheDocument();
  });

  it("collects a guest name and phone before booking without dishes", async () => {
    const ref = createRef<DesktopBookingFlowHandle>();
    renderFlow(null, {}, vi.fn(), ref);
    await chooseTime();
    expect(screen.getByRole("button", { name: "Продолжить" })).toBeDisabled();
    expect(createPublicReservation).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Guest Name" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Телефон" }), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    ref.current?.bookWithoutPreorder();
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledOnce());
    expect(vi.mocked(createPublicReservation).mock.calls[0][1]).toMatchObject({ guest_name: "Guest Name", guest_email: "", guest_phone: "+421900123456", items: [] });
  });

  it("opens the existing menu for selection, then shows review and payment details", async () => {
    vi.mocked(createPublicReservation).mockResolvedValue({ id: "reservation-2", code: "FOOD123", starts_at: `${date}T16:00:00Z`, guest_count: 2, preorder_total_minor: 1200, preorder_order_number: 42, currency: "EUR" });
    const onMenuModeChange = vi.fn();
    const ref = createRef<DesktopBookingFlowHandle>();
    const { rerender } = renderFlow(null, {}, onMenuModeChange, ref);
    await chooseTime();
    fireEvent.change(screen.getByRole("textbox", { name: "Имя" }), { target: { value: "Guest Name" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Телефон" }), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    expect(onMenuModeChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog", { name: "Меню для предзаказа" })).not.toBeInTheDocument();
    rerender(<I18nProvider initialLocale="ru"><DesktopBookingFlow ref={ref} venueID="venue-1" venueName="Demo Bistro" menu={menu} preorderEnabled user={null} quantities={{ pasta: 1 }} onQuantityChange={vi.fn()} menuModeOpen={false} onMenuModeChange={onMenuModeChange} onMenuUpdated={vi.fn()} onConfirmationClose={vi.fn()} /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: /^Продолжить к оплате/ }));
    expect(screen.getByRole("dialog", { name: "Подтверждение брони" })).toHaveClass("checkout-open");
    expect(screen.getByText("Оплата в заведении")).toBeInTheDocument();
    expect(createPublicReservation).not.toHaveBeenCalled();
    expect(screen.getByText("Guest Name")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Назад" }));
    expect(onMenuModeChange).toHaveBeenLastCalledWith(true);
    expect(createPublicReservation).not.toHaveBeenCalled();
    act(() => ref.current?.checkout());
    fireEvent.click(screen.getByRole("button", { name: "Забронировать" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledOnce());
    expect(vi.mocked(createPublicReservation).mock.calls[0][1].items).toEqual([{ menu_item_id: "pasta", quantity: 1, expected_price_minor: 1200 }]);
    expect(await screen.findByText("Номер предзаказа: 42")).toBeInTheDocument();
  });
});
