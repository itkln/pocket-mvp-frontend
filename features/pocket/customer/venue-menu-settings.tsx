"use client";

import Image from "next/image";
import { useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { localeOptions, useI18n } from "../i18n";
import { replacePathLocale, type Locale } from "../locales";
import { dishAuthPath } from "../../../lib/dish-auth-navigation";
import type { AuthUser } from "../../../lib/auth-api";
import { DishNavigationContext } from "./dish-navigation";
import { DishAccountMenu } from "./dish-account-menu";
import type { MenuView } from "./menu-view";

export function VenueMenuSettings({
  view,
  onViewChange,
  user,
  onClose,
  initialPage = "menu",
}: {
  initialPage?: "menu" | "language";
  view: MenuView;
  onViewChange: (view: MenuView) => void;
  user: AuthUser | null;
  onClose: () => void;
}) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const dishNavigation = useContext(DishNavigationContext);
  const pathname = usePathname();
  const [page, setPage] = useState<"menu" | "language" | "view">(initialPage);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);
  const selectLanguage = (value: Locale) => {
    setLocale(value);
    router.replace(
      `${replacePathLocale(pathname, value)}${window.location.search}${window.location.hash}`,
      { scroll: false },
    );
    onClose();
  };
  const openAccount = () => {
    onClose();
    router.push(
      user
        ? `${dishNavigation?.basePath ?? `/${locale}`}/profile`
        : dishAuthPath(
            locale,
            "login",
            `${pathname}${window.location.search}${window.location.hash}`,
          ),
    );
  };
  const openAccountSection = (target: string) => {
    const destination = `${dishNavigation?.basePath ?? `/${locale}`}/${target}`;
    onClose();
    router.push(user ? destination : dishAuthPath(locale, "login", destination));
  };
  const tableMenu = (dishNavigation?.basePath ?? pathname).split("/")[2] === "qr";
  return (
    <dialog
      ref={dialogRef}
      className="dish-mobile-menu-dialog venue-menu-settings"
      aria-label={t("Настройки меню")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dish-mobile-menu-shell">
        <div className="dish-mobile-menu-heading">
          <button
            type="button"
            className="dish-back-button"
            aria-label={t("Назад")}
            onClick={() => (page === "menu" ? onClose() : setPage("menu"))}
          >
            <ArrowLeft size={26} />
          </button>
          <h2>
            {page === "menu" ? (
              <span className="dish-menu-brand">
                <Image src="/logo.svg" alt="" width={30} height={30} />
                Pocket Dish
              </span>
            ) : (
              t(page === "language" ? "Язык интерфейса" : "Вид меню")
            )}
          </h2>
          <span aria-hidden="true" />
        </div>
        {page === "menu" ? (
          <DishAccountMenu
            onOpenLanguage={() => setPage("language")}
            user={user}
            onNavigate={openAccountSection}
            onLogin={openAccount}
            onLogout={
              dishNavigation?.onLogout
                ? () => {
                    onClose();
                    dishNavigation.onLogout?.();
                  }
                : undefined
            }
            view={view}
            onOpenView={tableMenu ? () => setPage("view") : undefined}
          />
        ) : (
          <div className="dish-mobile-menu-content dish-mobile-menu-subpage">
            <section
              className="dish-mobile-menu-card dish-mobile-selection-card"
              aria-label={t(page === "language" ? "Язык интерфейса" : "Вид меню")}
            >
              <div className="dish-mobile-selection-options">
                {page === "language"
                  ? localeOptions.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        lang={option.value === "ua" ? "uk" : option.value}
                        aria-pressed={locale === option.value}
                        onClick={() => selectLanguage(option.value)}
                      >
                        <span>{option.label}</span>
                        {locale === option.value && <Check size={19} aria-hidden="true" />}
                      </button>
                    ))
                  : (["grid", "list"] as const).map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-label={t(value === "grid" ? "Показать сеткой" : "Показать списком")}
                        aria-pressed={view === value}
                        onClick={() => {
                          onViewChange(value);
                          onClose();
                        }}
                      >
                        <span>{t(value === "grid" ? "Карточки" : "Список")}</span>
                        {view === value && <Check size={19} aria-hidden="true" />}
                      </button>
                    ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </dialog>
  );
}
