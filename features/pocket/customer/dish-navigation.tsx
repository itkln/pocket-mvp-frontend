"use client";

import { createContext } from "react";

// Account screens always belong to the restaurant or table link the guest opened.
export const DishNavigationContext = createContext<{
  basePath: string;
  onLogout?: () => void;
} | null>(null);
