"use client";

import {
  CalendarDays,
  ChevronRight,
  Globe,
  LayoutGrid,
  List,
  LogOut,
  Pencil,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { AuthUser } from "../../../lib/auth-api";
import { userInitials } from "../model";
import { localeOptions, useI18n } from "../i18n";
import type { MenuView } from "./menu-view";

export function DishMenuRow({
  icon: Icon,
  label,
  description,
  onClick,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`dish-account-row ${className}`.trim()}
      aria-label={description ? `${label}: ${description}` : label}
      onClick={onClick}
    >
      <span className="dish-account-icon">
        <Icon size={23} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="dish-account-row-copy">
        <span>{label}</span>
        {description && <small>{description}</small>}
      </span>
      <ChevronRight className="dish-account-chevron" size={22} aria-hidden="true" />
    </button>
  );
}

export function DishAccountMenu({
  user,
  onNavigate,
  onLogin,
  onLogout,
  view,
  onOpenView,
  onOpenLanguage,
}: {
  user: AuthUser | null;
  onNavigate: (target: string) => void;
  onLogin: () => void;
  onLogout?: () => void;
  view?: MenuView;
  onOpenView?: () => void;
  onOpenLanguage?: () => void;
}) {
  const { locale, t } = useI18n();
  const name =
    user && ([user.first_name, user.last_name].filter(Boolean).join(" ") || t("Профиль"));
  return (
    <div className="dish-account-menu">
      <section className="dish-account-card dish-account-intro">
        {user ? (
          <button
            type="button"
            className="dish-account-identity"
            aria-label={t("Редактировать профиль")}
            onClick={() => onNavigate("settings?section=profile")}
          >
            <span
              className="dish-account-avatar"
              style={
                user.avatar_url
                  ? { backgroundImage: `url(${JSON.stringify(user.avatar_url)})` }
                  : undefined
              }
            >
              {!user.avatar_url && userInitials(user)}
            </span>
            <span className="dish-account-identity-copy">
              <strong>{name}</strong>
              <small>{user.email}</small>
            </span>
            <Pencil size={22} aria-hidden="true" />
          </button>
        ) : (
          <div className="dish-account-login">
            <h3>{t("Войдите в аккаунт")}</h3>
            <p>{t("Управляйте профилем и бронированиями.")}</p>
            <button type="button" onClick={onLogin}>
              {t("Войти")}
            </button>
          </div>
        )}
      </section>
      {user && (
        <section className="dish-account-card" aria-label={t("Аккаунт")}>
          <h3>{t("Аккаунт")}</h3>
          <DishMenuRow
            icon={UserRound}
            label={t("Личные данные")}
            onClick={() => onNavigate("settings?section=profile")}
          />
          <DishMenuRow
            icon={CalendarDays}
            label={t("Мои брони")}
            onClick={() => onNavigate("reservations")}
          />
          <DishMenuRow
            icon={ShieldCheck}
            label={t("Безопасность")}
            onClick={() => onNavigate("settings?section=security")}
          />
        </section>
      )}
      {(onOpenLanguage || onOpenView || (user && onLogout)) && (
        <section className="dish-account-card" aria-label={t("Настройки меню")}>
          {onOpenLanguage && (
            <DishMenuRow
              icon={Globe}
              label={t("Язык интерфейса")}
              description={localeOptions.find((option) => option.value === locale)?.label}
              onClick={onOpenLanguage}
            />
          )}
          {onOpenView && (
            <DishMenuRow
              icon={view === "list" ? List : LayoutGrid}
              label={t("Вид меню")}
              description={t(view === "list" ? "Список" : "Карточки")}
              onClick={onOpenView}
            />
          )}
          {user && onLogout && (
            <DishMenuRow
              className="dish-account-logout"
              icon={LogOut}
              label={t("Выйти из аккаунта")}
              onClick={onLogout}
            />
          )}
        </section>
      )}
    </div>
  );
}
