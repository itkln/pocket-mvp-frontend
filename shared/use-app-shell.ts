"use client";

import { useCallback, useEffect, useState } from "react";
import { sidebarCollapsedKey } from "../features/pocket/model";
import type { OwnerOrder } from "../lib/owner-api";
import { type AppNotification } from "../features/pocket/navigation";

export function useAppShell(scope?: string) {
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", mobileNav);
    return () => document.body.classList.remove("mobile-nav-open");
  }, [mobileNav]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarCollapsed(window.localStorage.getItem(sidebarCollapsedKey) === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(sidebarCollapsedKey, String(next));
      return next;
    });
  };

  const notify = useCallback((message: string) => {
    setToast(message);
    setNotifications((current) =>
      [{ id: Date.now(), message, createdAt: Date.now(), read: false }, ...current].slice(0, 20),
    );
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const notifyOrders = useCallback(
    (orders: OwnerOrder[]) => {
      const entries = orders.map((order) => ({
        id: `${scope}:${order.id}`,
        scope,
        message: "Новый заказ",
        orderNumber: order.number,
        orderID: order.id,
        source: order.source,
        createdAt: Date.now(),
        read: false,
        bannerPending: true,
      }));
      setNotifications((current) => [...entries, ...current].slice(0, 20));
    },
    [scope],
  );

  const dismissOrderBanner = useCallback((id: AppNotification["id"]) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, bannerPending: false } : item)),
    );
  }, []);
  const notificationsInScope = notifications.filter((item) => !item.scope || item.scope === scope);
  const orderBanner = notificationsInScope.find((item) => item.bannerPending);
  const bannerID = orderBanner?.id;
  useEffect(() => {
    if (bannerID === undefined) return;
    const timer = window.setTimeout(() => dismissOrderBanner(bannerID), 8000);
    return () => window.clearTimeout(timer);
  }, [bannerID, dismissOrderBanner]);

  const markNotificationsRead = () =>
    setNotifications((current) =>
      current.map((item) =>
        item.scope && item.scope !== scope ? item : { ...item, read: true, bannerPending: false },
      ),
    );
  const clearNotifications = () => setNotifications([]);

  return {
    toast,
    notifications: notificationsInScope,
    orderBanner,
    dismissOrderBanner,
    notifyOrders,
    mobileNav,
    sidebarCollapsed,
    setMobileNav,
    toggleSidebar,
    notify,
    markNotificationsRead,
    clearNotifications,
  };
}
