"use client";
import { OrdersScreen, type OrderOpenRequest } from "../owner/orders";

// The same server-backed desk is used by every operational role.
// allowed_actions and redacted payloads are authoritative.
export function KitchenScreen({ request }: { request?: OrderOpenRequest } = {}) {
  return <OrdersScreen request={request} title="Кухня" />;
}
