import type { Metadata } from "next";
import { Providers } from "../../../shared/providers";
import "../../../shared/styles/base.css";
import "../../../shared/styles/dish-shell.css";
import "../../../shared/spots.css";
import "../../../shared/dish.css";

export const metadata: Metadata = {
  title: "Pocket Dish",
  description: "Меню ресторана, бронирование и заказ по QR.",
  referrer: "no-referrer",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
