"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, Bookmark, CalendarDays, Check, ChevronRight, Globe, LogIn, LogOut, MapPin, Menu, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { localeOptions, useI18n } from "../i18n";
import { replacePathLocale } from "../locales";
import { userInitials } from "../model";
import { type AuthUser } from "../../../lib/auth-api";

type SpotsNavigationProps = {
  user: AuthUser | null;
  screen: string;
  city: string;
  onCityChange: (city: string) => void;
  searchQuery: string;
  categoryLabel?: string;
  onClearCategory?: () => void;
  onSearch: (value: string) => void;
  onNavigate: (screen: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onEditProfile?: () => void;
  onAccountSection?: (section: "profile" | "security" | "notifications") => void;
};

export const spotsCities = ["Братислава", "Кошице", "Трнава", "Нитра", "Жилина"];

export function SpotsHeader({ user, screen, city, onCityChange, searchQuery, categoryLabel, onClearCategory, onSearch, onNavigate, onLogin, onLogout, onAccountSection }: SpotsNavigationProps) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const cityDialog = useRef<HTMLDialogElement>(null);
  const languageDialog = useRef<HTMLDialogElement>(null);
  const mobileMenuDialog = useRef<HTMLDialogElement>(null);
  const accountRoot = useRef<HTMLElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const languageTrigger = useRef<HTMLButtonElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileMenuView, setMobileMenuView] = useState<"menu" | "city" | "language">("menu");
  const [scrolled, setScrolled] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 0);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);
  useEffect(() => {
    if (!accountOpen && !languageOpen) return;
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
  const selectLanguage = (value: (typeof localeOptions)[number]["value"]) => {
    setLocale(value);
    setLanguageOpen(false);
    languageDialog.current?.close();
    mobileMenuDialog.current?.close();
    setMobileMenuView("menu");
    router.replace(`${replacePathLocale(pathname, value)}${window.location.search}`);
  };
  const accountItems = [
    { label: "Личные данные", screen: "profile", icon: UserRound, accountSection: "profile" as const },
    { label: "Мои брони", screen: "reservations", icon: CalendarDays },
    { label: "Сохранённые места", screen: "saved", icon: Bookmark },
    { label: "Уведомления", screen: "notifications", icon: Bell, accountSection: "notifications" as const },
    { label: "Безопасность", screen: "settings", icon: ShieldCheck, accountSection: "security" as const },
  ];
  const matchingCities = spotsCities.filter((name) => name.toLocaleLowerCase("ru").includes(cityQuery.trim().toLocaleLowerCase("ru")));
  const accountScreen = ["profile", "settings", "notifications"].includes(screen);
  return <header className={`spots-header ${user ? "signed-in" : "guest"} ${city ? "has-city" : "needs-city"} ${categoryLabel ? "has-category" : ""} ${scrolled ? "scrolled" : ""} ${accountScreen ? "account-screen" : ""}`}>
    <div className="spots-header-inner">
      <button type="button" className="spots-brand" onClick={() => onNavigate("discover")} aria-label="Pocket Spots, главная">
        <Image src="/logo.svg" alt="" width={30} height={30} priority />
        <strong>Pocket Spots</strong>
      </button>
      <div className={`spots-global-search ${categoryLabel ? "has-context" : ""}`} role="search">
        <Search size={19} />
        {categoryLabel && <button type="button" className="spots-search-context" aria-label={t("Сбросить категорию")} onClick={onClearCategory}><span>{t(categoryLabel)}</span><X size={15} /></button>}
        <input value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder={t(categoryLabel ? "Искать в категории" : "Найти место или услугу")} aria-label={categoryLabel ? `${t("Поиск")}: ${t(categoryLabel)}` : t("Найти место или услугу")} />
      </div>
      <button type="button" className={`spots-location ${city ? "" : "spots-location-cta"}`} aria-label={city ? `Выбрать город: ${city}` : t("Выбрать место")} aria-haspopup="dialog" onClick={() => { setCityQuery(""); cityDialog.current?.showModal(); }}>
        <MapPin size={18} />
        <span><b>{city ? t(city) : t("Выбрать место")}</b></span>
      </button>
      <nav ref={accountRoot} className="spots-header-actions" aria-label="Действия гостя" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setAccountOpen(false); setLanguageOpen(false); } }}>
        <span className="spots-language-control">
          <button ref={languageTrigger} type="button" className={`spots-language-trigger ${languageOpen ? "active" : ""}`} aria-label={t("Язык интерфейса")} data-tooltip={t("Язык интерфейса")} data-tooltip-placement="bottom" aria-haspopup="menu" aria-expanded={languageOpen} aria-controls={languageOpen ? "spots-language-menu" : undefined} onClick={() => {
            setAccountOpen(false);
            if (window.matchMedia("(max-width: 760px)").matches) languageDialog.current?.showModal();
            else setLanguageOpen(!languageOpen);
          }}><Globe size={22} /></button>
          {languageOpen && <div className="spots-language-menu" id="spots-language-menu" role="menu" aria-label={t("Язык интерфейса")}>
            {localeOptions.map((option) => <button type="button" role="menuitem" key={option.value} lang={option.value === "ua" ? "uk" : option.value} onClick={() => selectLanguage(option.value)}><span>{option.label}</span>{locale === option.value && <Check size={18} />}</button>)}
          </div>}
        </span>
        {user ? <button ref={accountTrigger} type="button" className={`spots-account-trigger ${screen === "profile" || accountOpen ? "active" : ""}`} onClick={() => { setLanguageOpen(false); setAccountOpen(!accountOpen); }} aria-label={t("Меню аккаунта")} data-tooltip={t("Меню аккаунта")} data-tooltip-placement="bottom" aria-haspopup="menu" aria-expanded={accountOpen} aria-controls={accountOpen ? "spots-account-menu" : undefined}>
          {user.avatar_url ? <i style={{ backgroundImage: `url("${user.avatar_url}")` }} /> : <i>{userInitials(user)}</i>}
        </button> : <button type="button" className="spots-login-trigger" onClick={onLogin}><LogIn size={18} aria-hidden="true" /><span>{t("Войти")}</span></button>}
        {!user && <button type="button" className="spots-mobile-menu-trigger" aria-label={t("Открыть меню")} aria-haspopup="dialog" onClick={() => { setMobileMenuView("menu"); mobileMenuDialog.current?.showModal(); }}><Menu size={24} /></button>}
        {user && accountOpen && <div className="spots-account-menu" id="spots-account-menu" role="menu" aria-label="Аккаунт" onKeyDown={(event) => {
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === "ArrowDown" ? (index + 1) % items.length : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
          if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
        }}>
          <div className="spots-account-menu-heading">{[user.first_name, user.last_name].filter(Boolean).join(" ") || "Аккаунт"}</div>
          {accountItems.map(({ label, screen: target, icon: Icon, accountSection }) => <button key={`${target}-${label}`} type="button" role="menuitem" onClick={() => {
            setAccountOpen(false);
            if (accountSection && onAccountSection) onAccountSection(accountSection);
            else onNavigate(target);
          }}><Icon size={20} /><span>{t(label)}</span></button>)}
          <button type="button" role="menuitem" className="spots-account-logout" onClick={() => { setAccountOpen(false); onLogout(); }}><LogOut size={18} /><span>{t("Выйти")}</span></button>
        </div>}
      </nav>
    </div>
    <dialog ref={cityDialog} className="spots-picker-dialog" aria-labelledby="spots-city-title" onClick={(event) => { if (event.target === event.currentTarget) cityDialog.current?.close(); }}>
      <div className="spots-picker-content">
        <div className="spots-picker-heading"><h2 id="spots-city-title">Ваш город</h2><button type="button" className="icon-button" aria-label="Закрыть выбор города" data-tooltip="Закрыть" data-tooltip-placement="bottom" onClick={() => cityDialog.current?.close()}><X size={20} /></button></div>
        <label className="spots-picker-search"><Search size={18} /><input aria-label="Найти город" placeholder="Найти город" value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} /></label>
        <div className="spots-city-options">
          {matchingCities.map((name) => <button type="button" key={name} aria-pressed={city === name} onClick={() => { onCityChange(name); cityDialog.current?.close(); }}><span>{name}</span>{city === name && <Check size={18} />}</button>)}
          {!matchingCities.length && <p>Город не найден</p>}
        </div>
      </div>
    </dialog>
    <dialog ref={languageDialog} className="spots-language-dialog" aria-labelledby="spots-language-dialog-title" onClick={(event) => { if (event.target === event.currentTarget) languageDialog.current?.close(); }}>
      <div className="spots-language-dialog-content">
        <div className="spots-picker-heading"><h2 id="spots-language-dialog-title">{t("Язык интерфейса")}</h2><button type="button" className="icon-button" aria-label={t("Закрыть")} onClick={() => languageDialog.current?.close()}><X size={20} /></button></div>
        <div className="spots-language-dialog-options">
          {localeOptions.map((option) => <button type="button" key={option.value} lang={option.value === "ua" ? "uk" : option.value} aria-pressed={locale === option.value} onClick={() => selectLanguage(option.value)}><span>{option.label}</span>{locale === option.value && <Check size={18} />}</button>)}
        </div>
      </div>
    </dialog>
    {!user && <dialog ref={mobileMenuDialog} className="spots-mobile-menu-dialog" aria-labelledby="spots-mobile-menu-title">
      <div className="spots-mobile-menu-shell">
        <div className="spots-mobile-menu-heading">
          <button type="button" className="spots-back-button" aria-label={t("Назад")} onClick={() => { if (mobileMenuView === "menu") mobileMenuDialog.current?.close(); else setMobileMenuView("menu"); }}><ArrowLeft size={26} /></button>
          <h2 id="spots-mobile-menu-title">{t(mobileMenuView === "city" ? "Город" : mobileMenuView === "language" ? "Язык интерфейса" : "Меню")}</h2>
          <span aria-hidden="true" />
        </div>
        {mobileMenuView === "menu" && <div className="spots-mobile-menu-content">
          <section className="spots-mobile-menu-card spots-mobile-auth-card">
            <h3>{t("Войдите в аккаунт")}</h3>
            <p>{t("Сохраняйте места и управляйте бронированиями.")}</p>
            <button type="button" className="spots-mobile-login" onClick={() => { mobileMenuDialog.current?.close(); onLogin(); }}>{t("Войти")}</button>
          </section>
          <section className="spots-mobile-menu-card spots-mobile-settings-card" aria-label={t("Меню")}>
            <button type="button" className="spots-mobile-menu-row" aria-label={`${t("Город")}: ${city ? t(city) : t("Выбрать место")}`} onClick={() => setMobileMenuView("city")}>
              <MapPin size={21} /><span><strong>{city ? t(city) : t("Выбрать место")}</strong></span><ChevronRight size={21} />
            </button>
            <button type="button" className="spots-mobile-menu-row" aria-label={`${t("Язык интерфейса")}: ${localeOptions.find((option) => option.value === locale)?.label ?? locale.toUpperCase()}`} onClick={() => setMobileMenuView("language")}>
              <Globe size={21} /><span><strong>{localeOptions.find((option) => option.value === locale)?.label}</strong></span><ChevronRight size={21} />
            </button>
          </section>
        </div>}
        {mobileMenuView === "city" && <div className="spots-mobile-menu-content spots-mobile-menu-subpage">
          <section className="spots-mobile-menu-card spots-mobile-selection-card" aria-label={t("Город")}>
            <div className="spots-mobile-selection-options">
              {spotsCities.map((name) => <button type="button" key={name} aria-pressed={city === name} onClick={() => { onCityChange(name); setMobileMenuView("menu"); }}><span>{t(name)}</span>{city === name && <Check size={19} />}</button>)}
            </div>
          </section>
        </div>}
        {mobileMenuView === "language" && <div className="spots-mobile-menu-content spots-mobile-menu-subpage">
          <section className="spots-mobile-menu-card spots-mobile-selection-card" aria-label={t("Язык интерфейса")}>
            <div className="spots-mobile-selection-options">
              {localeOptions.map((option) => <button type="button" key={option.value} lang={option.value === "ua" ? "uk" : option.value} aria-pressed={locale === option.value} onClick={() => selectLanguage(option.value)}><span>{option.label}</span>{locale === option.value && <Check size={19} />}</button>)}
            </div>
          </section>
        </div>}
      </div>
    </dialog>}
  </header>;
}

const mobileItems = [
  { id: "saved", label: "Избранное", icon: Bookmark },
  { id: "reservations", label: "Мои брони", icon: CalendarDays },
  { id: "profile", label: "Профиль", icon: UserRound },
];

export function SpotsBottomNavigation({ screen, onNavigate }: Pick<SpotsNavigationProps, "screen" | "onNavigate">) {
  const { t } = useI18n();
  return <nav className="spots-bottom-nav" aria-label="Основная навигация Pocket Spots">
    {mobileItems.map(({ id, label, icon: Icon }) => {
      const active = screen === id || (id === "profile" && ["settings", "notifications"].includes(screen)) || (id === "reservations" && screen === "reservation");
      return <button type="button" key={id} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => onNavigate(id)}><Icon size={22} /><span>{t(label)}</span></button>;
    })}
  </nav>;
}
