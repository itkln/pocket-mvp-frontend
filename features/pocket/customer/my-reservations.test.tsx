import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCustomerReservations, type CustomerReservation } from "../../../lib/reservations-api";
import { I18nProvider } from "../i18n";
import { MyReservationsScreen } from "./my-reservations";

vi.mock("../../../lib/reservations-api", () => ({ listCustomerReservations: vi.fn() }));
const booking: CustomerReservation = {
  id: "booking-1", code: "BOOK123", venue_id: "venue-1", venue_name: "Demo Bistro",
  venue_address: "Main 1", venue_city: "Bratislava", timezone: "Europe/Bratislava",
  starts_at: "2099-10-05T18:00:00Z", ends_at: "2099-10-05T20:00:00Z", guest_count: 3,
  status: "confirmed", guest_name: "Other Guest", guest_phone: "+421900123456", guest_email: "other@example.test",
  notes: "У окна", preorder_total_minor: 2400, preorder_order_number: 42, currency: "EUR",
  preorder_items: [{ name: "Паста", quantity: 2, unit_price_minor: 1200 }],
};
function mount(onVenue = vi.fn()) {
  return render(<I18nProvider initialLocale="ru"><MyReservationsScreen onVenue={onVenue} onDiscover={vi.fn()} /></I18nProvider>);
}
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });

describe("my reservations", () => {
  it("shows saved contacts, comments and preorder snapshots in the venue timezone", async () => {
    vi.mocked(listCustomerReservations).mockResolvedValue([booking]);
    const onVenue = vi.fn();
    const view = mount(onVenue);
    const card = await screen.findByRole("article", { name: "Demo Bistro · Бронь №BOOK123" });
    expect(within(card).getByText("Other Guest")).toBeInTheDocument();
    expect(within(card).getByText("other@example.test")).toBeInTheDocument();
    expect(within(card).getByText("+421900123456")).toBeInTheDocument();
    expect(within(card).getByText("У окна")).toBeInTheDocument();
    expect(within(card).getByText("Гостей: 3")).toBeInTheDocument();
    expect(within(card).getByText("Предзаказ №42")).toBeInTheDocument();
    expect(within(card).getByText("Паста × 2")).toBeInTheDocument();
    expect(within(card).getAllByText(/24,00/)).toHaveLength(2);
    expect(card.querySelector("time")?.textContent).toContain("20:00");
    fireEvent.click(within(card).getByRole("button", { name: "Открыть заведение: Demo Bistro" }));
    expect(onVenue).toHaveBeenCalledWith("venue-1");
    view.unmount();
    mount();
    expect(await screen.findByText("Бронь №BOOK123")).toBeInTheDocument();
    expect(listCustomerReservations).toHaveBeenCalledTimes(2);
  });
  it("groups ordinary upcoming reservations and history and sorts upcoming visits by date", async () => {
    const plain = { ...booking, id: "plain", code: "PLAIN", starts_at: "2099-10-04T18:00:00Z", ends_at: "2099-10-04T20:00:00Z", preorder_items: [], preorder_total_minor: 0, preorder_order_number: undefined };
    const past = { ...plain, id: "past", code: "PAST", starts_at: "2020-01-01T18:00:00Z", ends_at: "2020-01-01T20:00:00Z", status: "completed" as const };
    const cancelled = { ...plain, id: "cancelled", code: "CANCELLED", status: "cancelled" as const };
    vi.mocked(listCustomerReservations).mockResolvedValue([booking, past, plain, cancelled]);
    mount();
    const upcoming = await screen.findByRole("region", { name: "Предстоящие брони" });
    expect(within(upcoming).getAllByRole("article").map((item) => item.getAttribute("aria-label"))).toEqual(["Demo Bistro · Бронь №PLAIN", "Demo Bistro · Бронь №BOOK123"]);
    expect(within(upcoming).getByText("Без предзаказа")).toBeInTheDocument();
    const history = screen.getByRole("region", { name: "История броней" });
    expect(within(history).getByText("Завершена")).toBeInTheDocument();
    expect(within(history).getByText("Отменена")).toBeInTheDocument();
  });
  it("lets a failed request retry and shows the empty state", async () => {
    vi.mocked(listCustomerReservations).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить брони");
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByText("У вас пока нет броней")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выбрать заведение" })).toBeInTheDocument();
  });
});
