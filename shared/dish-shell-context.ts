"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "../lib/auth-api";

// What the Dish layout shares with the pages under /r/[venueID] and /qr/[token].
export type DishShell = {
  venueID?: string;
  qrToken?: string;
  basePath: string;
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  notify: (message: string) => void;
  menuQuery: string;
  navigate: (screen: string) => void;
  signOut: () => void;
  editProfile: () => void;
  openSettings: (page: "menu" | "language") => void;
};

export const DishShellContext = createContext<DishShell | null>(null);

export function useDishShell() {
  const shell = useContext(DishShellContext);
  if (!shell) throw new Error("Dish pages must be rendered inside the Dish layout");
  return shell;
}
