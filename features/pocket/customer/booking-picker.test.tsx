import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingPicker } from "./booking-picker";
import { I18nProvider } from "../i18n";
import { getVenueAvailability } from "../../../lib/public-catalog-api";

vi.mock("../../../lib/public-catalog-api", async (original) => ({ ...await original<object>(), getVenueAvailability: vi.fn() }));

const bookingDate = (() => { const value = new Date(); value.setUTCDate(value.getUTCDate() + 2); return value.toISOString().slice(0, 10); })();

beforeEach(() => {
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
});
