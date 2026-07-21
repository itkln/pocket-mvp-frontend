"use client";

import { type AuthUser } from "../../../lib/auth-api";
import { CreditCard, Download, LogOut, ShieldCheck } from "lucide-react";
import { userInitials } from "../model";
import { Button, EmptyIllustration, PageHeader, PanelTitle, Field, StatusPill, money } from "../ui";
import { useOwnerWorkspace } from "./context";

export function AccountScreen({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return <><PageHeader title="Аккаунт" subtitle="Личные данные и безопасность входа." /><div className="account-layout"><aside className="panel account-summary"><span>{userInitials(user)}</span><h2>{user.first_name} {user.last_name}</h2><p>Аккаунт Pocket</p><small>{user.email}</small></aside><section className="panel settings-form"><PanelTitle title="Личные данные" /><div className="form-grid"><Field label="Имя"><input value={user.first_name} readOnly /></Field><Field label="Фамилия"><input value={user.last_name} readOnly /></Field><Field label="E-mail"><input type="email" value={user.email} readOnly /></Field><Field label="Телефон"><input type="tel" value={user.phone ?? ""} readOnly placeholder="Телефон не добавлен" /></Field></div><hr /><PanelTitle title="Безопасность" /><div className="account-security"><span><ShieldCheck size={20} /></span><div><strong>Защищенная сессия</strong><p>Пароль хранится в виде Argon2id-хеша</p></div></div><Button className="account-logout" kind="danger" icon={LogOut} onClick={onLogout}>Выйти из аккаунта</Button></section></div></>;
}

export function PaymentsScreen() {
  const { payments } = useOwnerWorkspace();
  const paid = payments.filter((payment) => payment.status === "paid");
  const total = paid.reduce((sum, payment) => sum + payment.amount_minor - payment.refunded_minor, 0);
  const exportCSV = () => {
    const rows = [["id", "provider", "status", "amount", "currency", "created_at"], ...payments.map((payment) => [payment.id, payment.provider, payment.status, String(payment.amount_minor), payment.currency, payment.created_at])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "pocket-payments.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <><PageHeader title="Платежи" subtitle="Транзакции выбранного заведения." actions={<Button kind="secondary" icon={Download} disabled={!payments.length} onClick={exportCSV}>Скачать CSV</Button>} /><section className="metric-grid payment-metrics"><article className="metric"><span className="green"><CreditCard size={20} /></span><div><p>Получено</p><strong>{money(total / 100)}</strong><small>{paid.length} успешных платежей</small></div></article></section><section className="panel payment-table-panel"><PanelTitle title="Последние транзакции" subtitle="Данные платежного провайдера" />{payments.length ? <div className="payment-table"><div className="payment-table-head"><span>Платеж</span><span>Провайдер</span><span>Сумма</span><span>Статус</span><span>Дата</span></div>{payments.map((payment) => <div className="payment-row" key={payment.id}><div className="payment-order"><span className="transaction-icon"><CreditCard size={18} /></span><p><strong>{payment.id.slice(0, 8)}</strong><small>{payment.currency}</small></p></div><span className="payment-method">{payment.provider}</span><b>{money(payment.amount_minor / 100)}</b><StatusPill status={payment.status === "paid" ? "Успешно" : payment.status === "refunded" ? "Возврат" : "В обработке"} /><span>{new Date(payment.created_at).toLocaleDateString("ru-RU")}</span></div>)}</div> : <EmptyIllustration icon={CreditCard} title="Транзакций пока нет" text="Платежи появятся после подключения провайдера и первого онлайн-заказа." />}</section></>;
}

