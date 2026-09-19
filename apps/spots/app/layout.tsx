import type { Metadata } from "next";
import { Providers } from "../../../shared/providers";
import "../../../shared/globals.css";
import "../../../shared/spots.css";

export const metadata: Metadata = {
  title: "Pocket Spots",
  description: "Места, услуги и бронирование в вашем городе.",
  referrer: "no-referrer",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><Providers>{children}</Providers></body></html>;
}
