import type { Metadata } from "next";
import { Providers } from "../../../shared/providers";
import "../../../shared/globals.css";

export const metadata: Metadata = {
  title: "Pocket Vendor",
  description: "Управление заведениями, командой, меню и заказами.",
  referrer: "no-referrer",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><Providers>{children}</Providers></body></html>;
}
