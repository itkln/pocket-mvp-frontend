import type { OwnerOrder, OrderAlertSettings } from "../../../lib/owner-api";
export const defaultOrderAlerts: OrderAlertSettings = {
  warning_minutes: 10,
  critical_minutes: 20,
  warning_color: "#F59E0B",
  critical_color: "#EF4444",
  preorder_lead_minutes: 30,
  can_edit: false,
};
export function preparationStartsAt(order: OwnerOrder, leadMinutes: number) {
  const received = Date.parse(order.placed_at || order.created_at);
  return order.reservation_starts_at
    ? Math.max(received, Date.parse(order.reservation_starts_at) - leadMinutes * 60000)
    : received;
}
export function orderWaiting(order: OwnerOrder, now: number, settings = defaultOrderAlerts) {
  if (order.status !== "new" && order.status !== "accepted") return null;
  if (order.reservation_status === "cancelled") return null;
  const start = preparationStartsAt(order, settings.preorder_lead_minutes);
  if (!Number.isFinite(start) || now < start) return null;
  const minutes = Math.max(0, Math.floor((now - start) / 60000));
  const color =
    minutes >= settings.critical_minutes
      ? settings.critical_color
      : minutes >= settings.warning_minutes
        ? settings.warning_color
        : undefined;
  return { minutes, color };
}
export function textOnColor(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? "#17212b" : "#ffffff";
}

// Brand blue and red alerts use white ink; light custom colors keep dark ink.
export function ticketTextColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const blue = b > r * 1.2 && b > g && r < 130;
  const red = r > g * 1.5 && r > b * 1.5 && g < 130;
  return blue || red ? "#ffffff" : textOnColor(hex);
}
