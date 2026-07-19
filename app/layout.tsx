import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pocket MVP",
  description: "Venue ordering, reservations, payments, and operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

