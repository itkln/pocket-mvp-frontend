import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { OwnerOrder } from "../../../lib/owner-api";
import { OrdersScreen } from "./orders";
import { nextOrderAction, orderGroup } from "./order-workflow";
import { ConfirmProvider } from "../confirm-dialog";
const workspace = {
  getHistoryPage: undefined as undefined | ReturnType<typeof vi.fn>,
  venueTimezone: "Europe/Bratislava",
  onArrivals: vi.fn(),
  hasMoreOrderHistory: false,
  loadMoreOrderHistory: vi.fn(),
  orders: [] as OwnerOrder[],
  loading: false,
  refreshOrders: vi.fn(),
  setOrderStatus: vi.fn(),
};
vi.mock("./context", () => ({ useOwnerWorkspace: () => workspace }));
const base: OwnerOrder = {
  allowed_actions: ["accepted", "preparing", "ready", "served", "completed", "cancelled"],
  id: "a",
  number: 42,
  channel: "dine_in",
  source: "Стол 01",
  total_minor: 1200,
  currency: "EUR",
  status: "new",
  created_at: "2026-11-01T12:00:00Z",
  notes: "Без соли",
  items: [{ name: "Суп", quantity: 2, unit_price_minor: 600 }],
};
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.clearAllMocks();
  workspace.getHistoryPage = undefined;
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  window.scrollTo = vi.fn();
  workspace.loading = false;
  workspace.hasMoreOrderHistory = false;
  workspace.loadMoreOrderHistory.mockResolvedValue(undefined);
  workspace.orders = [{ ...base }];
  workspace.refreshOrders.mockImplementation(async () => workspace.orders);
  workspace.setOrderStatus.mockResolvedValue(undefined);
});
const mount = () =>
  render(
    <ConfirmProvider>
      <OrdersScreen />
    </ConfirmProvider>,
  );
describe("order desk", () => {
  it("announces a new ID once across refresh and reconnect without moving the selection", async () => {
    const view = mount();
    await screen.findByText(/На связи/);
    expect(screen.queryByRole("complementary", { name: "Новый заказ" })).toBeNull();
    workspace.orders = [...workspace.orders, { ...base, id: "arrival", number: 43 }];
    view.rerender(
      <ConfirmProvider>
        <OrdersScreen />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Обновить" }));
    await waitFor(() => expect(workspace.onArrivals).toHaveBeenCalledWith([workspace.orders[1]]));
    expect(screen.queryByRole("complementary", { name: "Новый заказ" })).toBeNull();
    expect(screen.getByRole("article", { name: "Заказ № 42" })).toBeInTheDocument();
    const tickets = screen.getAllByRole("button", { name: /№ (42|43)/ });
    expect(tickets[0]).toHaveTextContent("№ 43");
    expect(tickets[0]).toHaveClass("just-arrived");
    view.rerender(
      <ConfirmProvider>
        <OrdersScreen request={{ id: "arrival" }} />
      </ConfirmProvider>,
    );
    expect(screen.getByRole("article", { name: "Заказ № 43" })).toBeInTheDocument();
    expect(tickets[0]).not.toHaveClass("just-arrived");
    fireEvent(window, new Event("offline"));
    expect(screen.getByText(/Переподключение/)).toBeInTheDocument();
    fireEvent(window, new Event("online"));
    await screen.findByText(/На связи/);
    expect(workspace.onArrivals).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("complementary", { name: "Новый заказ" })).toBeNull();
  });
  it("highlights a confirmed status change and preserves selection", async () => {
    const view = mount();
    await waitFor(() => expect(workspace.refreshOrders).toHaveBeenCalled());
    workspace.orders = [{ ...base, status: "accepted" }];
    view.rerender(
      <ConfirmProvider>
        <OrdersScreen />
      </ConfirmProvider>,
    );
    expect(
      screen.getByRole("button", { name: /№ 42/ }).querySelector(".orders-change-flash"),
    ).not.toBeNull();
    expect(
      screen.getByRole("article", { name: "Заказ № 42" }).querySelector(".orders-status-updated"),
    ).toHaveTextContent("Принят");
    expect(screen.getByRole("button", { name: "Начать приготовление" })).toBeInTheDocument();
  });

  it("uses a mobile swipe action and places the only cancellation beside back", async () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    mount();
    const action = screen.getByRole("button", { name: "Принять заказ" });
    expect(action).toHaveClass("slide-confirm");
    fireEvent.click(action, { detail: 1 });
    expect(workspace.setOrderStatus).not.toHaveBeenCalled();
    const cancel = screen.getByRole("button", { name: "Отменить заказ" });
    expect(cancel.closest(".orders-mobile-navigation")).not.toBeNull();
    expect(cancel.querySelector("svg")).not.toBeNull();
    expect(document.querySelector(".orders-actions .orders-cancel")).toBeNull();
    fireEvent.click(cancel);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(workspace.setOrderStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("keeps the default selection and queue scroll when an older order arrives", async () => {
    const view = mount();
    await waitFor(() => expect(workspace.refreshOrders).toHaveBeenCalled());
    const queue = screen.getByRole("complementary", { name: "Очередь заказов" });
    queue.scrollTop = 160;
    fireEvent.scroll(queue);
    workspace.orders = [
      { ...base, id: "older", number: 1, created_at: "2026-10-01T12:00:00Z" },
      { ...base },
    ];
    view.rerender(
      <ConfirmProvider>
        <OrdersScreen />
      </ConfirmProvider>,
    );
    expect(screen.getByRole("article", { name: "Заказ № 42" })).toBeInTheDocument();
    expect(queue.scrollTop).toBe(160);
    expect(screen.getByRole("button", { name: /№ 42/ })).toHaveAttribute("aria-pressed", "true");
  });
  it("moves accepted work between groups and keeps final details until the operator selects another order", async () => {
    const view = mount();
    await waitFor(() => expect(workspace.refreshOrders).toHaveBeenCalled());
    workspace.orders = [{ ...base, status: "accepted" }];
    view.rerender(
      <ConfirmProvider>
        <OrdersScreen />
      </ConfirmProvider>,
    );
    expect(screen.getByRole("button", { name: /В работе 1/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Новые 1/ })).not.toBeInTheDocument();
    workspace.orders = [{ ...base, status: "completed" }];
    view.rerender(
      <ConfirmProvider>
        <OrdersScreen />
      </ConfirmProvider>,
    );
    expect(screen.queryByRole("button", { name: /№ 42/ })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Заказ № 42" })).toHaveTextContent("Заказ завершён");
  });
  it("explains a missing selection without silently selecting another order", async () => {
    const view = mount();
    await waitFor(() => expect(workspace.refreshOrders).toHaveBeenCalled());
    workspace.orders = [{ ...base, id: "b", number: 43 }];
    view.rerender(
      <ConfirmProvider>
        <OrdersScreen />
      </ConfirmProvider>,
    );
    expect(screen.getByText("Заказ больше не доступен")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Выбрать другой заказ" }));
    expect(screen.getByRole("article", { name: "Заказ № 43" })).toBeInTheDocument();
  });
  it("sorts scheduled preorders by visit and opens the linked reservation across midnight", () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    const early = {
      ...base,
      id: "early",
      reservation_id: "booking-id",
      reservation_code: "RES42",
      reservation_status: "confirmed" as const,
      reservation_starts_at: "2099-11-09T23:30:00Z",
    };
    workspace.orders = [
      {
        ...early,
        id: "later",
        number: 43,
        created_at: "2026-01-01T00:00:00Z",
        reservation_starts_at: "2099-11-11T09:00:00Z",
      },
      early,
    ];
    mount();
    const scheduled = screen.getByRole("button", { name: /Ко времени 2/ }).closest("section")!;
    const tickets = within(scheduled).getAllByRole("button", { name: /№/ });
    expect(tickets[0]).toHaveTextContent("№ 42");
    expect(tickets[0]).toHaveTextContent(/Время визита.*10 нояб.*00:30/);
    expect(tickets[0]).not.toHaveTextContent("назад");
    fireEvent.click(tickets[0]);
    fireEvent.click(screen.getByRole("button", { name: "Открыть бронь" }));
    expect(screen.getByRole("dialog", { name: /RES42/ })).toHaveTextContent("Подтверждена");
    expect(workspace.setOrderStatus).not.toHaveBeenCalled();
  });
  it("opens a cancelled reservation from order history without a preparation action", () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    workspace.orders = [
      {
        ...base,
        status: "cancelled",
        reservation_status: "cancelled",
        reservation_id: "booking-id",
        reservation_code: "RES42",
        reservation_starts_at: base.created_at,
      },
    ];
    mount();
    fireEvent.click(screen.getByRole("button", { name: /История/ }));
    fireEvent.click(screen.getByRole("button", { name: "Открыть бронь" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Отменена");
    expect(screen.queryByRole("button", { name: "Начать приготовление" })).toBeNull();
  });
  it("shows loading, then a retryable failure, then the empty queue", async () => {
    workspace.orders = [];
    workspace.refreshOrders.mockRejectedValueOnce(new Error("offline"));
    mount();
    expect(screen.getByRole("status")).toHaveTextContent("Загрузка...");
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить заказы"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByText("Заказов пока нет")).toBeInTheDocument();
  });
  it("opens mobile details and restores the list scroll on return", async () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    Object.defineProperty(window, "scrollY", { value: 240, configurable: true });
    mount();
    await waitFor(() => expect(workspace.refreshOrders).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /№ 42/ }));
    expect(document.querySelector(".vendor-orders")).toHaveClass("show-detail");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0 });
    fireEvent.click(screen.getByRole("button", { name: "К заказам" }));
    expect(document.querySelector(".vendor-orders")).not.toHaveClass("show-detail");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 240 });
    vi.restoreAllMocks();
  });

  it("honors server actions, including read-only roles and cancellation guards", () => {
    workspace.orders = [{ ...base, allowed_actions: [] }];
    mount();
    expect(screen.queryByRole("button", { name: "Принять заказ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Отменить заказ" })).not.toBeInTheDocument();
    expect(nextOrderAction({ ...base, allowed_actions: ["cancelled"] })).toBeNull();
  });
  it("loads additional history on request", async () => {
    workspace.hasMoreOrderHistory = true;
    mount();
    await waitFor(() => expect(workspace.refreshOrders).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /История/ }));
    fireEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
    await waitFor(() => expect(workspace.loadMoreOrderHistory).toHaveBeenCalledTimes(1));
  });
  it("shows the composition and only the next action", () => {
    mount();
    expect(screen.getByText("Без соли")).toBeInTheDocument();
    expect(screen.getByText("Суп")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Принять заказ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Заказ готов" })).not.toBeInTheDocument();
  });
  it("sends a single action while saving", async () => {
    let resolve!: () => void;
    workspace.setOrderStatus.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    mount();
    const button = screen.getByRole("button", { name: "Принять заказ" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(workspace.setOrderStatus).toHaveBeenCalledTimes(1);
    expect(workspace.setOrderStatus).toHaveBeenCalledWith("a", "accepted");
    expect(button).toBeDisabled();
    resolve();
    await waitFor(() => expect(button).toBeEnabled());
  });
  it("requires confirmation before cancelling", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Отменить заказ" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(workspace.setOrderStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(workspace.setOrderStatus).not.toHaveBeenCalled();
  });
  it("refreshes after a conflict without advancing locally", async () => {
    workspace.setOrderStatus.mockRejectedValue(new Error("conflict"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Принять заказ" }));
    await waitFor(() => expect(workspace.refreshOrders).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("alert")).toHaveTextContent("Действие не выполнено");
    expect(screen.getByRole("button", { name: "Принять заказ" })).toBeEnabled();
  });
  it("filters by dish and separates history", () => {
    workspace.orders.push({ ...base, id: "b", number: 43, status: "completed" });
    mount();
    expect(screen.queryByRole("button", { name: /№ 43/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /История/ }));
    expect(screen.getByRole("button", { name: /№ 43/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Принять заказ" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск заказов" }), {
      target: { value: "Пицца" },
    });
    expect(screen.getByText("Ничего не найдено")).toBeInTheDocument();
  });
  it("supports pickup and keeps scheduled orders separate", () => {
    expect(nextOrderAction({ ...base, status: "ready", channel: "pickup" })?.status).toBe(
      "completed",
    );
    expect(nextOrderAction({ ...base, status: "ready" })?.status).toBe("served");
    expect(nextOrderAction({ ...base, status: "completed" })).toBeNull();
    expect(
      orderGroup(
        { ...base, reservation_starts_at: "2026-11-02T12:00:00Z" },
        Date.parse(base.created_at),
      ),
    ).toBe("scheduled");
  });
});

describe("order detail blocks", () => {
  it("renders saved line totals and separates tips from composition", () => {
    workspace.orders = [
      {
        ...base,
        total_minor: 1350,
        tip_minor: 150,
        items: [
          {
            id: "saved",
            name: "Суп из снимка",
            quantity: 2,
            unit_price_minor: 650,
            total_minor: 1200,
            notes: "Без перца",
          },
        ],
      },
    ];
    mount();
    const composition = screen.getByRole("region", { name: "Состав заказа" });
    expect(composition).toHaveTextContent("Суп из снимка");
    expect(composition).toHaveTextContent("Без перца");
    expect(composition).toHaveTextContent("€12.00");
    expect(composition).not.toHaveTextContent("Чаевые");
    const totals = screen.getByRole("region", { name: "Итого" });
    expect(totals).toHaveTextContent("€1.50");
    expect(totals).toHaveTextContent("€13.50");
  });
  it("renders kitchen payload without financial placeholders or guest identity", () => {
    const { total_minor, currency, guest_name, guest_phone, ...kitchen } = base;
    workspace.orders = [
      {
        ...kitchen,
        allowed_actions: ["preparing"],
        items: [{ name: "Суп", quantity: 2, notes: "Без перца" }],
      } as OwnerOrder,
    ];
    mount();
    const detail = screen.getByRole("article");
    expect(detail).toHaveTextContent("Стол 01");
    expect(detail).toHaveTextContent("Без соли");
    expect(detail).toHaveTextContent("Без перца");
    expect(detail).not.toHaveTextContent(/NaN|€|Итого|Чаевые|Телефон/);
    expect(screen.queryByRole("region", { name: "Итого" })).not.toBeInTheDocument();
  });
  it("keeps comments as text and omits whitespace-only comments", () => {
    workspace.orders = [{ ...base, notes: "<img src=x onerror=alert(1)>\nБез соли" }];
    const view = mount();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
    expect(document.querySelector(".orders-comment img")).toBeNull();
    workspace.orders = [{ ...base, notes: "   " }];
    view.rerender(
      <ConfirmProvider>
        <OrdersScreen />
      </ConfirmProvider>,
    );
    expect(document.querySelector(".orders-comment")).toBeNull();
  });
  it("shows reservation context and guest count independently of guest name", () => {
    workspace.orders = [
      {
        ...base,
        reservation_code: "RES-42",
        reservation_starts_at: "2026-11-09T12:00:00Z",
        guest_count: 3,
        guest_phone: "+421900123456",
      },
    ];
    mount();
    const detail = screen.getByRole("article");
    expect(detail).toHaveTextContent("RES-42");
    expect(detail).toHaveTextContent("Время визита");
    expect(detail).toHaveTextContent("Гости3");
    expect(within(detail).getByRole("link", { name: "+421900123456" })).toHaveAttribute(
      "href",
      "tel:+421900123456",
    );
  });
});

it("requires a reason and sends cancellation metadata", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Отменить заказ" }));
  const dialog = screen.getByRole("alertdialog");
  const submit = within(dialog).getByRole("button", { name: "Отменить заказ" });
  expect(submit).toBeDisabled();
  fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "unavailable" } });
  const comment = within(dialog).getByRole("textbox");
  expect(comment).toHaveAttribute("maxlength", "500");
  fireEvent.change(comment, { target: { value: "Закончился суп" } });
  fireEvent.click(submit);
  await waitFor(() =>
    expect(workspace.setOrderStatus).toHaveBeenCalledWith("a", "cancelled", {
      reason: "unavailable",
      comment: "Закончился суп",
    }),
  );
});

it("searches server history and retains filters when opening details", async () => {
  const old = {
    ...base,
    id: "historic",
    number: 900,
    status: "completed" as const,
    allowed_actions: [],
    created_at: "2020-01-01T12:00:00Z",
  };
  workspace.getHistoryPage = vi
    .fn()
    .mockResolvedValue({ orders: [old], has_more: true, next_cursor: "next" });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "История" }));
  await screen.findByRole("button", { name: /№ 900/ });
  fireEvent.change(screen.getByRole("textbox", { name: "Поиск заказов" }), {
    target: { value: "900" },
  });
  fireEvent.change(screen.getByLabelText("Дата с"), { target: { value: "2020-01-01" } });
  await waitFor(() =>
    expect(workspace.getHistoryPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: "history", number: "900", date_from: "2020-01-01" }),
    ),
  );
  fireEvent.click(await screen.findByRole("button", { name: /№ 900/ }));
  expect(screen.getByRole("article", { name: "Заказ № 900" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Отменить заказ" })).toBeNull();
  expect(screen.getByLabelText("Дата с")).toHaveValue("2020-01-01");
  fireEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
  await waitFor(() =>
    expect(workspace.getHistoryPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "next", number: "900" }),
    ),
  );
});
