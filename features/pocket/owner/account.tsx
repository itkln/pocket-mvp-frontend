"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { changeEmail, changePassword, updateAvatar, updateProfile, type AuthUser } from "../../../lib/auth-api";
import { Bell, Camera, Check, CreditCard, Download, Eye, EyeOff, KeyRound, Languages, LogOut, Mail, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { userInitials } from "../model";
import { Button, EmptyIllustration, PageHeader, PanelTitle, Field, StatusPill, money } from "../ui";
import { localeTags, useI18n } from "../i18n";
import { useLocalizedError } from "../error-message";
import { replacePathLocale } from "../locales";
import { useOwnerWorkspace } from "./context";

type AccountSection = "profile" | "notifications" | "language" | "security";
type AccountPreferences = { orderUpdates: boolean; productNews: boolean; reviewReplies: boolean };
const defaultPreferences: AccountPreferences = { orderUpdates: true, productNews: false, reviewReplies: true };
const preferencesKey = (userID: string) => `pocket:account-preferences:${userID}`;

export function AccountScreen({ user, notify, onLogout, onUpdate }: { user: AuthUser; notify: (message: string) => void; onLogout: () => void; onUpdate: (user: AuthUser) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const errorMessage = useLocalizedError();
  const [section, setSection] = useState<AccountSection>("profile");
  const [profile, setProfile] = useState({ firstName: user.first_name, lastName: user.last_name, phone: user.phone ?? "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultPreferences);
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const profileChanged = profile.firstName.trim() !== user.first_name || profile.lastName.trim() !== user.last_name || profile.phone.trim() !== (user.phone ?? "");

  useEffect(() => {
    const stored = window.localStorage.getItem(preferencesKey(user.id));
    if (!stored) return;
    try {
      const restored = { ...defaultPreferences, ...JSON.parse(stored) as Partial<AccountPreferences> };
      const frame = window.requestAnimationFrame(() => setPreferences(restored));
      return () => window.cancelAnimationFrame(frame);
    } catch {
      window.localStorage.removeItem(preferencesKey(user.id));
    }
  }, [user.id]);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    if (!firstName || !lastName) {
      setProfileError(t("Имя и фамилия обязательны"));
      return;
    }
    setSavingProfile(true);
    setProfileError("");
    try {
      const updated = await updateProfile({ first_name: firstName, last_name: lastName, phone: profile.phone.trim() });
      onUpdate(updated);
      notify("Профиль сохранен");
    } catch (error) {
      setProfileError(errorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePreference = (key: keyof AccountPreferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    window.localStorage.setItem(preferencesKey(user.id), JSON.stringify(next));
  };

  const selectLanguage = (nextLocale: typeof locale) => {
    setLocale(nextLocale);
    router.replace(replacePathLocale(pathname, nextLocale));
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("current_password") ?? "");
    const newPassword = String(data.get("new_password") ?? "");
    const confirmation = String(data.get("password_confirmation") ?? "");
    if (!currentPassword) { setFormError(t("Введите текущий пароль")); return; }
    if (newPassword.length < 12 || newPassword.length > 128) { setFormError(t("Пароль должен содержать от 12 до 128 символов")); return; }
    if (newPassword !== confirmation) { setFormError(t("Пароли не совпадают")); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await changePassword(currentPassword, newPassword);
      form.reset();
      setEditingPassword(false);
      setShowPasswords(false);
      notify("Пароль изменен");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("new_email") ?? "").trim().toLowerCase();
    const currentPassword = String(data.get("current_password") ?? "");
    if (!email || !email.includes("@")) { setFormError(t("Введите корректный e-mail")); return; }
    if (!currentPassword) { setFormError(t("Введите текущий пароль")); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const updated = await changeEmail(currentPassword, email);
      onUpdate(updated);
      form.reset();
      setEditingEmail(false);
      notify("E-mail изменен");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError(t("Используйте JPEG, PNG или WebP"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t("Фотография должна быть меньше 2 МБ"));
      return;
    }
    setUploadingAvatar(true);
    setAvatarError("");
    try {
      const updated = await updateAvatar(file);
      onUpdate(updated);
      notify("Фотография обновлена");
    } catch (error) {
      setAvatarError(errorMessage(error));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const sections: { id: AccountSection; label: string; icon: typeof UserRound; value?: string }[] = [
    { id: "profile", label: "Личные данные", icon: UserRound },
    { id: "notifications", label: "Уведомления", icon: Bell },
    { id: "language", label: "Язык", icon: Languages, value: locale.toUpperCase() },
    { id: "security", label: "Безопасность", icon: ShieldCheck },
  ];

  return <><PageHeader title="Настройки" subtitle="Один личный аккаунт для всех ролей Pocket." /><div className="account-page"><section className="panel account-profile-hero"><label className={`account-profile-avatar account-avatar-editor ${uploadingAvatar ? "loading" : ""}`} title={t("Изменить фотографию")}>{user.avatar_url ? <i className="account-avatar-image" style={{ backgroundImage: `url("${user.avatar_url}")` }} /> : userInitials(user)}<input type="file" aria-label={t("Изменить фотографию")} accept="image/jpeg,image/png,image/webp" disabled={uploadingAvatar} onChange={(event) => { void uploadPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} /><span><Camera size={18} /></span></label><div><h2>{user.first_name} {user.last_name}</h2><p>{user.email}</p>{avatarError && <small className="account-avatar-error" role="alert">{avatarError}</small>}</div><div className="account-profile-actions"><Button kind="quiet" icon={Pencil} onClick={() => setSection("profile")}>Изменить профиль</Button><Button className="account-logout" kind="danger" icon={LogOut} onClick={onLogout}>Выйти из аккаунта</Button></div></section><div className="account-settings-layout"><nav className="panel account-section-list" aria-label={t("Разделы настроек")}>{sections.map(({ id, label, icon: Icon, value }) => <button type="button" className={section === id ? "active" : ""} key={id} onClick={() => setSection(id)}><span><Icon size={20} strokeWidth={1.8} /></span><strong>{label}</strong>{value && <small>{value}</small>}</button>)}</nav><section className="panel account-section-panel">
    {section === "profile" && <form className="account-profile-form" onSubmit={submitProfile}><PanelTitle title="Личные данные" subtitle="Используются во всех ролях и заведениях." /><div className="form-grid"><Field label="Имя"><input value={profile.firstName} onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))} maxLength={80} autoComplete="given-name" /></Field><Field label="Фамилия"><input value={profile.lastName} onChange={(event) => setProfile((current) => ({ ...current, lastName: event.target.value }))} maxLength={80} autoComplete="family-name" /></Field><Field label="Телефон"><input type="tel" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} maxLength={40} autoComplete="tel" placeholder="Добавить телефон" /></Field><Field label="E-mail"><input type="email" value={user.email} readOnly /></Field></div>{profileError && <p className="form-error" role="alert">{profileError}</p>}<footer><Button type="submit" disabled={!profileChanged || savingProfile}>{savingProfile ? "Сохраняем..." : "Сохранить изменения"}</Button></footer></form>}
    {section === "notifications" && <div className="account-preference-panel"><PanelTitle title="Уведомления" subtitle="Выберите события, которые важны лично вам." /><div className="account-setting-rows"><AccountToggle title="Статусы заказов" text="Изменения заказов, оплат и бронирований." checked={preferences.orderUpdates} onChange={(value) => updatePreference("orderUpdates", value)} /><AccountToggle title="Ответы на отзывы" text="Ответы заведений на ваши отзывы." checked={preferences.reviewReplies} onChange={(value) => updatePreference("reviewReplies", value)} /><AccountToggle title="Новости Pocket" text="Редкие обновления о новых возможностях." checked={preferences.productNews} onChange={(value) => updatePreference("productNews", value)} /></div></div>}
    {section === "language" && <div className="account-preference-panel"><PanelTitle title="Язык" subtitle="Язык применяется ко всему приложению." /><div className="account-language-list">{(["ru", "en", "ua", "sk"] as const).map((option) => { const labels = { ru: "Русский", en: "English", ua: "Українська", sk: "Slovenčina" }; return <button type="button" className={locale === option ? "active" : ""} key={option} onClick={() => selectLanguage(option)}><span>{option.toUpperCase()}</span><strong>{labels[option]}</strong>{locale === option && <Check size={18} />}</button>; })}</div></div>}
    {section === "security" && <div className="account-preference-panel account-security-panel"><PanelTitle title="Безопасность" subtitle="E-mail и пароль для входа в аккаунт." />{editingEmail ? <form className="account-password-form" noValidate onSubmit={submitEmail}><div className="form-grid"><Field label="Новый e-mail" wide><input name="new_email" type="email" defaultValue={user.email} autoComplete="email" autoFocus /></Field><Field label="Текущий пароль" wide><div className="account-password-input"><input name="current_password" type={showPasswords ? "text" : "password"} autoComplete="current-password" /><button type="button" aria-label={t(showPasswords ? "Скрыть пароль" : "Показать пароль")} onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field></div>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="account-password-actions"><Button kind="secondary" onClick={() => { setEditingEmail(false); setFormError(""); }}>Отмена</Button><Button type="submit" disabled={submitting}>{submitting ? "Сохраняем..." : "Сохранить e-mail"}</Button></div></form> : editingPassword ? <form className="account-password-form" noValidate onSubmit={submitPassword}><div className="form-grid"><Field label="Текущий пароль" wide><div className="account-password-input"><input name="current_password" type={showPasswords ? "text" : "password"} autoComplete="current-password" autoFocus /><button type="button" aria-label={t(showPasswords ? "Скрыть пароль" : "Показать пароль")} onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field><Field label="Новый пароль"><input name="new_password" type={showPasswords ? "text" : "password"} autoComplete="new-password" /></Field><Field label="Повторите новый пароль"><input name="password_confirmation" type={showPasswords ? "text" : "password"} autoComplete="new-password" /></Field></div>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="account-password-actions"><Button kind="secondary" onClick={() => { setEditingPassword(false); setFormError(""); }}>Отмена</Button><Button type="submit" disabled={submitting}>{submitting ? "Сохраняем..." : "Сохранить пароль"}</Button></div></form> : <div className="account-security-list"><div><span><Mail size={20} /></span><div><strong>E-mail</strong><p>{user.email}</p></div><Button kind="quiet" ariaLabel={t("Изменить e-mail")} onClick={() => { setEditingEmail(true); setShowPasswords(false); setFormError(""); }}>Изменить</Button></div><div><span><KeyRound size={20} /></span><div><strong>Пароль</strong><p>••••••••••••</p></div><Button kind="quiet" ariaLabel={t("Изменить пароль")} onClick={() => { setEditingPassword(true); setShowPasswords(false); setFormError(""); }}>Изменить</Button></div></div>}</div>}
  </section></div></div></>;
}

function AccountToggle({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div><div><strong>{title}</strong><p>{text}</p></div><label className="switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span /></label></div>;
}

export function PaymentsScreen() {
  const { locale } = useI18n();
  const { payments } = useOwnerWorkspace();
  const paid = payments.filter((payment) => payment.status === "paid");
  const total = paid.reduce((sum, payment) => sum + payment.amount_minor - payment.refunded_minor, 0);
  const exportCSV = () => {
    const rows = [["id", "provider", "status", "amount", "currency", "created_at"], ...payments.map((payment) => [payment.id, payment.provider, payment.status, String(payment.amount_minor), payment.currency, payment.created_at])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "pocket-payments.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <><PageHeader title="Платежи" subtitle="Транзакции выбранного заведения." actions={<Button kind="secondary" icon={Download} disabled={!payments.length} onClick={exportCSV}>Скачать CSV</Button>} /><section className="metric-grid payment-metrics"><article className="metric"><span className="metric-icon green"><CreditCard size={20} /></span><div className="metric-copy"><p>Получено</p><strong>{money(total / 100)}</strong><small>Успешных платежей: {paid.length}</small></div></article></section><section className="panel payment-table-panel"><PanelTitle title="Последние транзакции" subtitle="Данные платежного провайдера" />{payments.length ? <div className="payment-table"><div className="payment-table-head"><span>Платеж</span><span>Провайдер</span><span>Сумма</span><span>Статус</span><span>Дата</span></div>{payments.map((payment) => <div className="payment-row" key={payment.id}><div className="payment-order"><span className="transaction-icon"><CreditCard size={18} /></span><p><strong>{payment.id.slice(0, 8)}</strong><small>{payment.currency}</small></p></div><span className="payment-method">{payment.provider}</span><b>{money(payment.amount_minor / 100)}</b><StatusPill status={payment.status === "paid" ? "Успешно" : payment.status === "refunded" ? "Возврат" : "В обработке"} /><span>{new Date(payment.created_at).toLocaleDateString(localeTags[locale])}</span></div>)}</div> : <EmptyIllustration icon={CreditCard} title="Транзакций пока нет" text="Платежи появятся после подключения провайдера и первого онлайн-заказа." />}</section></>;
}
