"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { type AuthUser } from "../../lib/auth-api";
import { ArrowRight, BadgeCheck, Bell, BellOff, Check, ChevronDown, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, ShoppingBag, Store, UserRound, X, type LucideIcon } from "lucide-react";
import { type Role, type Venue, userInitials, venueInitials, mobilePrimaryNavigation, navigationGroups } from "./model";
import { IconButton } from "./ui";
import { localeOptions, localeTags, useI18n } from "./i18n";
import { replacePathLocale } from "./locales";

export function Sidebar({ user, role, screen, navigation, venue, venues: availableVenues, mobileNav, collapsed, onNavigate, onRole, onVenue, onAddVenue, onClose, onToggleCollapsed }: { user: AuthUser; role: Role; screen: string; navigation: { id: string; label: string; icon: LucideIcon; count?: number }[]; venue: Venue | null; venues: Venue[]; mobileNav: boolean; collapsed: boolean; onNavigate: (id: string) => void; onRole: (role: Role) => void; onVenue: (venue: Venue) => void; onAddVenue: () => void; onClose: () => void; onToggleCollapsed: () => void }) {
  const { t } = useI18n();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [venueMenuOpen, setVenueMenuOpen] = useState(false);
  const canSwitchVenue = availableVenues.length > 1;
  const roleMeta = role === "owner" ? { label: "Владелец", icon: Store } : role === "staff" ? { label: "Сотрудник", icon: BadgeCheck } : { label: "Гость", icon: UserRound };
  const CurrentRoleIcon = roleMeta.icon;
  const selectRole = (nextRole: Role) => {
    onRole(nextRole);
    setRoleMenuOpen(false);
  };
	const startVenueCreation = () => {
		setVenueMenuOpen(false);
		onAddVenue();
	};
  const toggleNavigation = () => {
    if (window.matchMedia("(min-width: 901px)").matches) onToggleCollapsed();
    else onClose();
  };
  return (
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand-row"><button className="brand-toggle" onClick={toggleNavigation} aria-label={collapsed ? "Развернуть навигацию" : "Свернуть навигацию"} title={collapsed ? "Развернуть навигацию" : "Свернуть навигацию"}><span className="brand-toggle-logo"><Image src="/logo.svg" alt="" width={28} height={28} priority /></span><span className="brand-toggle-panel">{collapsed ? <PanelLeftOpen size={20} strokeWidth={1.9} /> : <PanelLeftClose size={20} strokeWidth={1.9} />}</span></button><strong>Pocket</strong><IconButton icon={X} label="Закрыть меню" onClick={onClose} className="mobile-sidebar-close" /></div>
	  {role === "customer" ? <div className="venue-switcher personal-context collapsed-tooltip" data-tooltip={collapsed ? t("Все заведения") : undefined}><span className="venue-avatar">P</span><div><strong>Все заведения</strong></div><Search size={16} /></div> : role === "owner" ? <div className="venue-menu"><button type="button" className={`venue-switcher collapsed-tooltip ${canSwitchVenue ? "can-switch" : ""}`} data-tooltip={collapsed ? (venue?.name ?? t("Заведения")) : undefined} disabled={!canSwitchVenue} onClick={() => setVenueMenuOpen((open) => !open)} aria-expanded={canSwitchVenue ? venueMenuOpen : undefined} aria-label={collapsed ? `${t("Заведение")}: ${venue?.name ?? t("Заведения")}` : undefined}><span className="venue-avatar">{venue ? venueInitials(venue) : <Store size={18} />}</span><div><strong>{venue?.name ?? "Заведения"}</strong></div>{canSwitchVenue && <ChevronDown className="venue-switcher-chevron" size={16} />}</button>{canSwitchVenue && venueMenuOpen && <div className="venue-menu-popover"><p className="venue-menu-label">Мои заведения</p>{availableVenues.map((item) => <button key={item.id} className={item.id === venue?.id ? "active" : ""} onClick={() => { onVenue(item); setVenueMenuOpen(false); }}><span className="venue-avatar">{venueInitials(item)}</span><span><strong>{item.name}</strong></span>{item.id === venue?.id && <Check size={16} />}</button>)}</div>}<button type="button" className="sidebar-add-venue collapsed-tooltip" data-tooltip={collapsed ? t("Добавить заведение") : undefined} onClick={startVenueCreation}><Plus size={18} strokeWidth={1.9} /><span>Добавить заведение</span></button></div> : <div className="venue-switcher personal-context collapsed-tooltip" data-tooltip={collapsed ? (venue?.name ?? t("Рабочая смена")) : undefined}><span className="venue-avatar">{venue ? venueInitials(venue) : "P"}</span><div><strong>{venue?.name ?? "Рабочая смена"}</strong></div><BadgeCheck size={16} /></div>}
      <nav className="side-nav">
        {navigationGroups[role].map((group) => {
          const items = group.ids
            .map((id) => navigation.find((item) => item.id === id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
          const mobilePrimaryGroup = items.every((item) => mobilePrimaryNavigation[role].includes(item.id));

          return <div className={`nav-group ${mobilePrimaryGroup ? "mobile-primary-group" : ""}`} key={group.label}>
            <p className="nav-label">{group.label}</p>
            {items.map(({ id, label, icon: Icon, count }) => <button key={id} className={`${screen === id ? "active" : ""} ${mobilePrimaryNavigation[role].includes(id) ? "mobile-primary-link" : ""} collapsed-tooltip`} data-tooltip={collapsed ? t(label) : undefined} onClick={() => onNavigate(id)} aria-label={collapsed ? `${t(label)}${count ? `, ${count}` : ""}` : undefined}><Icon size={20} strokeWidth={1.9} /><span>{label}</span>{count && <b>{count}</b>}</button>)}
          </div>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <p className="nav-label">Текущая роль</p>
        <div className="role-menu">
          <button className="role-menu-trigger collapsed-tooltip" data-tooltip={collapsed ? t("Сменить роль") : undefined} onClick={() => setRoleMenuOpen((open) => !open)} aria-expanded={roleMenuOpen}><span><CurrentRoleIcon size={20} strokeWidth={1.9} /></span><div><strong>{roleMeta.label}</strong></div><ChevronDown size={16} strokeWidth={1.9} /></button>
          {roleMenuOpen && <div className="role-menu-popover">
            <button className={role === "owner" ? "active" : ""} onClick={() => selectRole("owner")}><Store size={20} strokeWidth={1.9} /><span><strong>Владелец</strong></span>{role === "owner" && <Check size={16} />}</button>
            {user.capabilities.includes("staff") && <button className={role === "staff" ? "active" : ""} onClick={() => selectRole("staff")}><BadgeCheck size={20} strokeWidth={1.9} /><span><strong>Сотрудник</strong></span>{role === "staff" && <Check size={16} />}</button>}
            <button className={role === "customer" ? "active" : ""} onClick={() => selectRole("customer")}><UserRound size={20} strokeWidth={1.9} /><span><strong>Гость</strong></span>{role === "customer" && <Check size={16} />}</button>
          </div>}
        </div>
		<button className={`user-chip collapsed-tooltip ${screen === (role === "customer" ? "profile" : "account") ? "active" : ""}`} data-tooltip={collapsed ? t("Управление аккаунтом") : undefined} onClick={() => onNavigate(role === "customer" ? "profile" : "account")} aria-label={collapsed ? t("Управление аккаунтом") : undefined}><span className={user.avatar_url ? "has-photo" : ""} style={user.avatar_url ? { backgroundImage: `url("${user.avatar_url}")` } : undefined}>{user.avatar_url ? "" : userInitials(user)}</span><div><strong>{user.first_name} {user.last_name}</strong></div><Settings size={20} strokeWidth={1.9} /></button>
      </div>
    </aside>
  );
}

export function MobileBottomNavigation({ role, screen, navigation, onNavigate }: { role: Role; screen: string; navigation: { id: string; label: string; icon: LucideIcon }[]; onNavigate: (id: string) => void }) {
  const primaryItems = navigation.filter((item) => mobilePrimaryNavigation[role].includes(item.id));
  return <nav className="mobile-bottom-nav" aria-label="Основная навигация">
    {primaryItems.map(({ id, label, icon: Icon }) => <button key={id} className={screen === id ? "active" : ""} onClick={() => onNavigate(id)}><Icon size={20} strokeWidth={1.9} /><span>{label === "План зала" ? "Зал" : label === "Мои заказы" ? "Заказы" : label}</span></button>)}
  </nav>;
}

export type AppNotification = { id: number; message: string; createdAt: number; read: boolean };

export function Topbar({ role, screen, navigation, venueName, cartCount, notifications, onMenu, onCart, onNavigate, onNotificationsRead, onNotificationsClear }: { role: Role; screen: string; navigation: { id: string; label: string; icon?: LucideIcon }[]; venueName: string; cartCount: number; notifications: AppNotification[]; onMenu: () => void; onCart: () => void; onNavigate: (id: string) => void; onNotificationsRead: () => void; onNotificationsClear: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"search" | "notifications" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const languageMenu = useRef<HTMLDivElement>(null);
  const actionMenus = useRef<HTMLDivElement>(null);
  const activeLanguage = localeOptions.find((option) => option.value === locale) ?? localeOptions[0];
  const unreadCount = notifications.filter((item) => !item.read).length;
  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLocaleLowerCase(localeTags[locale]);
    if (!normalized) return navigation;
    return navigation.filter((item) => t(item.label).toLocaleLowerCase(localeTags[locale]).includes(normalized));
  }, [locale, navigation, searchQuery, t]);

  useEffect(() => {
    if (!languageMenuOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!languageMenu.current?.contains(event.target as Node)) setLanguageMenuOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setLanguageMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [languageMenuOpen]);

  useEffect(() => {
    if (!activePanel) return;
    const closeOutside = (event: PointerEvent) => { if (!actionMenus.current?.contains(event.target as Node)) setActivePanel(null); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActivePanel(null); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [activePanel]);

  const togglePanel = (panel: "search" | "notifications") => {
    setLanguageMenuOpen(false);
    setActivePanel((current) => current === panel ? null : panel);
    if (panel === "notifications") onNotificationsRead();
  };
  const title = screen === "checkout" ? "Оформление заказа" : screen === "account" ? "Настройки" : navigation.find((item) => item.id === screen)?.label || "Pocket";
  return <header className="topbar"><div className="topbar-title"><IconButton icon={MenuIcon} label="Открыть меню" onClick={onMenu} /><div><small>{role === "owner" ? `${venueName} / Управление` : role === "staff" ? `${venueName} / Смена` : "Сегодня в Братиславе"}</small><strong>{title}</strong></div></div><div className="topbar-actions" ref={actionMenus}>{role === "customer" && <button className="cart-button" onClick={onCart}><ShoppingBag size={18} /><span>Корзина</span>{cartCount > 0 && <b>{cartCount}</b>}</button>}<div className="topbar-action-slot"><button type="button" className={`icon-button topbar-action-trigger ${activePanel === "search" ? "selected" : ""}`} aria-label={t("Поиск")} title={t("Поиск")} aria-expanded={activePanel === "search"} onClick={() => togglePanel("search")}><Search size={19} /></button>{activePanel === "search" && <section className="topbar-popover topbar-search-popover"><header><strong>Быстрый переход</strong></header><label className="topbar-search-input"><Search size={17} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Найти раздел" autoFocus /></label><div className="topbar-search-results">{searchResults.length ? searchResults.map((item) => { const ItemIcon = item.icon ?? Search; return <button type="button" key={item.id} onClick={() => { onNavigate(item.id); setActivePanel(null); setSearchQuery(""); }}><ItemIcon size={18} /><span>{item.label}</span><ArrowRight size={15} /></button>; }) : <p>Ничего не найдено</p>}</div></section>}</div><div className="topbar-action-slot"><button type="button" className={`icon-button topbar-action-trigger notification-trigger ${activePanel === "notifications" ? "selected" : ""} ${unreadCount ? "has-unread" : ""}`} aria-label={t("Уведомления")} title={t("Уведомления")} aria-expanded={activePanel === "notifications"} onClick={() => togglePanel("notifications")}><Bell size={19} /></button>{activePanel === "notifications" && <section className="topbar-popover notifications-popover"><header><strong>Уведомления</strong>{notifications.length > 0 && <button type="button" onClick={onNotificationsClear}>Очистить</button>}</header>{notifications.length ? <div className="notification-list">{notifications.map((item) => <article className={item.read ? "" : "unread"} key={item.id}><span /><div><strong>{t(item.message)}</strong><small>{new Date(item.createdAt).toLocaleTimeString(localeTags[locale], { hour: "2-digit", minute: "2-digit" })}</small></div></article>)}</div> : <div className="notification-empty"><BellOff size={22} /><strong>Новых уведомлений нет</strong><p>Действия в приложении появятся здесь.</p></div>}</section>}</div><div className="topbar-language" ref={languageMenu}><button type="button" className="topbar-language-trigger" aria-expanded={languageMenuOpen} aria-label={t("Язык интерфейса: {code}", { code: activeLanguage.short })} onClick={() => { setActivePanel(null); setLanguageMenuOpen((open) => !open); }}><b>{activeLanguage.short}</b><ChevronDown size={14} /></button>{languageMenuOpen && <div className="topbar-language-menu" role="menu" aria-label={t("Язык интерфейса")}>{localeOptions.map((option) => <button type="button" role="menuitemradio" aria-label={`${option.short} ${option.label}`} aria-checked={locale === option.value} className={locale === option.value ? "active" : ""} key={option.value} onClick={() => { setLocale(option.value); setLanguageMenuOpen(false); router.replace(replacePathLocale(pathname, option.value)); }}><b>{option.short}</b><span>{option.label}</span>{locale === option.value && <Check size={15} />}</button>)}</div>}</div></div></header>;
}
