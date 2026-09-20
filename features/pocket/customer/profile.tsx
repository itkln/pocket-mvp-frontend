"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, ChevronRight, Heart, LogOut, ShieldCheck, UserRound, X } from "lucide-react";
import { type AuthUser } from "../../../lib/auth-api";
import { userInitials } from "../model";
import { useI18n } from "../i18n";
import { AccountScreen } from "../owner/account";

type ProfileProps = {
  user: AuthUser;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  onEditProfile: () => void;
};

export function GuestProfile({ user, onNavigate, onLogout, onEditProfile }: ProfileProps) {
  const { t } = useI18n();
  const links = [
    { label: "Мои брони", screen: "reservations", icon: CalendarDays, tone: "blue" },
    { label: "Сохранённые места", screen: "saved", icon: Heart, tone: "pink" },
    { label: "Уведомления", screen: "notifications", icon: Bell, tone: "yellow" },
  ];
  return <section className="spots-profile">
    <div className="spots-account-heading"><button type="button" className="spots-back-button" aria-label={t("Назад")} onClick={() => onNavigate("discover")}><ArrowLeft size={26} /></button><h1>{t("Профиль")}</h1><span /></div>
    <button type="button" className="spots-profile-identity" onClick={onEditProfile}>
      <span className="spots-profile-avatar" style={user.avatar_url ? { backgroundImage: `url("${user.avatar_url}")` } : undefined}>{!user.avatar_url && userInitials(user)}</span>
      <span><strong>{user.first_name} {user.last_name}</strong><small>{t("Редактировать профиль")}</small></span><ChevronRight size={22} />
    </button>
    <nav className="spots-profile-links" aria-label={t("Профиль")}>
      {links.map(({ label, screen, icon: Icon, tone }) => <button type="button" key={screen} onClick={() => onNavigate(screen)}><span className={`spots-profile-icon ${tone}`}><Icon size={18} /></span><span>{t(label)}</span><ChevronRight size={19} /></button>)}
    </nav>
    <button type="button" className="spots-signout" onClick={onLogout}><LogOut size={20} />{t("Выйти из аккаунта")}</button>
  </section>;
}

export function GuestSettings({ user, onNavigate, onLogout, onUpdate, notify, onEditProfile, notifications = false }: ProfileProps & { onUpdate: (user: AuthUser) => void; notify: (message: string) => void; notifications?: boolean }) {
  const { t } = useI18n();
  const [section, setSection] = useState<"profile" | "security" | "notifications" | null>(notifications ? "notifications" : null);
  return <section className="spots-settings">
    <div className="spots-account-heading"><button type="button" className="spots-back-button" aria-label={t("Назад")} onClick={() => section && !notifications ? setSection(null) : onNavigate("profile")}><ArrowLeft size={26} /></button><h1>{t(section === "profile" ? "Личные данные" : section === "security" ? "Безопасность" : section === "notifications" ? "Уведомления" : "Настройки")}</h1><span /></div>
    {section ? <div className="spots-settings-detail" data-section={section}><AccountScreen embedded key={section} initialSection={section} user={user} notify={notify} onLogout={onLogout} onUpdate={onUpdate} /></div> : <>
      <div className="spots-settings-identity"><span className="spots-profile-avatar" style={user.avatar_url ? { backgroundImage: `url("${user.avatar_url}")` } : undefined}>{!user.avatar_url && userInitials(user)}</span><h2>{user.first_name} {user.last_name}</h2><p>{user.email}</p></div>
      <nav className="spots-profile-links" aria-label={t("Разделы настроек")}>
        {[{ id: "profile" as const, label: "Личные данные", icon: UserRound, tone: "blue" }, { id: "security" as const, label: "Безопасность", icon: ShieldCheck, tone: "mint" }].map(({ id, label, icon: Icon, tone }) => <button type="button" key={id} onClick={() => id === "profile" && window.matchMedia("(min-width: 761px)").matches ? onEditProfile() : setSection(id)}><span className={`spots-profile-icon ${tone}`}><Icon size={18} /></span><span>{t(label)}</span><ChevronRight size={19} /></button>)}
      </nav>
    </>}
  </section>;
}

export function GuestProfileDialog({ open, section = "profile", user, notify, onUpdate, onClose }: {
  open: boolean; user: AuthUser; notify: (message: string) => void;
  section?: "profile" | "security" | "notifications";
  onUpdate: (user: AuthUser) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const media = window.matchMedia("(min-width: 761px)");
    if (!media.matches) return;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnMobile = () => { if (!media.matches) element?.close(); };
    media.addEventListener("change", closeOnMobile);
    return () => {
      media.removeEventListener("change", closeOnMobile);
      document.body.style.overflow = previousOverflow;
      element?.close();
    };
  }, [open]);
  const title = section === "security" ? "Безопасность" : section === "notifications" ? "Уведомления" : "Личные данные";
  return <dialog ref={dialog} className="spots-profile-dialog" aria-labelledby="spots-profile-dialog-title" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    {open && <div className="spots-profile-dialog-content">
      <div className="spots-dialog-heading"><h2 id="spots-profile-dialog-title">{t(title)}</h2><button type="button" className="icon-button" aria-label={t("Закрыть")} onClick={() => dialog.current?.close()}><X size={22} /></button></div>
      <AccountScreen embedded key={section} initialSection={section} user={user} notify={notify} onUpdate={onUpdate} onLogout={() => {}} onProfileSaved={section === "profile" ? () => dialog.current?.close() : undefined} />
    </div>}
  </dialog>;
}
