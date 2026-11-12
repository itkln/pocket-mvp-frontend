import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { APIError } from "../../../lib/api-client";
import { listOpenBills, settleBill, type OpenTableBill } from "../../../lib/owner-api";
import { I18nProvider, translate } from "../i18n";
import { TableBillRequests } from "./table-bills";

vi.mock("../../../lib/owner-api", async (original) => ({
  ...(await original<object>()),
  listOpenBills: vi.fn(),
  settleBill: vi.fn(),
}));

const bill: OpenTableBill = {
  id: "bill-07",
  table_identifier: "07",
  status: "open",
  currency: "EUR",
  opened_at: "2026-11-12T18:00:00Z",
  payment_requested_at: "2026-11-12T19:00:00Z",
  subtotal_minor: 2400,
  tip_minor: 0,
  tax_minor: 0,
  service_fee_minor: 0,
  total_minor: 2400,
  items: [
    {
      order_id: "o1",
      order_number: 1,
      name: "Паста",
      quantity: 2,
      unit_price_minor: 1200,
      total_minor: 2400,
    },
  ],
};
const quiet: OpenTableBill = {
  ...bill,
  id: "bill-03",
  table_identifier: "03",
  payment_requested_at: null,
};

const show = () =>
  render(
    <I18nProvider initialLocale="ru">
      <TableBillRequests venueID="venue" />
    </I18nProvider>,
  );
const poll = () =>
  act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

it("lists the tables that called for the bill and notices a new call", async () => {
  vi.mocked(listOpenBills).mockResolvedValueOnce([quiet]).mockResolvedValueOnce([bill, quiet]);
  show();
  expect(await screen.findByText("Сейчас никто не просит счёт.")).toBeInTheDocument();
  await poll();
  expect(await screen.findByRole("alert")).toHaveTextContent("Стол 07 просит рассчитать");
  const panel = screen.getByRole("region", { name: "Ожидают расчёта" });
  expect(within(panel).getByRole("button", { name: /Стол 07/ })).toHaveTextContent("€24.00");
  // Bills nobody asked for are one click away.
  expect(within(panel).queryByRole("button", { name: /Стол 03/ })).not.toBeInTheDocument();
  fireEvent.click(within(panel).getByRole("button", { name: "Все открытые счета (2)" }));
  expect(within(panel).getByRole("button", { name: /Стол 03/ })).toBeInTheDocument();
  // Opening the call clears the notice.
  fireEvent.click(within(panel).getByRole("button", { name: /Стол 07/ }));
  expect(screen.queryByText("Стол 07 просит рассчитать")).not.toBeInTheDocument();
});

it("confirms an in-person payment with the checked amount and method", async () => {
  vi.mocked(listOpenBills).mockResolvedValueOnce([bill]).mockResolvedValue([]);
  vi.mocked(settleBill).mockResolvedValue({
    bill_id: bill.id,
    table_identifier: "07",
    status: "paid",
    amount_minor: 2400,
    currency: "EUR",
    method: "card",
    settled_at: "2026-11-12T19:05:00Z",
  });
  show();
  fireEvent.click(await screen.findByRole("button", { name: /Стол 07/ }));
  const dialog = screen.getByRole("dialog", { name: "Расчёт · стол 07" });
  expect(within(dialog).getByText(/Паста/)).toBeInTheDocument();
  const confirm = within(dialog).getByRole("button", { name: /Оплата €24\.00 получена/ });
  // A method must be chosen: calling the staff or opening the bill is not a payment.
  expect(confirm).toBeDisabled();
  fireEvent.click(within(dialog).getByLabelText("Карта"));
  await act(async () => {
    fireEvent.click(confirm);
  });
  expect(settleBill).toHaveBeenCalledWith("venue", "bill-07", {
    expected_total_minor: 2400,
    method: "card",
  });
  expect(await screen.findByRole("status")).toHaveTextContent("Стол 07: оплата €24.00 подтверждена");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("asks to check the bill again when it changed before the confirmation", async () => {
  const grown = { ...bill, total_minor: 3600, subtotal_minor: 3600 };
  vi.mocked(listOpenBills).mockResolvedValueOnce([bill]).mockResolvedValue([grown]);
  vi.mocked(settleBill)
    .mockRejectedValueOnce(new APIError("bill_changed", "changed", 409))
    .mockResolvedValueOnce({
      bill_id: bill.id,
      table_identifier: "07",
      status: "paid",
      amount_minor: 3600,
      currency: "EUR",
      method: "cash",
      settled_at: "2026-11-12T19:06:00Z",
    });
  show();
  fireEvent.click(await screen.findByRole("button", { name: /Стол 07/ }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByLabelText("Наличные"));
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: /получена/ }));
  });
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Сумма изменилась: было €24.00, стало €36.00",
  );
  const confirm = within(dialog).getByRole("button", { name: /Оплата €36\.00 получена/ });
  expect(confirm).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Сумма сверена" }));
  await act(async () => {
    fireEvent.click(confirm);
  });
  expect(settleBill).toHaveBeenLastCalledWith("venue", "bill-07", {
    expected_total_minor: 3600,
    method: "cash",
  });
});

it("translates the settlement labels", () => {
  for (const locale of ["en", "ua", "sk"] as const)
    for (const label of [
      "Ожидают расчёта",
      "Стол {number} просит рассчитать",
      "Способ оплаты",
      "Наличные",
      "Карта",
      "Оплата {amount} получена",
      "Сумма изменилась: было {old}, стало {new}. Сверьте счёт с гостями ещё раз.",
    ])
      expect(translate(label, locale)).not.toBe(label);
});
