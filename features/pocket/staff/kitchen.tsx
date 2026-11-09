"use client";
import { OrdersScreen, type OrderOpenRequest } from "../owner/orders";
import { useI18n } from "../i18n";

// The same server-backed desk is used by every operational role.
// allowed_actions and redacted payloads are authoritative.
export function KitchenScreen({ request }: { request?: OrderOpenRequest } = {}) {
  const { t } = useI18n();
  return <OrdersScreen request={request} title={t("Кухня")} />;
}
