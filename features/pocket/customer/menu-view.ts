"use client";

import { useSyncExternalStore } from "react";

export type MenuView = "grid" | "list";
export const menuViewStorageKey = "pocket:menu-view";
const changeEvent = "pocket:menu-view-change";
let fallback: MenuView = "grid";
const snapshot = (): MenuView => {
  try {
    return localStorage.getItem(menuViewStorageKey) === "list" ? "list" : "grid";
  } catch {
    return fallback;
  }
};
const subscribe = (notify: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === menuViewStorageKey) notify();
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener("storage", onStorage);
  };
};
export function useMenuView() {
  const view = useSyncExternalStore(subscribe, snapshot, (): MenuView => "grid");
  const setView = (next: MenuView) => {
    fallback = next;
    try {
      localStorage.setItem(menuViewStorageKey, next);
    } catch {
      /* Storage may be disabled. Keep this session's choice. */
    }
    window.dispatchEvent(new Event(changeEvent));
  };
  return [view, setView] as const;
}
