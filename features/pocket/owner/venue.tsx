"use client";

import { useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import { updateOwnerVenue, type OwnerVenue, type VenueInput } from "../../../lib/owner-api";
import { Button, Field, PageHeader, PanelTitle } from "../ui";
import { FloorPlan } from "../floor-plan";

export function VenueScreen({ venue, notify, onUpdate }: { venue: OwnerVenue; notify: (message: string) => void; onUpdate?: (venue: OwnerVenue) => void }) {
  const [tab, setTab] = useState("Основное");
  const [draft, setDraft] = useState<VenueInput>({ name: venue.name, description: venue.description, cuisine_type: venue.cuisine_type, phone: venue.phone, email: venue.email, address: venue.address, city: venue.city, postal_code: venue.postal_code, country_code: venue.country_code, timezone: venue.timezone, currency: venue.currency, status: venue.status, settings: venue.settings });
  const [saving, setSaving] = useState(false);
  const floorTab = tab === "План зала";
  const set = (field: keyof VenueInput, value: string | Record<string, unknown>) => setDraft((current) => ({ ...current, [field]: value }));
  const save = async () => { setSaving(true); try { const updated = await updateOwnerVenue(venue.id, draft); onUpdate?.(updated); notify("Изменения сохранены"); } finally { setSaving(false); } };
  return <><PageHeader title={venue.name} subtitle="Публичная информация и настройки сервиса." actions={!floorTab ? <Button icon={Check} disabled={saving} onClick={() => void save()}>{saving ? "Сохраняем..." : "Сохранить"}</Button> : undefined} /><div className={"settings-layout " + (floorTab ? "floor-settings-layout" : "")}><aside className="settings-nav">{["Основное", "Расписание", "Заказы", "План зала", "Уведомления"].map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</aside>{floorTab ? <section className="floor-settings-editor"><FloorPlan mode="owner" venueID={venue.id} venueName={venue.name} notify={notify} embedded /></section> : <section className="panel settings-form">{tab === "Основное" ? <><PanelTitle title="Профиль заведения" subtitle="Эти данные видят гости." /><div className="cover-upload"><div className="cover-photo" /><Button kind="secondary" icon={ImagePlus}>Изменить обложку</Button></div><div className="form-grid"><Field label="Название"><input value={draft.name} onChange={(event) => set("name", event.target.value)} /></Field><Field label="Тип кухни"><input value={draft.cuisine_type ?? ""} onChange={(event) => set("cuisine_type", event.target.value)} placeholder="Современная европейская" /></Field><Field label="Телефон"><input value={draft.phone ?? ""} onChange={(event) => set("phone", event.target.value)} /></Field><Field label="E-mail"><input type="email" value={draft.email ?? ""} onChange={(event) => set("email", event.target.value)} /></Field><Field label="Город"><input value={draft.city} onChange={(event) => set("city", event.target.value)} /></Field><Field label="Адрес"><input value={draft.address} onChange={(event) => set("address", event.target.value)} /></Field><Field label="Описание" wide><textarea value={draft.description ?? ""} onChange={(event) => set("description", event.target.value)} /></Field><Field label="Статус"><select value={draft.status} onChange={(event) => set("status", event.target.value)}><option value="draft">Черновик</option><option value="active">Открыто</option><option value="paused">Приостановлено</option><option value="closed">Закрыто</option></select></Field></div></> : tab === "Расписание" ? <ScheduleSettings draft={draft} setDraft={setDraft} /> : tab === "Заказы" ? <OrderSettings draft={draft} setDraft={setDraft} /> : <NotificationSettings draft={draft} setDraft={setDraft} />}</section>}</div></>;
}

type SettingsProps = { draft: VenueInput; setDraft: React.Dispatch<React.SetStateAction<VenueInput>> };
const settingsValue = (draft: VenueInput, key: string, fallback = false) => typeof draft.settings?.[key] === "boolean" ? Boolean(draft.settings[key]) : fallback;
const updateSetting = (setDraft: SettingsProps["setDraft"], key: string, value: boolean) => setDraft((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));

function ScheduleSettings({ draft, setDraft }: SettingsProps) {
  return <><PanelTitle title="Часы работы" subtitle="Доступность бронирований и заказов." /><div className="setting-toggles"><SettingToggle title="Заведение открыто по расписанию" text="Принимать брони только в рабочие часы." checked={settingsValue(draft, "schedule_enabled", true)} onChange={(value) => updateSetting(setDraft, "schedule_enabled", value)} /><SettingToggle title="Разрешить бронирование сегодня" text="Гости могут выбрать свободное время на текущий день." checked={settingsValue(draft, "same_day_booking", true)} onChange={(value) => updateSetting(setDraft, "same_day_booking", value)} /></div></>;
}
function OrderSettings({ draft, setDraft }: SettingsProps) {
  return <><PanelTitle title="Прием заказов" subtitle="Доступные каналы для гостей." /><div className="setting-toggles"><SettingToggle title="Заказы в зале" text="Заказ после сканирования QR-кода." checked={settingsValue(draft, "dine_in", true)} onChange={(value) => updateSetting(setDraft, "dine_in", value)} /><SettingToggle title="Самовывоз" text="Онлайн-заказы с получением в заведении." checked={settingsValue(draft, "pickup", true)} onChange={(value) => updateSetting(setDraft, "pickup", value)} /><SettingToggle title="Предзаказ при бронировании" text="Выбор блюд до визита." checked={settingsValue(draft, "preorder", true)} onChange={(value) => updateSetting(setDraft, "preorder", value)} /></div></>;
}
function NotificationSettings({ draft, setDraft }: SettingsProps) {
  return <><PanelTitle title="Уведомления" subtitle="События для владельца и команды." /><div className="setting-toggles"><SettingToggle title="Новый онлайн-заказ" text="Уведомлять рабочие устройства." checked={settingsValue(draft, "notify_order", true)} onChange={(value) => updateSetting(setDraft, "notify_order", value)} /><SettingToggle title="Новый отзыв" text="Уведомлять владельца о новой оценке." checked={settingsValue(draft, "notify_review", true)} onChange={(value) => updateSetting(setDraft, "notify_review", value)} /></div></>;
}
function SettingToggle({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div><div><strong>{title}</strong><p>{text}</p></div><label className="switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span /></label></div>;
}

