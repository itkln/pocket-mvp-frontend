"use client";

import { type AuthUser } from "../../../lib/auth-api";
import { BadgeCheck, Check, CheckCircle2, ChevronRight, Clock3, CreditCard, Download, LogOut, Settings, ShieldCheck, WalletCards } from "lucide-react";
import { userInitials } from "../model";
import { Button, IconButton, StatusPill, PageHeader, PanelTitle, Field } from "../ui";
import { Metric } from "./dashboard";

export function AccountScreen({ user, notify, onLogout }: { user: AuthUser; notify: (message: string) => void; onLogout: () => void }) {
	return <><PageHeader title="Аккаунт" subtitle="Личные данные, безопасность и настройки входа." actions={<Button icon={Check} onClick={() => notify("Настройки аккаунта сохранены")}>Сохранить</Button>} /><div className="account-layout"><aside className="panel account-summary"><span>{userInitials(user)}</span><h2>{user.first_name} {user.last_name}</h2><p>Владелец Pocket</p><small>{user.email}</small></aside><section className="panel settings-form"><PanelTitle title="Личные данные" subtitle="Используются для входа и рабочих уведомлений." /><div className="form-grid"><Field label="Имя"><input defaultValue={user.first_name} /></Field><Field label="Фамилия"><input defaultValue={user.last_name} /></Field><Field label="E-mail"><input type="email" defaultValue={user.email} /></Field><Field label="Телефон"><input type="tel" defaultValue={user.phone ?? ""} placeholder="Добавить телефон" /></Field></div><hr /><PanelTitle title="Безопасность" subtitle="Пароль и активные рабочие сессии." /><div className="account-security"><span><ShieldCheck size={20} /></span><div><strong>Пароль установлен</strong><p>Данные входа актуальны</p></div><Button kind="secondary" onClick={() => notify("Смена пароля появится в следующей версии")}>Изменить пароль</Button></div><Button className="account-logout" kind="danger" icon={LogOut} onClick={onLogout}>Выйти из аккаунта</Button></section></div></>;
}

export function PaymentsScreen({ notify }: { notify: (message: string) => void }) {
  const transactions = [
    { id: "#1048", date: "Сегодня, 14:28", method: "Visa •••• 4242", amount: "€76.50", status: "Успешно" },
    { id: "#1047", date: "Сегодня, 13:54", method: "Apple Pay", amount: "€42.00", status: "Успешно" },
    { id: "#1044", date: "Сегодня, 12:38", method: "Mastercard •••• 1881", amount: "€31.50", status: "В обработке" },
    { id: "#1042", date: "Вчера, 21:16", method: "Visa •••• 9330", amount: "€68.00", status: "Возврат" },
  ];
  return <><PageHeader title="Платежи" subtitle="Прием онлайн-оплаты и выплаты заведению." /><div className="payment-banner"><span><BadgeCheck size={24} /></span><div><strong>Онлайн-платежи подключены</strong><p>Аккаунт проверен. Гости могут платить картой, Apple Pay и Google Pay.</p></div><Button kind="secondary" icon={Settings}>Настроить</Button></div><section className="metric-grid payment-metrics"><Metric label="Доступно к выплате" value="€3,284.60" change="21 июля" icon={WalletCards} tone="green" /><Metric label="В обработке" value="€846.20" change="24 платежа" icon={Clock3} tone="gold" /><Metric label="Выплачено в июле" value="€28,140" change="+11.8%" icon={CheckCircle2} tone="blue" /></section><section className="panel payment-table-panel"><PanelTitle title="Последние транзакции" subtitle="Все способы оплаты" action={<Button kind="quiet" icon={Download}>Скачать CSV</Button>} /><div className="payment-table"><div className="payment-table-head"><span>Платеж</span><span>Способ оплаты</span><span>Сумма</span><span>Статус</span><span /></div>{transactions.map((transaction) => <div className="payment-row" key={transaction.id}><div className="payment-order"><span className="transaction-icon"><CreditCard size={18} /></span><p><strong>{transaction.id}</strong><small>{transaction.date}</small></p></div><span className="payment-method">{transaction.method}</span><b>{transaction.amount}</b><StatusPill status={transaction.status} /><IconButton icon={ChevronRight} label={`Открыть транзакцию ${transaction.id}`} onClick={() => notify("Транзакция открыта")} /></div>)}</div></section></>;
}

