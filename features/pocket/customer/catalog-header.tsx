"use client";

import Image from "next/image";
import { useScrollHeader } from "./use-scroll-header";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Globe,
  LogIn,
  LogOut,
  Menu,
  Receipt,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { localeOptions, useI18n } from "../i18n";
import { replacePathLocale } from "../locales";
import { userInitials } from "../model";
import { isUpcomingReservation, listCustomerReservations } from "../../../lib/reservations-api";
import { type AuthUser } from "../../../lib/auth-api";

type DishCatalogHeaderProps = {
  searchAutoFocus?: boolean;
  showSearch?: boolean;
  user: AuthUser | null;
  screen: string;
  searchQuery: string;
  onSearch: (value: string) => void;
  onNavigate: (screen: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onOrderHistory?: () => void;
  onAccountSection?: (section: "profile" | "security" | "notifications") => void;
};

const productName = "Pocket Dish";

// Top bar of Dish: brand, menu search, language and account controls.
export function DishCatalogHeader({
  searchAutoFocus = false,
  showSearch = true,
  user,
  screen,
  searchQuery,
  onSearch,
  onNavigate,
  onLogin,
  onLogout,
  onOrderHistory,
  onAccountSection,
}: DishCatalogHeaderProps) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const languageDialog = useRef<HTMLDialogElement>(null);
  const mobileMenuDialog = useRef<HTMLDialogElement>(null);
  const accountRoot = useRef<HTMLElement>(null);
  const accountOpenedByKeyboard = useRef(false);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const languageTrigger = useRef<HTMLButtonElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const userID = user?.id;
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileMenuView, setMobileMenuView] = useState<"menu" | "language">("menu");
  const headerHidden = useScrollHeader();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 0);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);
  useEffect(() => {
    if (!accountOpen && !languageOpen) return;
    if (languageOpen || accountOpenedByKeyboard.current)
      accountRoot.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRoot.current?.contains(event.target as Node)) {
        setAccountOpen(false);
        setLanguageOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setLanguageOpen(false);
        (languageOpen ? languageTrigger : accountTrigger).current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen, languageOpen]);
  useEffect(() => {
    if (!accountOpen || !userID) return;
    const controller = new AbortController();
    void listCustomerReservations(controller.signal)
      .then((reservations) => {
        if (controller.signal.aborted) return;
        const now = Date.now();
        setUpcomingCount(
          reservations.filter((reservation) => isUpcomingReservation(reservation, now)).length,
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [accountOpen, userID]);
  const selectLanguage = (value: (typeof localeOptions)[number]["value"]) => {
    setLocale(value);
    setLanguageOpen(false);
    languageDialog.current?.close();
    mobileMenuDialog.current?.close();
    setMobileMenuView("menu");
    router.replace(`${replacePathLocale(pathname, value)}${window.location.search}`);
  };
  const accountItems = [
    {
      label: "Личные данные",
      screen: "profile",
      icon: UserRound,
      accountSection: "profile" as const,
    },
    { label: "Мои брони", screen: "reservations", icon: CalendarDays },
    ...(onOrderHistory
      ? [{ label: "История заказов", screen: "order-history", icon: Receipt }]
      : []),
    {
      label: "Уведомления",
      screen: "notifications",
      icon: Bell,
      accountSection: "notifications" as const,
    },
    {
      label: "Безопасность",
      screen: "settings",
      icon: ShieldCheck,
      accountSection: "security" as const,
    },
  ];
  const accountScreen = ["profile", "settings", "notifications"].includes(screen);
  return (
    <header
      aria-label={t("Навигация {product}", { product: productName })}
      className={`dish-catalog-header dish-catalog-dish-header ${headerHidden ? "scroll-header-hidden" : ""} ${user ? "signed-in" : "guest"} needs-city ${scrolled ? "scrolled" : ""} ${accountScreen ? "account-screen" : ""}`}
    >
      <div className="dish-header-inner">
        <button
          type="button"
          className="dish-catalog-brand"
          onClick={() => onNavigate("discover")}
          aria-label={t("{product}, главная", { product: productName })}
        >
          <Image src="/logo.svg" alt="" width={30} height={30} priority />
          <strong>{productName}</strong>
        </button>
        {showSearch && (
          <div className="dish-global-search" role="search">
            <Search size={19} />
            <input
              autoFocus={searchAutoFocus}
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={t("Поиск по меню")}
              aria-label={t("Поиск по меню")}
            />
          </div>
        )}
        <nav
          ref={accountRoot}
          className="dish-header-actions"
          aria-label={t("Действия гостя")}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setAccountOpen(false);
              setLanguageOpen(false);
            }
          }}
        >
          <span className="dish-language-control">
            <button
              ref={languageTrigger}
              type="button"
              className={`dish-language-trigger ${languageOpen ? "active" : ""}`}
              aria-label={t("Язык интерфейса")}
              data-tooltip={t("Язык интерфейса")}
              data-tooltip-placement="bottom"
              aria-haspopup="menu"
              aria-expanded={languageOpen}
              aria-controls={languageOpen ? "dish-language-menu" : undefined}
              onClick={() => {
                setAccountOpen(false);
                if (window.matchMedia("(max-width: 760px)").matches)
                  languageDialog.current?.showModal();
                else setLanguageOpen(!languageOpen);
              }}
            >
              <Globe size={22} aria-hidden="true" />
              <span className="dish-language-code" aria-hidden="true">
                {localeOptions.find((option) => option.value === locale)?.short}
              </span>
            </button>
            {languageOpen && (
              <div
                className="dish-language-menu"
                id="dish-language-menu"
                role="menu"
                aria-label={t("Язык интерфейса")}
              >
                {localeOptions.map((option) => (
                  <button
                    type="button"
                    role="menuitem"
                    key={option.value}
                    lang={option.value === "ua" ? "uk" : option.value}
                    onClick={() => selectLanguage(option.value)}
                  >
                    <span>{option.label}</span>
                    {locale === option.value && <Check size={18} />}
                  </button>
                ))}
              </div>
            )}
          </span>
          {user ? (
            <button
              ref={accountTrigger}
              type="button"
              className={`dish-account-trigger ${screen === "profile" || accountOpen ? "active" : ""}`}
              onClick={(event) => {
                accountOpenedByKeyboard.current = event.detail === 0;
                setLanguageOpen(false);
                setUpcomingCount(null);
                setAccountOpen(!accountOpen);
              }}
              aria-label={t("Меню аккаунта")}
              data-tooltip={t("Меню аккаунта")}
              data-tooltip-placement="bottom"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls={accountOpen ? "dish-catalog-account-menu" : undefined}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown") return;
                event.preventDefault();
                if (accountOpen) {
                  accountRoot.current
                    ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
                    ?.focus();
                } else event.currentTarget.click();
              }}
            >
              {user.avatar_url ? (
                <i style={{ backgroundImage: `url("${user.avatar_url}")` }} />
              ) : (
                <i>{userInitials(user)}</i>
              )}
            </button>
          ) : (
            <button type="button" className="dish-login-trigger" onClick={onLogin}>
              <LogIn size={18} aria-hidden="true" />
              <span>{t("Войти")}</span>
            </button>
          )}
          {!user && (
            <button
              type="button"
              className="dish-mobile-menu-trigger"
              aria-label={t("Открыть меню")}
              aria-haspopup="dialog"
              onClick={() => {
                setMobileMenuView("menu");
                mobileMenuDialog.current?.showModal();
              }}
            >
              <Menu size={24} />
            </button>
          )}
          {user && accountOpen && (
            <div
              className="dish-catalog-account-menu"
              id="dish-catalog-account-menu"
              role="menu"
              aria-label={t("Аккаунт")}
              onKeyDown={(event) => {
                const items = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
                );
                const index = items.indexOf(document.activeElement as HTMLButtonElement);
                const next =
                  event.key === "ArrowDown"
                    ? (index + 1) % items.length
                    : event.key === "ArrowUp"
                      ? (index - 1 + items.length) % items.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? items.length - 1
                          : -1;
                if (next >= 0) {
                  event.preventDefault();
                  items[next]?.focus();
                }
              }}
            >
              <div className="dish-account-menu-heading">
                <span
                  className="dish-account-menu-avatar"
                  aria-hidden="true"
                  style={
                    user.avatar_url
                      ? { backgroundImage: `url(${JSON.stringify(user.avatar_url)})` }
                      : undefined
                  }
                >
                  {!user.avatar_url && userInitials(user)}
                </span>
                <div className="dish-account-menu-identity">
                  <strong>
                    {[user.first_name, user.last_name].filter(Boolean).join(" ") || t("Аккаунт")}
                  </strong>
                  <span>{user.email}</span>
                </div>
              </div>
              {accountItems.map(({ label, screen: target, icon: Icon, accountSection }) => (
                <button
                  key={`${target}-${label}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                    if (target === "order-history") onOrderHistory?.();
                    else if (accountSection && onAccountSection) onAccountSection(accountSection);
                    else onNavigate(target);
                  }}
                >
                  <Icon size={20} />
                  <span>{t(label)}</span>
                  {target === "reservations" && upcomingCount !== null && upcomingCount > 0 && (
                    <span className="dish-account-menu-count" aria-hidden="true">
                      {upcomingCount}
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                className="dish-catalog-account-logout"
                onClick={() => {
                  setAccountOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={18} />
                <span>{t("Выйти")}</span>
              </button>
            </div>
          )}
        </nav>
      </div>
      <dialog
        ref={languageDialog}
        className="dish-language-dialog"
        aria-labelledby="dish-language-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) languageDialog.current?.close();
        }}
      >
        <div className="dish-language-dialog-content">
          <div className="dish-picker-heading">
            <h2 id="dish-language-dialog-title">{t("Язык интерфейса")}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label={t("Закрыть")}
              onClick={() => languageDialog.current?.close()}
            >
              <X size={20} />
            </button>
          </div>
          <div className="dish-language-dialog-options">
            {localeOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                lang={option.value === "ua" ? "uk" : option.value}
                aria-pressed={locale === option.value}
                onClick={() => selectLanguage(option.value)}
              >
                <span>{option.label}</span>
                {locale === option.value && <Check size={18} />}
              </button>
            ))}
          </div>
        </div>
      </dialog>
      {!user && (
        <dialog
          ref={mobileMenuDialog}
          className="dish-mobile-menu-dialog"
          aria-labelledby="dish-mobile-menu-title"
        >
          <div className="dish-mobile-menu-shell">
            <div className="dish-mobile-menu-heading">
              <button
                type="button"
                className="dish-back-button"
                aria-label={t("Назад")}
                onClick={() => {
                  if (mobileMenuView === "menu") mobileMenuDialog.current?.close();
                  else setMobileMenuView("menu");
                }}
              >
                <ArrowLeft size={26} />
              </button>
              <h2 id="dish-mobile-menu-title">
                {mobileMenuView === "menu" ? (
                  <span className="dish-menu-brand">
                    <Image src="/logo.svg" alt="" width={30} height={30} />
                    {productName}
                  </span>
                ) : (
                  t("Язык интерфейса")
                )}
              </h2>
              <span aria-hidden="true" />
            </div>
            {mobileMenuView === "menu" && (
              <div className="dish-mobile-menu-content">
                <section className="dish-mobile-menu-card dish-mobile-auth-card">
                  <h3>{t("Войдите в аккаунт")}</h3>
                  <p>{t("Сохраняйте места и управляйте бронированиями.")}</p>
                  <button
                    type="button"
                    className="dish-mobile-login"
                    onClick={() => {
                      mobileMenuDialog.current?.close();
                      onLogin();
                    }}
                  >
                    {t("Войти")}
                  </button>
                </section>
                <section
                  className="dish-mobile-menu-card dish-mobile-settings-card"
                  aria-label={t("Меню")}
                >
                  <button
                    type="button"
                    className="dish-mobile-menu-row"
                    aria-label={`${t("Язык интерфейса")}: ${localeOptions.find((option) => option.value === locale)?.label ?? locale.toUpperCase()}`}
                    onClick={() => setMobileMenuView("language")}
                  >
                    <Globe size={21} />
                    <span>
                      <strong>
                        {localeOptions.find((option) => option.value === locale)?.label}
                      </strong>
                    </span>
                    <ChevronRight size={21} />
                  </button>
                </section>
              </div>
            )}
            {mobileMenuView === "language" && (
              <div className="dish-mobile-menu-content dish-mobile-menu-subpage">
                <section
                  className="dish-mobile-menu-card dish-mobile-selection-card"
                  aria-label={t("Язык интерфейса")}
                >
                  <div className="dish-mobile-selection-options">
                    {localeOptions.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        lang={option.value === "ua" ? "uk" : option.value}
                        aria-pressed={locale === option.value}
                        onClick={() => selectLanguage(option.value)}
                      >
                        <span>{option.label}</span>
                        {locale === option.value && <Check size={19} />}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </dialog>
      )}
    </header>
  );
}
