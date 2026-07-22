"use client";

import { useState, type FormEvent } from "react";
import { changePassword, type AuthUser } from "../../../lib/auth-api";
import { CreditCard, Download, Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { type Role, userInitials } from "../model";
import { Button, EmptyIllustration, PageHeader, PanelTitle, Field, StatusPill, money } from "../ui";
import { localeTags, useI18n } from "../i18n";
import { useLocalizedError } from "../error-message";
import { useOwnerWorkspace } from "./context";

export function AccountScreen({ user, role, notify, onLogout }: { user: AuthUser; role: Role; notify: (message: string) => void; onLogout: () => void }) {
  const { t } = useI18n();
  const errorMessage = useLocalizedError();
  const [editingPassword, setEditingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const accountLabel = role === "owner" ? "Настройки владельца" : "Настройки сотрудника";

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

  return <><PageHeader title={accountLabel} subtitle="Личные данные и безопасность входа." /><div className="account-layout"><section className="panel settings-form account-settings"><div className="account-summary"><span>{userInitials(user)}</span><div><h2>{user.first_name} {user.last_name}</h2><p>{accountLabel}</p><small>{user.email}</small></div></div><div className="account-settings-content"><PanelTitle title="Личные данные" /><div className="form-grid"><Field label="Имя"><input value={user.first_name} readOnly /></Field><Field label="Фамилия"><input value={user.last_name} readOnly /></Field><Field label="E-mail"><input type="email" value={user.email} readOnly /></Field><Field label="Телефон"><input type="tel" value={user.phone ?? ""} readOnly placeholder="Телефон не добавлен" /></Field></div><hr /><div className="account-security-heading"><PanelTitle title="Безопасность" /></div>{editingPassword ? <form className="account-password-form" noValidate onSubmit={submitPassword}><div className="form-grid"><Field label="Текущий пароль" wide><div className="account-password-input"><input name="current_password" type={showPasswords ? "text" : "password"} autoComplete="current-password" autoFocus /><button type="button" aria-label={t(showPasswords ? "Скрыть пароль" : "Показать пароль")} onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field><Field label="Новый пароль"><input name="new_password" type={showPasswords ? "text" : "password"} autoComplete="new-password" /></Field><Field label="Повторите новый пароль"><input name="password_confirmation" type={showPasswords ? "text" : "password"} autoComplete="new-password" /></Field></div>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="account-password-actions"><Button kind="secondary" onClick={() => { setEditingPassword(false); setFormError(""); }}>Отмена</Button><Button type="submit" disabled={submitting}>{submitting ? "Сохраняем..." : "Сохранить пароль"}</Button></div></form> : <div className="account-security"><span><ShieldCheck size={20} /></span><div><strong>Защищенная сессия</strong><p>Пароль защищен Argon2id</p></div><Button kind="secondary" icon={KeyRound} onClick={() => setEditingPassword(true)}>Изменить пароль</Button></div>}<div className="account-footer-actions"><Button className="account-logout" kind="danger" icon={LogOut} onClick={onLogout}>Выйти из аккаунта</Button></div></div></section></div></>;
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
