"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { type AuthUser } from "../../lib/auth-api";
import {
  ArrowRight,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  Store,
  LogOut,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  UserPlus,
  Search,
  Settings,
  ShoppingBag,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type Role,
  type Venue,
  userInitials,
  mobilePrimaryNavigation,
  navigationGroups,
  sidebarFooterNavigation,
  venueRoleLabels,
} from "./model";
import { IconButton } from "./ui";
import { localeOptions, localeTags, useI18n } from "./i18n";
import { replacePathLocale } from "./locales";
import { LocaleFlag } from "./locale-flag";
import { useDismiss } from "./use-dismiss";
import { useNavIndicator } from "./use-nav-indicator";

// The venue switcher at the top of the page. The selected venue decides the workspace: own
// venues open the owner's screens, venues where the user works open the staff screens.
export function VenueSwitcher({
  venue,
  venues,
  onVenue,
}: {
  venue: Venue | null;
  venues: Venue[];
  onVenue: (venue: Venue) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  useDismiss(open, area, () => setOpen(false));
  if (!venue) return null;
  const ownVenues = venues.filter((item) => item.access_role === "owner");
  const workplaces = venues.filter((item) => item.access_role !== "owner");
  const canSwitch = venues.length > 1;
  const roleLabel = (item: Venue) =>
    item.access_role ? t(venueRoleLabels[item.access_role] ?? "") : "";
  const option = (item: Venue, withRole: boolean) => (
    <button
      key={item.id}
      type="button"
      role="menuitemradio"
      aria-checked={item.id === venue.id}
      className={item.id === venue.id ? "active" : ""}
      onClick={() => {
        setOpen(false);
        if (item.id !== venue.id) onVenue(item);
      }}
    >
      <Store className="venue-switcher-icon" size={18} strokeWidth={1.9} aria-hidden="true" />
      <span>
        <strong>{item.name}</strong>
        {withRole && <small>{roleLabel(item)}</small>}
      </span>
      {item.id === venue.id && <Check size={16} />}
    </button>
  );
  return (
    <div className="venue-menu topbar-venue" ref={area}>
      <button
        type="button"
        className={`venue-switcher ${canSwitch ? "can-switch" : ""}`}
        disabled={!canSwitch}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={canSwitch ? open : undefined}
        aria-haspopup={canSwitch ? "menu" : undefined}
      >
        <Store className="venue-switcher-icon" size={20} strokeWidth={1.9} aria-hidden="true" />
        <strong>{venue.name}</strong>
        {canSwitch && <ChevronDown className="venue-switcher-chevron" size={16} />}
      </button>
      {open && (
        <div className="venue-menu-popover" role="menu">
          {ownVenues.length > 0 && (
            <>
              <p className="venue-menu-label">{t("Мои заведения")}</p>
              {ownVenues.map((item) => option(item, false))}
            </>
          )}
          {workplaces.length > 0 && (
            <>
              <p className="venue-menu-label">{t("Где я работаю")}</p>
              {workplaces.map((item) => option(item, true))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// The Vendor sidebar: navigation of the current workspace, venue creation, settings and profile.
export function Sidebar({
  user,
  role,
  brand = "Pocket",
  screen,
  navigation,
  mobileNav,
  collapsed,
  onNavigate,
  onAddVenue,
  onInviteStaff,
  onSignOut,
  onClose,
  onToggleCollapsed,
}: {
  user: AuthUser;
  role: Role;
  brand?: string;
  screen: string;
  navigation: { id: string; label: string; icon: LucideIcon; count?: number }[];
  mobileNav: boolean;
  collapsed: boolean;
  onNavigate: (id: string) => void;
  onAddVenue: () => void;
  onInviteStaff?: () => void;
  onSignOut: () => void;
  onClose: () => void;
  onToggleCollapsed: () => void;
}) {
  const { t } = useI18n();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenu = useRef<HTMLDivElement>(null);
  useDismiss(profileMenuOpen, profileMenu, () => setProfileMenuOpen(false));
  const [sidebarRef, indicatorRef] = useNavIndicator(
    `${screen}:${navigation.map((item) => item.id).join()}`,
  );

  const toggleNavigation = () => {
    if (window.matchMedia("(min-width: 901px)").matches) onToggleCollapsed();
    else onClose();
  };
  const navButton = ({ id, label, icon: Icon, count }: (typeof navigation)[number]) => (
    <button
      key={id}
      className={`${screen === id ? "active" : ""} ${mobilePrimaryNavigation[role].includes(id) ? "mobile-primary-link" : ""} collapsed-tooltip`}
      data-tooltip={collapsed ? t(label) : undefined}
      onClick={() => onNavigate(id)}
      aria-label={collapsed ? `${t(label)}${count ? `, ${count}` : ""}` : undefined}
    >
      <Icon size={20} strokeWidth={1.9} />
      <span>{t(label)}</span>
      {count ? <b>{count}</b> : null}
    </button>
  );
  const footer = sidebarFooterNavigation[role]
    .map((id) => navigation.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <aside className={`sidebar ${mobileNav ? "open" : ""}`} ref={sidebarRef}>
      <span className="nav-indicator" ref={indicatorRef} aria-hidden="true" />
      <div className="brand-row">
        <button
          className="brand-toggle"
          onClick={toggleNavigation}
          aria-label={collapsed ? t("Развернуть навигацию") : t("Свернуть навигацию")}
          title={collapsed ? t("Развернуть навигацию") : t("Свернуть навигацию")}
        >
          <span className="brand-toggle-logo">
            <Image src="/logo.svg" alt="" width={28} height={28} priority />
          </span>
          <span className="brand-toggle-panel">
            {collapsed ? (
              <PanelLeftOpen size={20} strokeWidth={1.9} />
            ) : (
              <PanelLeftClose size={20} strokeWidth={1.9} />
            )}
          </span>
        </button>
        <strong>{brand}</strong>
        <IconButton
          icon={X}
          label={t("Закрыть меню")}
          onClick={onClose}
          className="mobile-sidebar-close"
        />
      </div>
      <div className="sidebar-quick-actions" role="group" aria-label={t("Быстрые действия")}>
        {[
          { label: "Новое заведение", icon: Plus, onClick: onAddVenue },
          ...(onInviteStaff
            ? [{ label: "Новый сотрудник", icon: UserPlus, onClick: onInviteStaff }]
            : []),
        ].map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            className="sidebar-add-venue collapsed-tooltip"
            data-tooltip={collapsed ? t(label) : undefined}
            aria-label={collapsed ? t(label) : undefined}
            onClick={onClick}
          >
            <Icon size={20} strokeWidth={1.9} />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      <nav className="side-nav">
        {navigationGroups[role].map((group) => {
          const items = group.ids
            .map((id) => navigation.find((item) => item.id === id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
          if (!items.length) return null;
          const mobilePrimaryGroup = items.every((item) =>
            mobilePrimaryNavigation[role].includes(item.id),
          );
          return (
            <div
              className={`nav-group ${mobilePrimaryGroup ? "mobile-primary-group" : ""}`}
              key={group.label || "main"}
            >
              {group.label && <p className="nav-label">{t(group.label)}</p>}
              {items.map(navButton)}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        {footer.length > 0 && (
          <nav className="side-nav sidebar-footer-nav" aria-label={t("Настройки")}>
            {footer.map(navButton)}
          </nav>
        )}
        <div className="profile-menu" ref={profileMenu}>
          <button
            type="button"
            className={`user-chip collapsed-tooltip ${screen === "account" ? "active" : ""}`}
            data-tooltip={collapsed ? t("Управление аккаунтом") : undefined}
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            aria-label={collapsed ? t("Управление аккаунтом") : undefined}
          >
            <span
              className={user.avatar_url ? "has-photo" : ""}
              style={user.avatar_url ? { backgroundImage: `url("${user.avatar_url}")` } : undefined}
            >
              {user.avatar_url ? "" : userInitials(user)}
            </span>
            <div>
              <strong>
                {user.first_name} {user.last_name}
              </strong>
              <small>{user.email}</small>
            </div>
            <ChevronDown size={16} strokeWidth={1.9} />
          </button>
          {profileMenuOpen && (
            <div className="profile-menu-popover" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onNavigate("account");
                }}
              >
                <Settings size={18} />
                {t("Настройки аккаунта")}
              </button>
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onSignOut();
                }}
              >
                <LogOut size={18} />
                {t("Выйти из аккаунта")}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function MobileBottomNavigation({
  role,
  screen,
  navigation,
  onNavigate,
}: {
  role: Role;
  screen: string;
  navigation: { id: string; label: string; icon: LucideIcon }[];
  onNavigate: (id: string) => void;
}) {
  const { t } = useI18n();
  const primaryItems = navigation.filter((item) => mobilePrimaryNavigation[role].includes(item.id));
  return (
    <nav className="mobile-bottom-nav" aria-label={t("Основная навигация")}>
      {primaryItems.map(({ id, label, icon: Icon }) => (
        <button key={id} className={screen === id ? "active" : ""} onClick={() => onNavigate(id)}>
          <Icon size={20} strokeWidth={1.9} />
          <span>
            {label === "План зала" ? t("Зал") : label === "Мои заказы" ? t("Заказы") : t(label)}
          </span>
        </button>
      ))}
    </nav>
  );
}

export type AppNotification = {
  id: number | string;
  scope?: string;
  bannerPending?: boolean;
  orderNumber?: number;
  orderID?: string;
  source?: string;
  message: string;
  createdAt: number;
  read: boolean;
};

export function Topbar({
  role,
  screen,
  navigation,
  venueName,
  cartCount,
  notifications,
  onOpenOrder,
  onMenu,
  onCart,
  onNavigate,
  onNotificationsRead,
  onNotificationsClear,
  start,
}: {
  start?: ReactNode;
  role: Role;
  screen: string;
  navigation: { id: string; label: string; icon?: LucideIcon }[];
  venueName: string;
  cartCount: number;
  notifications: AppNotification[];
  onOpenOrder?: (id: string) => void;
  onMenu: () => void;
  onCart: () => void;
  onNavigate: (id: string) => void;
  onNotificationsRead: () => void;
  onNotificationsClear: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"search" | "notifications" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const languageMenu = useRef<HTMLDivElement>(null);
  const actionMenus = useRef<HTMLDivElement>(null);
  const activeLanguage =
    localeOptions.find((option) => option.value === locale) ?? localeOptions[0];
  const unreadCount = notifications.filter((item) => !item.read).length;
  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLocaleLowerCase(localeTags[locale]);
    if (!normalized) return navigation;
    return navigation.filter((item) =>
      t(item.label).toLocaleLowerCase(localeTags[locale]).includes(normalized),
    );
  }, [locale, navigation, searchQuery, t]);

  useEffect(() => {
    if (!languageMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!languageMenu.current?.contains(event.target as Node)) setLanguageMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLanguageMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [languageMenuOpen]);

  useEffect(() => {
    if (!activePanel) return;
    const closeOutside = (event: PointerEvent) => {
      if (!actionMenus.current?.contains(event.target as Node)) setActivePanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePanel(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activePanel]);

  const togglePanel = (panel: "search" | "notifications") => {
    setLanguageMenuOpen(false);
    setActivePanel((current) => (current === panel ? null : panel));
    if (panel === "notifications") onNotificationsRead();
  };
  const title =
    screen === "checkout"
      ? "Оформление заказа"
      : screen === "account"
        ? "Настройки"
        : navigation.find((item) => item.id === screen)?.label || "Pocket";
  return (
    <header className="topbar">
      <div className="topbar-title">
        <IconButton icon={MenuIcon} label={t("Открыть меню")} onClick={onMenu} />
        <div>
          <small>
            {role === "owner"
              ? `${venueName} / ${t("Управление")}`
              : role === "staff"
                ? `${venueName} / ${t("Смена")}`
                : t("Сегодня в Братиславе")}
          </small>
          <strong>{t(title)}</strong>
        </div>
      </div>
      {start && <div className="topbar-start">{start}</div>}
      <div className="topbar-actions" ref={actionMenus}>
        {role === "customer" && (
          <button className="cart-button" onClick={onCart}>
            <ShoppingBag size={18} />
            <span>{t("Корзина")}</span>
            {cartCount > 0 && <b>{cartCount}</b>}
          </button>
        )}
        <div className="topbar-action-slot">
          <button
            type="button"
            className={`icon-button topbar-action-trigger ${activePanel === "search" ? "selected" : ""}`}
            aria-label={t("Поиск")}
            title={t("Поиск")}
            aria-expanded={activePanel === "search"}
            onClick={() => togglePanel("search")}
          >
            <Search size={19} />
          </button>
          {activePanel === "search" && (
            <section className="topbar-popover topbar-search-popover">
              <header>
                <strong>{t("Быстрый переход")}</strong>
              </header>
              <label className="topbar-search-input">
                <Search size={17} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("Найти раздел")}
                  autoFocus
                />
              </label>
              <div className="topbar-search-results">
                {searchResults.length ? (
                  searchResults.map((item) => {
                    const ItemIcon = item.icon ?? Search;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setActivePanel(null);
                          setSearchQuery("");
                        }}
                      >
                        <ItemIcon size={18} />
                        <span>{t(item.label)}</span>
                        <ArrowRight size={15} />
                      </button>
                    );
                  })
                ) : (
                  <p>{t("Ничего не найдено")}</p>
                )}
              </div>
            </section>
          )}
        </div>
        <div className="topbar-action-slot">
          <button
            type="button"
            className={`icon-button topbar-action-trigger notification-trigger ${activePanel === "notifications" ? "selected" : ""} ${unreadCount ? "has-unread" : ""}`}
            aria-label={t("Уведомления")}
            title={t("Уведомления")}
            aria-expanded={activePanel === "notifications"}
            onClick={() => togglePanel("notifications")}
          >
            <Bell size={19} />
          </button>
          {activePanel === "notifications" && (
            <section className="topbar-popover notifications-popover">
              <header>
                <strong>{t("Уведомления")}</strong>
                {notifications.length > 0 && (
                  <button type="button" onClick={onNotificationsClear}>
                    {t("Очистить")}
                  </button>
                )}
              </header>
              {notifications.length ? (
                <div className="notification-list">
                  {notifications.map((item) => {
                    const orderID = item.orderID;
                    const details = (
                      <>
                        <strong>
                          {t(item.message)}
                          {item.orderNumber != null && ` № ${item.orderNumber}`}
                        </strong>
                        <small>
                          {item.source && t(item.source) + " · "}
                          {new Date(item.createdAt).toLocaleTimeString(localeTags[locale], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </>
                    );
                    return (
                      <article key={item.id} className={item.read ? "" : "unread"}>
                        <span />
                        {orderID && onOpenOrder ? (
                          <button
                            type="button"
                            className="notification-order-row"
                            onClick={() => {
                              setActivePanel(null);
                              onOpenOrder(orderID);
                            }}
                          >
                            {details}
                          </button>
                        ) : (
                          <div>{details}</div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="notification-empty">
                  <BellOff size={22} />
                  <strong>{t("Новых уведомлений нет")}</strong>
                  <p>{t("Действия в приложении появятся здесь.")}</p>
                </div>
              )}
            </section>
          )}
        </div>
        <div className="topbar-language" ref={languageMenu}>
          <button
            type="button"
            className="topbar-language-trigger"
            aria-expanded={languageMenuOpen}
            aria-label={t("Язык интерфейса: {code}", { code: activeLanguage.short })}
            onClick={() => {
              setActivePanel(null);
              setLanguageMenuOpen((open) => !open);
            }}
          >
            <LocaleFlag locale={activeLanguage.value} />
            <span>{activeLanguage.short}</span>
            <ChevronDown size={14} />
          </button>
          {languageMenuOpen && (
            <div className="topbar-language-menu" role="menu" aria-label={t("Язык интерфейса")}>
              {localeOptions.map((option) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-label={`${option.short} ${option.label}`}
                  aria-checked={locale === option.value}
                  className={locale === option.value ? "active" : ""}
                  key={option.value}
                  onClick={() => {
                    setLocale(option.value);
                    setLanguageMenuOpen(false);
                    router.replace(replacePathLocale(pathname, option.value));
                  }}
                >
                  <LocaleFlag locale={option.value} />
                  <span>{option.label}</span>
                  {locale === option.value && <Check size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
