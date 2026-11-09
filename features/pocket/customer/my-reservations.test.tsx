import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelCustomerReservation,
  listCustomerReservations,
  type CustomerReservation,
} from "../../../lib/reservations-api";
import { APIError } from "../../../lib/api-client";
import { I18nProvider } from "../i18n";
import { MyReservationsScreen } from "./my-reservations";

vi.mock("../../../lib/reservations-api", () => ({
  listCustomerReservations: vi.fn(),
  cancelCustomerReservation: vi.fn(),
}));
const booking: CustomerReservation = {
  id: "booking-1",
  code: "BOOK123",
  venue_id: "venue-1",
  venue_name: "Demo Bistro",
  venue_address: "Main 1",
  venue_city: "Bratislava",
  timezone: "Europe/Bratislava",
  starts_at: "2099-10-05T18:00:00Z",
  ends_at: "2099-10-05T20:00:00Z",
  guest_count: 3,
  status: "confirmed",
  guest_name: "Other Guest",
  guest_phone: "+421900123456",
  guest_email: "other@example.test",
  notes: "У окна",
  preorder_total_minor: 2400,
  preorder_order_number: 42,
  currency: "EUR",
  preorder_items: [{ name: "Паста", quantity: 2, unit_price_minor: 1200 }],
  preorder_status: "new",
  cancellation: { allowed: true },
};
function mount(onVenue = vi.fn()) {
  return render(
    <I18nProvider initialLocale="ru">
      <MyReservationsScreen onVenue={onVenue} onDiscover={vi.fn()} />
    </I18nProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("my reservations", () => {
  it("confirms cancellation, blocks duplicate requests and keeps the cancelled booking in history after reload", async () => {
    vi.mocked(listCustomerReservations).mockResolvedValue([booking]);
    let resolve!: (value: CustomerReservation) => void;
    vi.mocked(cancelCustomerReservation).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Открыть бронь: Demo Bistro · BOOK123" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Отменить бронь" }));
    expect(screen.getByRole("heading", { name: "Отменить бронь?" })).toHaveFocus();
    expect(screen.getByText(/Вместе с бронью будет отменён весь предзаказ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить бронь" }));
    expect(cancelCustomerReservation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Отменить бронь" }));
    const submit = screen.getByRole("button", { name: "Да, отменить бронь" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(cancelCustomerReservation).toHaveBeenCalledExactlyOnceWith("booking-1");
    expect(screen.getByRole("button", { name: "Отменяем бронь..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeDisabled();
    const cancelled: CustomerReservation = {
      ...booking,
      status: "cancelled",
      preorder_status: "cancelled",
      cancellation: { allowed: false, reason: "cancellation_status_blocked" },
    };
    await act(async () => resolve(cancelled));
    expect(screen.getByText("Бронь и предзаказ отменены")).toHaveAttribute("role", "status");
    expect(screen.getByText("Предзаказ отменён")).toBeInTheDocument();
    expect(screen.getByText("Паста × 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("region", { name: "Предстоящие брони" })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "История броней" })).getByText("Отменена"),
    ).toBeInTheDocument();
    vi.mocked(listCustomerReservations).mockResolvedValue([cancelled]);
    view.unmount();
    mount();
    expect(
      within(await screen.findByRole("region", { name: "История броней" })).getByText("Отменена"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Открыть бронь: Demo Bistro · BOOK123" }));
    expect(screen.queryByRole("button", { name: "Отменить бронь" })).not.toBeInTheDocument();
  });
  it("preserves details on cancellation errors and allows a retry", async () => {
    vi.mocked(listCustomerReservations).mockResolvedValue([booking]);
    vi.mocked(cancelCustomerReservation)
      .mockRejectedValueOnce(new APIError("cancellation_preorder_locked", "locked", 409))
      .mockRejectedValueOnce(new Error("offline"));
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Открыть бронь: Demo Bistro · BOOK123" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Отменить бронь" }));
    fireEvent.click(screen.getByRole("button", { name: "Да, отменить бронь" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Заведение уже обрабатывает предзаказ",
    );
    expect(screen.getByRole("button", { name: "Да, отменить бронь" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Да, отменить бронь" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось отменить бронь");
    fireEvent.click(screen.getByRole("button", { name: "Сохранить бронь" }));
    expect(screen.getByText("Other Guest")).toBeInTheDocument();
    expect(screen.getByText("Паста × 2")).toBeInTheDocument();
    expect(cancelCustomerReservation).toHaveBeenCalledTimes(2);
  });
  it("uses server eligibility and shows the reason when cancellation is unavailable", async () => {
    vi.mocked(listCustomerReservations).mockResolvedValue([
      { ...booking, cancellation: { allowed: false, reason: "cancellation_deadline_passed" } },
    ]);
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Открыть бронь: Demo Bistro · BOOK123" }),
    );
    expect(screen.queryByRole("button", { name: "Отменить бронь" })).not.toBeInTheDocument();
    expect(screen.getByText("Срок отмены истёк. Свяжитесь с заведением.")).toBeInTheDocument();
  });
  it("shows saved contacts, comments and preorder snapshots in the venue timezone", async () => {
    vi.mocked(listCustomerReservations).mockResolvedValue([booking]);
    const onVenue = vi.fn();
    const view = mount(onVenue);
    const card = await screen.findByRole("article", { name: "Demo Bistro · Бронь №BOOK123" });
    expect(within(card).queryByText("Other Guest")).not.toBeInTheDocument();
    expect(within(card).queryByText("Паста × 2")).not.toBeInTheDocument();
    expect(card.querySelector("time")?.textContent).toContain("20:00");
    const trigger = within(card).getByRole("button", {
      name: "Открыть бронь: Demo Bistro · BOOK123",
    });
    trigger.focus();
    fireEvent.click(trigger);
    const panel = screen.getByRole("dialog", { name: "Информация о брони" });
    expect(panel).toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("hidden");
    expect(within(panel).getByText("Other Guest")).toBeInTheDocument();
    expect(within(panel).getByText("other@example.test")).toBeInTheDocument();
    expect(within(panel).getByText("+421900123456")).toBeInTheDocument();
    expect(within(panel).getByText("У окна")).toBeInTheDocument();
    expect(within(panel).getByText(/Гостей: 3/)).toBeInTheDocument();
    expect(within(panel).getByText("Предзаказ №42")).toBeInTheDocument();
    expect(within(panel).getByText("Паста × 2")).toBeInTheDocument();
    expect(within(panel).getAllByText(/24,00/)).toHaveLength(2);
    fireEvent.click(within(panel).getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Открыть заведение" }),
    );
    expect(onVenue).toHaveBeenCalledWith("venue-1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    view.unmount();
    mount();
    expect(await screen.findByText("Бронь №BOOK123")).toBeInTheDocument();
    expect(listCustomerReservations).toHaveBeenCalledTimes(2);
  });
  it("groups ordinary upcoming reservations and history and sorts upcoming visits by date", async () => {
    const plain = {
      ...booking,
      id: "plain",
      code: "PLAIN",
      starts_at: "2099-10-04T18:00:00Z",
      ends_at: "2099-10-04T20:00:00Z",
      preorder_items: [],
      preorder_total_minor: 0,
      preorder_order_number: undefined,
    };
    const past = {
      ...plain,
      id: "past",
      code: "PAST",
      starts_at: "2020-01-01T18:00:00Z",
      ends_at: "2020-01-01T20:00:00Z",
      status: "completed" as const,
    };
    const cancelled = {
      ...plain,
      id: "cancelled",
      code: "CANCELLED",
      status: "cancelled" as const,
    };
    vi.mocked(listCustomerReservations).mockResolvedValue([booking, past, plain, cancelled]);
    mount();
    const upcoming = await screen.findByRole("region", { name: "Предстоящие брони" });
    expect(
      within(upcoming)
        .getAllByRole("article")
        .map((item) => item.getAttribute("aria-label")),
    ).toEqual(["Demo Bistro · Бронь №PLAIN", "Demo Bistro · Бронь №BOOK123"]);
    expect(within(upcoming).queryByText("Без предзаказа")).not.toBeInTheDocument();
    fireEvent.click(
      within(upcoming).getByRole("button", { name: "Открыть бронь: Demo Bistro · PLAIN" }),
    );
    expect(within(screen.getByRole("dialog")).getByText("Без предзаказа")).toBeInTheDocument();
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { bubbles: false, cancelable: true }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const history = screen.getByRole("region", { name: "История броней" });
    expect(within(history).getByText("Завершена")).toBeInTheDocument();
    expect(within(history).getByText("Отменена")).toBeInTheDocument();
  });
  it("combines venue, status and preorder filters and can clear an empty result", async () => {
    const plain = {
      ...booking,
      id: "plain",
      code: "PLAIN",
      preorder_items: [],
      preorder_total_minor: 0,
    };
    const other = {
      ...booking,
      id: "other",
      code: "OTHER",
      venue_id: "other-venue",
      venue_name: "Coffee Lab",
    };
    const cancelled = {
      ...booking,
      id: "cancelled",
      code: "CANCELLED",
      status: "cancelled" as const,
    };
    vi.mocked(listCustomerReservations).mockResolvedValue([booking, plain, other, cancelled]);
    mount();
    await screen.findByText("Бронь №BOOK123");
    expect(screen.getAllByRole("article")).toHaveLength(4);
    const strip = screen.getByRole("region", { name: "Фильтры броней" });
    expect(strip).toHaveClass("spots-category-filters");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(within(strip).getByRole("button", { name: "Подтверждена" }));
    fireEvent.click(within(strip).getByRole("button", { name: "С предзаказом" }));
    expect(within(strip).getByRole("button", { name: "С предзаказом" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(within(strip).getByRole("button", { name: "Фильтры" }));
    const filters = screen.getByRole("dialog", { name: "Фильтры" });
    expect(filters).toHaveClass("spots-picker-dialog");
    fireEvent.click(
      within(within(filters).getByRole("region", { name: "Заведение" })).getByRole("button", {
        name: "Demo Bistro",
      }),
    );
    fireEvent.click(within(filters).getByRole("button", { name: "Показать (1)" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Найдено броней: 1");
    fireEvent.click(screen.getByRole("button", { name: "Открыть бронь: Demo Bistro · BOOK123" }));
    expect(within(screen.getByRole("dialog")).getByText("Паста × 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    fireEvent.click(within(strip).getByRole("button", { name: "Без предзаказа" }));
    expect(screen.getByText("Бронь №PLAIN")).toBeInTheDocument();
    expect(screen.queryByText("Бронь №BOOK123")).not.toBeInTheDocument();
    fireEvent.click(within(strip).getByRole("button", { name: "Отменена" }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("Нет броней по выбранным фильтрам")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(within(strip).getByRole("button", { name: "Все" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(within(strip).getByRole("button", { name: "С предзаказом" }));
    fireEvent.click(within(strip).getByRole("button", { name: "С предзаказом" }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(listCustomerReservations).toHaveBeenCalledTimes(1);
  });
  it("lets a failed request retry and shows the empty state", async () => {
    vi.mocked(listCustomerReservations)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить брони");
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByText("У вас пока нет броней")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выбрать заведение" })).toBeInTheDocument();
  });
});
