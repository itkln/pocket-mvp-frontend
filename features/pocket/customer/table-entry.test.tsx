import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import DishApp from "../../../shared/dish-app";
import { TableBillPage, TableHomePage } from "../../../shared/dish-screens";
import { getCurrentUser } from "../../../lib/auth-api";
import { APIError } from "../../../lib/api-client";
import { getPublicVenue, type PublicVenue } from "../../../lib/public-catalog-api";
import { getTableBill, resolveTableQR, type TableBill } from "../../../lib/table-orders-api";
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
  expect(region.getByText(/34,50/)).toBeInTheDocument();
  expect(
    region.queryByText("Для оплаты обратитесь к сотруднику заведения."),
  ).not.toBeInTheDocument();
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await screen.findByRole("heading", { name: "Пока нет заказов" });
  expect(screen.queryByText("Паста")).not.toBeInTheDocument();
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
    ])
      expect(translate(label, locale)).not.toBe(label);
});
