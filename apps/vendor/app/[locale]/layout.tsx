import { notFound } from "next/navigation";
import { isLocale } from "@pocket/features/pocket/locales";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // /uk/... is redirected to /ua/... in next.config.ts before it gets here.
  if (!isLocale((await params).locale)) notFound();
  return children;
}
