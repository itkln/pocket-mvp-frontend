import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import DishApp from "../../../shared/dish-app";
import { TableBillPage, TableHomePage } from "../../../shared/dish-screens";
import { getCurrentUser } from "../../../lib/auth-api";
import { APIError } from "../../../lib/api-client";
import { getPublicVenue, type PublicVenue } from "../../../lib/public-catalog-api";
import {
  callTableStaff,
  getTableBill,
  resolveTableQR,
  type TableBill,
} from "../../../lib/table-orders-api";
import { I18nProvider, translate } from "../i18n";

const { push, replace, segment } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  segment: { current: null as string | null },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/ru/qr/test-token",
  useSearchParams: () => new URLSearchParams(),
  useSelectedLayoutSegment: () => segment.current,
}));
vi.mock("../../../lib/auth-api", () => ({ getCurrentUser: vi.fn(), logout: vi.fn() }));
vi.mock("../../../lib/table-orders-api", () => ({
  resolveTableQR: vi.fn(),
  getTableBill: vi.fn(),
  callTableStaff: vi.fn(),
}));
vi.mock("../../../lib/public-catalog-api", async (original) => ({
  ...(await original<object>()),
  getPublicVenue: vi.fn(),
}));
const venue = {
  id: "venue",
  name: "Pocket Bistro",
  logo_url: "/logo.svg",
  image_url: "/cover.jpg",
} as PublicVenue;
const bill: TableBill = {
  id: "visit",
  venue_id: "venue",
  table_id: "table",
  status: "open",
  currency: "EUR",
  opened_at: "2026-11-08T12:00:00Z",
  subtotal_minor: 3100,
  tip_minor: 200,
  tax_minor: 100,
  service_fee_minor: 50,
  total_minor: 3450,
  items: [
    {
      order_id: "one",
      order_number: 1,
      name: "Паста",
      quantity: 2,
      unit_price_minor: 1200,
      total_minor: 2600,
    },
    {
      order_id: "two",
      order_number: 2,
      name: "Кофе",
      quantity: 1,
      unit_price_minor: 500,
      total_minor: 500,
    },
  ],
};
// Choosing cash and «Оплатить» calls the staff to settle.
const payCash = async () => {
  fireEvent.click(await screen.findByRole("radio", { name: "Оплата наличными" }));
  fireEvent.click(screen.getByRole("button", { name: /^Оплатить / }));
};
const show = (billPage = false) => {
  segment.current = billPage ? "bill" : null;
  return render(
    <I18nProvider initialLocale="ru">
      <DishApp qrToken="test-token">{billPage ? <TableBillPage /> : <TableHomePage />}</DishApp>
    </I18nProvider>,
  );
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("unauthenticated"));
  vi.mocked(resolveTableQR).mockResolvedValue({
    venue_id: "venue",
    table_id: "table",
    table_identifier: "07",
    version: 1,
    currency: "EUR",
    ordering_enabled: true,
  });
  vi.mocked(getPublicVenue).mockResolvedValue(venue);
  vi.mocked(getTableBill).mockResolvedValue(null);
});
it("opens a public QR landing with venue, table and both actions without creating a bill", async () => {
  show();
  expect(await screen.findByRole("heading", { name: "Pocket Bistro" })).toBeInTheDocument();
  expect(screen.getByText("Стол 07")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Оплатить счёт/ })).toHaveAttribute(
    "href",
    "/ru/qr/test-token/bill",
  );
  expect(screen.getByRole("link", { name: /Заказать за стол/ })).toHaveAttribute(
    "href",
    "/ru/qr/test-token/menu",
  );
  expect(getTableBill).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});
it("changes language while retaining QR context and a stored cart", async () => {
  const draft = JSON.stringify({ quantities: { pasta: 2 }, notes: "Без лука" });
  sessionStorage.setItem("pocket:table-cart:test-token", draft);
  show();
  await screen.findByRole("heading", { name: "Pocket Bistro" });
  fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "English" }));
  expect(replace).toHaveBeenCalledWith("/en/qr/test-token", { scroll: false });
  expect(screen.getByRole("link", { name: /Pay the bill/ })).toHaveAttribute(
    "href",
    "/en/qr/test-token/bill",
  );
  expect(sessionStorage.getItem("pocket:table-cart:test-token")).toBe(draft);
});
it("shows an empty bill with disabled payment, menu and return links", async () => {
  show(true);
  expect(await screen.findByRole("heading", { name: "Пока нет заказов" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Оплатить счёт" })).toBeDisabled();
  expect(screen.getByRole("link", { name: "Заказать за стол" })).toHaveAttribute(
    "href",
    "/ru/qr/test-token/menu",
  );
  expect(screen.getByRole("link", { name: "Назад к столу" })).toHaveAttribute(
    "href",
    "/ru/qr/test-token",
  );
  expect(getTableBill).toHaveBeenCalledWith("test-token", expect.any(AbortSignal));
  expect(replace).not.toHaveBeenCalled();
});
it("renders all guests' items and authoritative totals, then clears the settled visit on refresh", async () => {
  vi.mocked(getTableBill).mockResolvedValueOnce(bill).mockResolvedValueOnce(null);
  show(true);
  const region = within(await screen.findByRole("region", { name: "Общий счёт" }));
  expect(region.getByText("Паста")).toBeInTheDocument();
  expect(region.getByText("Кофе")).toBeInTheDocument();
  expect(region.getByText(/26,00/)).toBeInTheDocument();
  expect(region.getByText("Итого").nextElementSibling).toHaveTextContent("34,50");
  expect(
    region.queryByText("Для оплаты обратитесь к сотруднику заведения."),
  ).not.toBeInTheDocument();
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await screen.findByRole("heading", { name: "Счёт закрыт" });
  expect(screen.queryByText("Паста")).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Способ оплаты" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Заказать за стол" })).toBeInTheDocument();
});
it("keeps the last bill on a failed refresh, says the connection dropped and retries", async () => {
  vi.mocked(getTableBill)
    .mockResolvedValueOnce(bill)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({
      ...bill,
      total_minor: 3950,
      items: [...bill.items, { ...bill.items[1], order_id: "three", order_number: 3 }],
    });
  show(true);
  await screen.findByText("Паста");
  fireEvent.click(screen.getByRole("button", { name: "Обновить счёт" }));
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Не удалось обновить счёт");
  expect(alert).toHaveTextContent("Показан счёт на");
  expect(screen.getByText("Паста")).toBeInTheDocument();
  fireEvent.click(within(alert).getByRole("button", { name: "Повторить" }));
  // Another guest's order shows up with the server's new total.
  await waitFor(() =>
    expect(screen.getByText("Итого").nextElementSibling).toHaveTextContent("39,50"),
  );
  expect(screen.getByText(/Заказ №3/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("calls the staff to settle, shows the call and does not treat it as a payment", async () => {
  const called = { ...bill, payment_requested_at: "2026-11-08T12:30:00Z" };
  vi.mocked(getTableBill).mockResolvedValue(bill);
  vi.mocked(callTableStaff).mockResolvedValue(called);
  show(true);
  await payCash();
  expect(callTableStaff).toHaveBeenCalledWith("test-token");
  const panel = await screen.findByRole("status");
  expect(panel).toHaveTextContent("Сотрудник вызван · к оплате 34,50");
  expect(panel).toHaveTextContent("подойдёт к столу 07 для расчёта");
  expect(panel).toHaveTextContent("Счёт закроется, когда сотрудник подтвердит оплату.");
  expect(screen.queryByRole("group", { name: "Способ оплаты" })).not.toBeInTheDocument();
  // The bill is still open: it keeps its dishes until the staff confirms the payment.
  expect(screen.getByText("Паста")).toBeInTheDocument();
});
it("shows the payment method mock-up: four options, split and pay once a method is chosen", async () => {
  vi.mocked(getTableBill).mockResolvedValue(bill);
  show(true);
  const methods = await screen.findByRole("group", { name: "Способ оплаты" });
  for (const label of ["Apple Pay", "Google Pay", "Банковская карта", "Оплата наличными"])
    expect(within(methods).getByRole("radio", { name: label })).not.toBeChecked();
  expect(screen.getByRole("button", { name: "Разделить оплату" })).toBeEnabled();
  const pay = screen.getByRole("button", { name: /Оплатить 34,50/ });
  expect(pay).toBeDisabled();
  fireEvent.click(within(methods).getByRole("radio", { name: "Google Pay" }));
  expect(within(methods).getByRole("radio", { name: "Google Pay" })).toBeChecked();
  expect(pay).toBeEnabled();
  // Online methods are not wired yet: nothing is sent.
  fireEvent.click(pay);
  expect(callTableStaff).not.toHaveBeenCalled();
});
it("keeps a call made from another phone and confirms the payment with a zero bill", async () => {
  vi.mocked(getTableBill)
    .mockResolvedValueOnce({ ...bill, payment_requested_at: "2026-11-08T12:30:00Z" })
    .mockResolvedValueOnce(null);
  show(true);
  expect(await screen.findByText(/Сотрудник вызван/)).toBeInTheDocument();
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await screen.findByRole("heading", { name: "Оплата подтверждена" });
  expect(screen.getByText(/Текущий счёт: 0,00/)).toBeInTheDocument();
  expect(screen.queryByText("Паста")).not.toBeInTheDocument();
});
it("says when the staff could not be called and lets the guest try again", async () => {
  vi.mocked(getTableBill).mockResolvedValue(bill);
  vi.mocked(callTableStaff).mockRejectedValueOnce(new Error("offline"));
  show(true);
  await payCash();
  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось вызвать сотрудника");
  expect(screen.getByRole("button", { name: /^Оплатить / })).toBeEnabled();
});
it("shows a bill being settled without the payment button", async () => {
  vi.mocked(getTableBill).mockResolvedValue({ ...bill, status: "payment_pending" });
  show(true);
  expect(await screen.findByText("Счёт передан на оплату")).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Способ оплаты" })).not.toBeInTheDocument();
});
it("shows a bill error instead of an empty bill and recovers on returning to the browser", async () => {
  vi.mocked(getTableBill).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(bill);
  show(true);
  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить счёт");
  expect(screen.queryByText("Пока нет заказов")).not.toBeInTheDocument();
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await screen.findByText("Паста");
});
it("removes the previous bill when its QR is revoked during refresh", async () => {
  vi.mocked(getTableBill)
    .mockResolvedValueOnce(bill)
    .mockRejectedValueOnce(new APIError("qr_invalid", "revoked", 404));
  show(true);
  await screen.findByText("Паста");
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("QR-код недействителен");
  expect(screen.queryByText("Паста")).not.toBeInTheDocument();
});
it("rejects invalid QR before loading venue or bill and permits retry", async () => {
  vi.mocked(resolveTableQR).mockRejectedValueOnce(new APIError("qr_invalid", "revoked", 404));
  show();
  expect(await screen.findByRole("alert")).toHaveTextContent("QR-код недействителен");
  expect(getPublicVenue).not.toHaveBeenCalled();
  expect(getTableBill).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
  await screen.findByRole("heading", { name: "Pocket Bistro" });
});
it("refreshes the bill when returning to the browser", async () => {
  show(true);
  await screen.findByText("Пока нет заказов");
  vi.mocked(getTableBill).mockResolvedValue(bill);
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await waitFor(() => expect(screen.getByText("Паста")).toBeInTheDocument());
});
it("provides entry and bill labels in every supported language", () => {
  for (const locale of ["en", "ua", "sk"] as const)
    for (const label of [
      "Назад к столу",
      "Оплатить счёт",
      "Заказать за стол",
      "Общий счёт",
      "Пока нет заказов",
      "Обновить счёт",
      "Сотрудник подойдёт к столу и примет оплату наличными.",
      "Счёт закрыт",
      "Счёт передан на оплату",
      "Оплата подтверждена",
      "Банковская карта",
      "Оплата наличными",
      "Разделить оплату",
      "Оплатить {amount}",
      "Счёт закроется, когда сотрудник подтвердит оплату.",
      "Не удалось вызвать сотрудника. Проверьте подключение и попробуйте ещё раз.",
    ])
      expect(translate(label, locale)).not.toBe(label);
});
