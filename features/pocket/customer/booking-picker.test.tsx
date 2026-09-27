import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingPicker } from "./booking-picker";
import { I18nProvider } from "../i18n";
import { getVenueAvailability } from "../../../lib/public-catalog-api";

vi.mock("../../../lib/public-catalog-api", async (original) => ({ ...await original<object>(), getVenueAvailability: vi.fn() }));

const bookingDate = (() => { const value = new Date(); value.setUTCDate(value.getUTCDate() + 2); return value.toISOString().slice(0, 10); })();

beforeEach(() => {
  vi.mocked(getVenueAvailability).mockImplementation(async (venueID, date, guests) => ({
    venue_id: venueID, date: date || bookingDate, timezone: "Europe/Bratislava", guests, duration_minutes: 120,
    floors: [{ id: "floor-a", name: "Основной зал", fixtures: [], tables: [
      { id: "small", identifier: "01", seats: 2, shape: "rectangle", x: 15, y: 15, width: 10, height: 10 },
      { id: "large", identifier: "02", seats: 4, shape: "rectangle", x: 45, y: 15, width: 10, height: 10 },
      { id: "busy", identifier: "03", seats: 4, shape: "rectangle", x: 70, y: 15, width: 10, height: 10 },
    ] }],
    slots: [{ time: "18:00", starts_at: `${bookingDate}T16:00:00Z`, ends_at: `${bookingDate}T18:00:00Z`, tables: guests <= 2 ? [
      { id: "small", identifier: "01", seats: 2 }, { id: "large", identifier: "02", seats: 4 },
    ] : [{ id: "large", identifier: "02", seats: 4 }] }],
  }));
});

describe("BookingPicker", () => {
  it("keeps date, guests, time and a server table in one selection", async () => {
    render(<I18nProvider initialLocale="ru"><BookingPicker venueID="venue-a" venueName="North & Vine" /></I18nProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Не важен");
    fireEvent.click(screen.getByRole("button", { name: "Не важен" }));
    expect(screen.getByRole("dialog", { name: "Выбрать стол" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Стол 03/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Стол 01/ }));
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("North & Vine");
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Стол 01");
    fireEvent.click(screen.getByRole("button", { name: "Увеличить количество гостей" }));
    fireEvent.click(screen.getByRole("button", { name: "Увеличить количество гостей" }));
    await waitFor(() => expect(getVenueAvailability).toHaveBeenLastCalledWith("venue-a", bookingDate, 4, expect.any(AbortSignal)));
    fireEvent.click(await screen.findByRole("button", { name: "18:00" }));
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Не важен");
    fireEvent.click(screen.getByRole("button", { name: "Не важен" }));
    expect(screen.getByRole("button", { name: /Стол 01/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Стол 02/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Стол 02/ }));
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Стол 02");
    fireEvent.click(screen.getByRole("button", { name: "Стол 02" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Выбрать стол" })).getByRole("button", { name: /Не важен/ }));
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Не важен");
  });
});
