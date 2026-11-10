import type { LegacyOrderStatus, OrderStatus, OwnerOrder } from "../../../lib/owner-api";
// Accepted and ready only appear in the history of orders from before 2026-11-10.
export const orderStatusLabels: Record<OrderStatus | LegacyOrderStatus, string> = {
  new: "Новый",
  accepted: "Принят",
  preparing: "Готовится",
  ready: "Готов",
  served: "Отдан",
  completed: "Завершен",
  cancelled: "Отменен",
};
export const isFinalOrder = (order: OwnerOrder) =>
  order.status === "completed" || order.status === "cancelled";
// The waiter passes the order to the kitchen, hands it to the guest, then completes it.
function statusAction(order: OwnerOrder): { status: OwnerOrder["status"]; label: string } | null {
  switch (order.status) {
    case "new":
      return { status: "preparing", label: "Заказ готовится" };
    case "preparing":
      return { status: "served", label: "Заказ отдан" };
    case "served":
      return { status: "completed", label: "Завершить заказ" };
    default:
      return null;
  }
}
export function orderGroup(order: OwnerOrder, now: number, leadMinutes = 0) {
  if (isFinalOrder(order)) return "history";
  if (
    order.reservation_starts_at &&
    new Date(order.reservation_starts_at).getTime() - leadMinutes * 60000 > now &&
    order.status === "new"
  )
    return "scheduled";
  if (order.status === "new") return "new";
  if (order.status === "served") return "served";
  return "working";
}

export function nextOrderAction(order: OwnerOrder) {
  const action = statusAction(order);
  return action && order.allowed_actions?.includes(action.status) ? action : null;
}
