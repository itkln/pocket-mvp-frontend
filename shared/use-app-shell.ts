"use client";

import { useCallback, useEffect, useState } from "react";
import { sidebarCollapsedKey } from "../features/pocket/model";
import { type AppNotification } from "../features/pocket/navigation";

export function useAppShell() {
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
    setNotifications((current) => [{ id: Date.now(), message, createdAt: Date.now(), read: false }, ...current].slice(0, 20));
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const markNotificationsRead = () => setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  const clearNotifications = () => setNotifications([]);

  return {
    toast,
    notifications,
    mobileNav,
    sidebarCollapsed,
    setMobileNav,
    toggleSidebar,
    notify,
    markNotificationsRead,
    clearNotifications,
  };
}
