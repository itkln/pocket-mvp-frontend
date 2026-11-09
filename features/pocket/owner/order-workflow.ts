import type { OwnerOrder } from "../../../lib/owner-api";
export const orderStatusLabels: Record<OwnerOrder["status"], string> = { new: "Новый", accepted: "Принят", preparing: "Готовится", ready: "Готов", served: "Подан", completed: "Завершен", cancelled: "Отменен" };
export const isFinalOrder = (order: OwnerOrder) => order.status === "completed" || order.status === "cancelled";
function statusAction(order: OwnerOrder): { status: OwnerOrder["status"]; label: string } | null {
  switch (order.status) {
    case "new": return { status: "accepted", label: "Принять заказ" };
    case "accepted": return { status: "preparing", label: "Начать приготовление" };
    case "preparing": return { status: "ready", label: "Заказ готов" };
    case "ready": return order.channel === "pickup" ? { status: "completed", label: "Выдать заказ" } : { status: "served", label: "Заказ подан" };
    case "served": return { status: "completed", label: "Завершить заказ" };
    default: return null;
  }
}
export function orderGroup(order: OwnerOrder, now: number, leadMinutes = 0) {
  if (isFinalOrder(order)) return "history";
  if (order.reservation_starts_at && new Date(order.reservation_starts_at).getTime() - leadMinutes*60000 > now && ["new", "accepted"].includes(order.status)) return "scheduled";
  if (order.status === "new") return "new";
  if (order.status === "ready") return "ready";
  if (order.status === "served") return "served";
  return "working";
}

export function nextOrderAction(order: OwnerOrder) {
  const action = statusAction(order);
  return action && (order.allowed_actions?.includes(action.status)) ? action : null;
}
