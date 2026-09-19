"use client";

import { usePathname } from "next/navigation";
import { ConfirmProvider } from "../features/pocket/confirm-dialog";
import { I18nProvider } from "../features/pocket/i18n";
import { localeFromPathname } from "../features/pocket/locales";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <I18nProvider initialLocale={localeFromPathname(pathname)}><ConfirmProvider>{children}</ConfirmProvider></I18nProvider>;
}
