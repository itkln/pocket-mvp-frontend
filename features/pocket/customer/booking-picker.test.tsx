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
