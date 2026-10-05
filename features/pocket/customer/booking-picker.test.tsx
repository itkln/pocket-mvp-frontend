import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingPicker } from "./booking-picker";
import { I18nProvider } from "../i18n";
import { APIError } from "../../../lib/api-client";
import { createPublicReservation, getPublicVenueMenu, getVenueAvailability, type PublicMenuCategory } from "../../../lib/public-catalog-api";

vi.mock("../../../lib/public-catalog-api", async (original) => ({ ...await original<object>(), getVenueAvailability: vi.fn(), getPublicVenueMenu: vi.fn(), createPublicReservation: vi.fn() }));

const menu: PublicMenuCategory[] = [{ id: "food", name: "Еда", items: [{ id: "pasta", name: "Паста", price_minor: 1200, currency: "EUR", image_url: "/pasta.jpg" }] }];

const bookingDate = (() => { const value = new Date(); value.setUTCDate(value.getUTCDate() + 2); return value.toISOString().slice(0, 10); })();

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.mocked(createPublicReservation).mockReset();
  vi.mocked(getPublicVenueMenu).mockReset();
  vi.mocked(getVenueAvailability).mockImplementation(async (venueID, date, guests) => ({
    venue_id: venueID, date: date || bookingDate, timezone: "Europe/Bratislava", guests, duration_minutes: 120,
    slots: [{ time: "18:00", starts_at: `${bookingDate}T16:00:00Z`, ends_at: `${bookingDate}T18:00:00Z`, tables: [
      { id: "small", identifier: "01", seats: 2 }, { id: "large", identifier: "02", seats: 4 },
    ] }],
  }));
});

describe("BookingPicker", () => {
  it("separates day and evening slots at 18:00", async () => {
    vi.mocked(getVenueAvailability).mockImplementation(async (venueID, date, guests) => ({
      venue_id: venueID, date: date || bookingDate, timezone: "Europe/Bratislava", guests, duration_minutes: 120,
      slots: ["12:00", "17:30", "18:00", "20:00"].map((time) => ({
        time, starts_at: `${bookingDate}T12:00:00Z`, ends_at: `${bookingDate}T14:00:00Z`, tables: [],
      })),
    }));
    render(<I18nProvider initialLocale="ru"><BookingPicker venueID="venue-a" /></I18nProvider>);
    const day = await screen.findByRole("button", { name: "День" });
    const evening = screen.getByRole("button", { name: "Вечер" });
    expect(day).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "12:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "17:30" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "18:00" })).not.toBeInTheDocument();
    fireEvent.click(evening);
    expect(evening).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "17:30" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "18:00" }));
    expect(screen.getByRole("button", { name: "18:00" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(day);
    expect(screen.getByRole("button", { name: "12:00" })).toBeInTheDocument();
    fireEvent.click(evening);
    expect(screen.getByRole("button", { name: "18:00" })).toHaveAttribute("aria-pressed", "false");
  });

  it("opens an anchored date picker and closes it on an outside click", async () => {
    render(<I18nProvider initialLocale="ru"><BookingPicker venueID="venue-a" /></I18nProvider>);
    const trigger = await screen.findByRole("button", { name: "Выбрать дату" });
    await waitFor(() => expect(trigger).toBeEnabled());
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Выбор даты" })).toBeInTheDocument();
    expect(document.querySelector(".venue-dialog-backdrop")).not.toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Выбор даты" })).not.toBeInTheDocument();
  });

  it("offers booking wishes and keeps the comment while date, guests and time change", async () => {
    render(<I18nProvider initialLocale="ru"><BookingPicker venueID="venue-a" /></I18nProvider>);
    expect(screen.getByRole("heading", { name: "Бронирование" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Комментарий к ресторану" })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    const dateWish = screen.getByRole("button", { name: "Свидание" });
    fireEvent.click(dateWish);
    expect(dateWish).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "С детьми" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Комментарий к ресторану" }), { target: { value: "Нужен детский стул" } });
    expect(screen.getByRole("textbox", { name: "Комментарий к ресторану" })).toHaveValue("Нужен детский стул");
    expect(screen.queryByRole("button", { name: /Стол 01/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Не важен")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Увеличить количество гостей" }));
    await waitFor(() => expect(getVenueAvailability).toHaveBeenLastCalledWith("venue-a", bookingDate, 3, expect.any(AbortSignal)));
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    expect(screen.getByRole("button", { name: "Свидание" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "С детьми" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("textbox", { name: "Комментарий к ресторану" })).toHaveValue("Нужен детский стул");
    fireEvent.click(screen.getByRole("button", { name: "Свидание" }));
    expect(screen.getByRole("button", { name: "Свидание" })).toHaveAttribute("aria-pressed", "false");
  });

  it("saves contact, time and selected dishes as one reservation", async () => {
    vi.mocked(createPublicReservation).mockResolvedValue({ id: "reservation-1", code: "ABC123", starts_at: `${bookingDate}T16:00:00Z`, guest_count: 2, preorder_total_minor: 2400, currency: "EUR" });
    render(<I18nProvider initialLocale="ru"><BookingPicker venueID="venue-a" menu={menu} preorderEnabled /></I18nProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Анна Гость" } });
    fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+421900123456" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Комментарий к ресторану" }), { target: { value: "У окна" } });
    expect(screen.queryByRole("button", { name: "Добавить Паста" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    expect(screen.getByRole("img", { name: "Паста" }).parentElement).toHaveStyle({ backgroundImage: 'url("/pasta.jpg")' });
    expect(screen.queryByLabelText("Имя")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Добавить Паста" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить Паста" }));
    fireEvent.click(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByLabelText("Имя")).toHaveValue("Анна Гость");
    expect(screen.getByRole("textbox", { name: "Комментарий к ресторану" })).toHaveValue("У окна");
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    fireEvent.click(screen.getByRole("button", { name: /^Продолжить к оплате/ }));
    expect(createPublicReservation).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Подтверждение брони" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Забронировать" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledWith("venue-a", expect.objectContaining({
      starts_at: `${bookingDate}T16:00:00Z`, guests: 2, guest_name: "Анна Гость", guest_phone: "+421900123456", notes: "У окна",
      items: [{ menu_item_id: "pasta", quantity: 2, expected_price_minor: 1200 }], idempotency_key: expect.any(String),
    })));
    expect(await screen.findByText("Бронь подтверждена")).toBeInTheDocument();
    expect(screen.getByText("Номер брони: ABC123")).toBeInTheDocument();
  });

  it("can skip preorder after validating booking details", async () => {
    vi.mocked(createPublicReservation).mockResolvedValue({ id: "reservation-empty", code: "EMPTY", starts_at: `${bookingDate}T16:00:00Z`, guest_count: 2, preorder_total_minor: 0, currency: "EUR" });
    render(<I18nProvider initialLocale="ru"><BookingPicker venueID="venue-a" menu={menu} preorderEnabled /></I18nProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    expect(screen.getByRole("button", { name: "Продолжить" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Анна Гость" } });
    fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    expect(createPublicReservation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Забронировать без предзаказа" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenCalledWith("venue-a", expect.objectContaining({ items: [] })));
    expect(await screen.findByText("Номер брони: EMPTY")).toBeInTheDocument();
  });

  it("uses the venue menu grid and switches categories while keeping selected dishes", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const scrollTo = vi.fn();
    const categories = [...menu, { id: "desserts", name: "Десерты", items: [{ id: "cake", name: "Чизкейк", price_minor: 700, currency: "EUR", image_url: "/cake.jpg" }] }];
    render(<I18nProvider initialLocale="ru"><BookingPicker venueID="venue-a" menu={categories} preorderEnabled /></I18nProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Анна Гость" } });
    fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    const container = document.querySelector(".venue-booking-scroll")!;
    Object.defineProperty(container, "scrollTo", { value: scrollTo });
    const desserts = screen.getByRole("button", { name: "Десерты" });
    expect(screen.getByRole("navigation", { name: "Категории меню" })).toBeInTheDocument();
    expect(document.querySelectorAll(".mobile-preorder-menu .venue-public-menu-grid")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Убрать Паста" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Добавить Паста" }));
    fireEvent.click(desserts);
    expect(desserts).toHaveAttribute("aria-current", "location");
    expect(scrollTo).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Добавить Чизкейк" }));
    expect(screen.getByLabelText("Паста: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Чизкейк: 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Продолжить к оплате/ })).toHaveTextContent("19,00");
    fireEvent.click(screen.getByRole("button", { name: "Убрать Паста" }));
    expect(screen.queryByLabelText("Паста: 1")).not.toBeInTheDocument();
  });

  it("requires a second confirmation after the server reports a new price", async () => {
    vi.mocked(createPublicReservation).mockRejectedValueOnce(new APIError("price_changed", "Price changed", 409))
      .mockResolvedValueOnce({ id: "reservation-2", code: "DEF456", starts_at: `${bookingDate}T16:00:00Z`, guest_count: 2, preorder_total_minor: 1400, currency: "EUR" });
    vi.mocked(getPublicVenueMenu).mockResolvedValue([{ ...menu[0], items: [{ ...menu[0].items[0], price_minor: 1400 }] }]);
    render(<I18nProvider initialLocale="ru"><BookingPicker venueID="venue-a" menu={menu} preorderEnabled /></I18nProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Анна Гость" } });
    fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "+421900123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить Паста" }));
    fireEvent.click(screen.getByRole("button", { name: /^Продолжить к оплате/ }));
    expect(createPublicReservation).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Подтверждение брони" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Забронировать" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Цена изменилась");
    expect(createPublicReservation).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить новую сумму" }));
    await waitFor(() => expect(createPublicReservation).toHaveBeenLastCalledWith("venue-a", expect.objectContaining({
      items: [{ menu_item_id: "pasta", quantity: 1, expected_price_minor: 1400 }],
    })));
    expect(await screen.findByText("Номер брони: DEF456")).toBeInTheDocument();
  });
});
