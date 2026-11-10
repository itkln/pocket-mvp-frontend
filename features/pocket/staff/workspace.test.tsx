import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OwnerWorkspaceProvider } from "../owner/context";
import { ConfirmProvider } from "../confirm-dialog";
import { ServiceBoard } from "./service";
import {
  getOrder,
  getOrderAlertSettings,
  getOwnerDashboard,
  loadOrderQueue,
  updateOrderStatus,
  type OwnerOrder,
} from "../../../lib/owner-api";
vi.mock("../../../lib/owner-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/owner-api")>()),
  getOrder: vi.fn(),
  getOrderAlertSettings: vi.fn(),
  getOwnerDashboard: vi.fn(),
  loadOrderQueue: vi.fn(),
  updateOrderStatus: vi.fn(),
}));
const notify = vi.fn();
const order: OwnerOrder = {
  id: "o",
  number: 12,
  status: "new",
  allowed_actions: ["preparing"],
  source: "Стол 09",
  channel: "dine_in",
  created_at: "2026-11-01T12:00:00Z",
  currency: "EUR",
  total_minor: 500,
  items: [{ name: "Реальный суп", quantity: 1, unit_price_minor: 500 }],
};
beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.mocked(loadOrderQueue).mockResolvedValue({ orders: [order], hasMoreHistory: false });
  vi.mocked(getOrder).mockImplementation(async (_venueID, id) => ({ ...order, id }));
  vi.mocked(getOrderAlertSettings).mockResolvedValue({
    warning_minutes: 10,
    critical_minutes: 20,
    warning_color: "#f59e0b",
    critical_color: "#ef4444",
    preorder_lead_minutes: 30,
    can_edit: false,
  });
});
const mount = () =>
  render(
    <ConfirmProvider>
      <OwnerWorkspaceProvider venueID="venue" ordersOnly onError={notify}>
        <ServiceBoard />
      </OwnerWorkspaceProvider>
    </ConfirmProvider>,
  );
it("loads staff data without owner administration requests and saves expected status", async () => {
  mount();
  const action = await screen.findByRole("button", { name: "Заказ готовится" });
  expect(loadOrderQueue).toHaveBeenCalledWith("venue", 1, "staff", expect.any(AbortSignal));
  expect(getOwnerDashboard).not.toHaveBeenCalled();
  vi.mocked(updateOrderStatus).mockResolvedValue({
    ...order,
    status: "preparing",
    allowed_actions: ["served"],
  });
  fireEvent.click(action);
  await screen.findByRole("button", { name: "Заказ отдан" });
  expect(updateOrderStatus).toHaveBeenCalledWith(
    "venue",
    "o",
    "preparing",
    "new",
    "staff",
    undefined,
  );
  expect(screen.getByText("Реальный суп")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Отменить заказ" })).not.toBeInTheDocument();
});
it("keeps the action disabled during save and refreshes a conflict without success", async () => {
  mount();
  const action = await screen.findByRole("button", { name: "Заказ готовится" });
  let reject!: (error: Error) => void;
  vi.mocked(updateOrderStatus).mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  fireEvent.click(action);
  fireEvent.click(action);
  expect(action).toBeDisabled();
  expect(updateOrderStatus).toHaveBeenCalledTimes(1);
  vi.mocked(loadOrderQueue).mockResolvedValue({
    orders: [{ ...order, status: "preparing", allowed_actions: ["served"] }],
    hasMoreHistory: false,
  });
  reject(new Error("conflict"));
  await screen.findByRole("button", { name: "Заказ отдан" });
  expect(screen.getByRole("alert")).toHaveTextContent("Действие не выполнено");
  expect(screen.queryByRole("button", { name: "Заказ готовится" })).not.toBeInTheDocument();
});
it("fails closed when the server does not grant actions", async () => {
  vi.mocked(loadOrderQueue).mockResolvedValue({
    orders: [{ ...order, allowed_actions: undefined }],
    hasMoreHistory: false,
  });
  mount();
  await screen.findByText("Реальный суп");
  expect(screen.queryByRole("button", { name: "Заказ готовится" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Отменить заказ" })).not.toBeInTheDocument();
  await waitFor(() => expect(getOwnerDashboard).not.toHaveBeenCalled());
});
