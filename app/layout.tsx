import type { Metadata } from "next";
import { ConfirmProvider } from "../features/pocket/confirm-dialog";
import { I18nProvider } from "../features/pocket/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pocket | Venue operations",
  description: "Orders, reservations, payments, and venue operations in one place.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body><I18nProvider><ConfirmProvider>{children}</ConfirmProvider></I18nProvider></body>
    </html>
  );
}
