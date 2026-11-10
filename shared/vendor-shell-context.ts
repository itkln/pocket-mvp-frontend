"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "../lib/auth-api";
import type { Venue } from "../features/pocket/model";

export type VendorRole = "owner" | "staff";
export type VendorModal = "item" | "invite" | "order" | "venue";

// What the Vendor layout shares with the pages under /owner/* and /staff/*.
export type VendorShell = {
  role: VendorRole;
  screen: string;
  user: AuthUser;
  setUser: (user: AuthUser) => void;
  venue: Venue | null;
  venueCount: number;
  request?: { id: string; scope: string };
  notify: (message: string) => void;
  navigate: (screen: string) => void;
  openModal: (modal: VendorModal) => void;
  updateVenue: (venue: Venue) => void;
  removeVenue: () => Promise<void>;
  signOut: () => void;
};

export const VendorShellContext = createContext<VendorShell | null>(null);

export function useVendorShell() {
  const shell = useContext(VendorShellContext);
  if (!shell) throw new Error("Vendor pages must be rendered inside the Vendor layout");
  return shell;
}
