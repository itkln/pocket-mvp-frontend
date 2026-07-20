import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
