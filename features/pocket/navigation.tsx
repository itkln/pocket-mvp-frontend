"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { type AuthUser } from "../../lib/auth-api";
import { BadgeCheck, Bell, Check, ChevronDown, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, ShoppingBag, Store, UserRound, X, type LucideIcon } from "lucide-react";
import { type Role, type Venue, userInitials, venueInitials, venueLocation, mobilePrimaryNavigation, navigationGroups } from "./model";
import { IconButton } from "./ui";
import { localeOptions, useI18n } from "./i18n";
import { replacePathLocale } from "./locales";

export function Sidebar({ user, role, screen, navigation, venue, venues: availableVenues, mobileNav, collapsed, onNavigate, onRole, onVenue, onAddVenue, onClose, onToggleCollapsed }: { user: AuthUser; role: Role; screen: string; navigation: { id: string; label: string; icon: LucideIcon; count?: number }[]; venue: Venue | null; venues: Venue[]; mobileNav: boolean; collapsed: boolean; onNavigate: (id: string) => void; onRole: (role: Role) => void; onVenue: (venue: Venue) => void; onAddVenue: () => void; onClose: () => void; onToggleCollapsed: () => void }) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [venueMenuOpen, setVenueMenuOpen] = useState(false);
  const roleMeta = role === "owner" ? { label: "Владелец", detail: "Управление заведением", icon: Store } : role === "staff" ? { label: "Сотрудник", detail: "Рабочая смена", icon: BadgeCheck } : { label: "Гость", detail: "Личный аккаунт Pocket", icon: UserRound };
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
	  {role === "customer" ? <div className="venue-switcher personal-context"><span className="venue-avatar">P</span><div><strong>Все заведения</strong><small>Аккаунт Pocket</small></div><Search size={16} /></div> : role === "owner" ? <div className="venue-menu"><button className="venue-switcher" onClick={() => venue ? setVenueMenuOpen((open) => !open) : onAddVenue()} aria-expanded={venueMenuOpen} aria-label={collapsed ? (venue ? `Заведение: ${venue.name}` : "Добавить заведение") : undefined}><span className="venue-avatar">{venue ? venueInitials(venue) : <Plus size={18} />}</span><div><strong>{venue?.name ?? "Добавить заведение"}</strong><small>{venue ? venueLocation(venue) : "Создать рабочее пространство"}</small></div>{venue && <ChevronDown className="venue-switcher-chevron" size={16} />}</button>{venueMenuOpen && <div className="venue-menu-popover"><p className="venue-menu-label">Мои заведения</p>{availableVenues.map((item) => <button key={item.id} className={item.id === venue?.id ? "active" : ""} onClick={() => { onVenue(item); setVenueMenuOpen(false); }}><span className="venue-avatar">{venueInitials(item)}</span><span><strong>{item.name}</strong><small>{venueLocation(item)}</small></span>{item.id === venue?.id && <Check size={16} />}</button>)}<button className="add-venue-button" onClick={startVenueCreation}><Plus size={18} strokeWidth={1.9} /><strong>Добавить заведение</strong></button></div>}</div> : <div className="venue-switcher personal-context"><span className="venue-avatar">{venue ? venueInitials(venue) : "P"}</span><div><strong>{venue?.name ?? "Рабочая смена"}</strong><small>Рабочая смена</small></div><BadgeCheck size={16} /></div>}
      <nav className="side-nav">
        {navigationGroups[role].map((group) => {
          const items = group.ids
            .map((id) => navigation.find((item) => item.id === id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
          const mobilePrimaryGroup = items.every((item) => mobilePrimaryNavigation[role].includes(item.id));

          return <div className={`nav-group ${mobilePrimaryGroup ? "mobile-primary-group" : ""}`} key={group.label}>
            <p className="nav-label">{group.label}</p>
            {items.map(({ id, label, icon: Icon, count }) => <button key={id} className={`${screen === id ? "active" : ""} ${mobilePrimaryNavigation[role].includes(id) ? "mobile-primary-link" : ""}`} onClick={() => onNavigate(id)} title={collapsed ? label : undefined} aria-label={collapsed ? `${label}${count ? `, ${count}` : ""}` : undefined}><Icon size={20} strokeWidth={1.9} /><span>{label}</span>{count && <b>{count}</b>}</button>)}
          </div>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <p className="nav-label">Текущая роль</p>
        <div className="role-menu">
          <button className="role-menu-trigger" onClick={() => setRoleMenuOpen((open) => !open)} aria-expanded={roleMenuOpen} title={collapsed ? "Сменить роль" : undefined}><span><CurrentRoleIcon size={20} strokeWidth={1.9} /></span><div><strong>{roleMeta.label}</strong><small>{roleMeta.detail}</small></div><ChevronDown size={16} strokeWidth={1.9} /></button>
          {roleMenuOpen && <div className="role-menu-popover">
            <button className={role === "owner" ? "active" : ""} onClick={() => selectRole("owner")}><Store size={20} strokeWidth={1.9} /><span><strong>Владелец</strong><small>Управление заведением</small></span>{role === "owner" && <Check size={16} />}</button>
            {user.capabilities.includes("staff") && <button className={role === "staff" ? "active" : ""} onClick={() => selectRole("staff")}><BadgeCheck size={20} strokeWidth={1.9} /><span><strong>Сотрудник</strong><small>Рабочая смена</small></span>{role === "staff" && <Check size={16} />}</button>}
            <button className={role === "customer" ? "active" : ""} onClick={() => selectRole("customer")}><UserRound size={20} strokeWidth={1.9} /><span><strong>Гость</strong><small>Личный аккаунт Pocket</small></span>{role === "customer" && <Check size={16} />}</button>
          </div>}
        </div>
		<button className={`user-chip ${screen === (role === "customer" ? "profile" : "account") ? "active" : ""}`} onClick={() => onNavigate(role === "customer" ? "profile" : "account")} title={collapsed ? "Управление аккаунтом" : undefined} aria-label={collapsed ? "Управление аккаунтом" : undefined}><span>{userInitials(user)}</span><div><strong>{user.first_name} {user.last_name}</strong><small>Управление аккаунтом</small></div><Settings size={20} strokeWidth={1.9} /></button>
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

export function Topbar({ role, screen, navigation, venueName, cartCount, onMenu, onCart }: { role: Role; screen: string; navigation: { id: string; label: string }[]; venueName: string; cartCount: number; onMenu: () => void; onCart: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenu = useRef<HTMLDivElement>(null);
  const activeLanguage = localeOptions.find((option) => option.value === locale) ?? localeOptions[0];
  useEffect(() => {
    if (!languageMenuOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!languageMenu.current?.contains(event.target as Node)) setLanguageMenuOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setLanguageMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [languageMenuOpen]);
  const title = screen === "checkout" ? "Оформление заказа" : screen === "account" ? "Аккаунт" : navigation.find((item) => item.id === screen)?.label || "Pocket";
  return <header className="topbar"><div className="topbar-title"><IconButton icon={MenuIcon} label="Открыть меню" onClick={onMenu} /><div><small>{role === "owner" ? `${venueName} / Управление` : role === "staff" ? `${venueName} / Смена` : "Сегодня в Братиславе"}</small><strong>{title}</strong></div></div><div className="topbar-actions">{role === "customer" && <button className="cart-button" onClick={onCart}><ShoppingBag size={18} /><span>Корзина</span>{cartCount > 0 && <b>{cartCount}</b>}</button>}<IconButton icon={Search} label="Поиск" /><IconButton icon={Bell} label="Уведомления" active /><div className="topbar-language" ref={languageMenu}><button type="button" className="topbar-language-trigger" aria-expanded={languageMenuOpen} aria-label={t("Язык интерфейса: {code}", { code: activeLanguage.short })} onClick={() => setLanguageMenuOpen((open) => !open)}><b>{activeLanguage.short}</b><ChevronDown size={14} /></button>{languageMenuOpen && <div className="topbar-language-menu" role="menu" aria-label={t("Язык интерфейса")}>{localeOptions.map((option) => <button type="button" role="menuitemradio" aria-label={`${option.short} ${option.label}`} aria-checked={locale === option.value} className={locale === option.value ? "active" : ""} key={option.value} onClick={() => { setLocale(option.value); setLanguageMenuOpen(false); router.replace(replacePathLocale(pathname, option.value)); }}><b>{option.short}</b><span>{option.label}</span>{locale === option.value && <Check size={15} />}</button>)}</div>}</div></div></header>;
}
