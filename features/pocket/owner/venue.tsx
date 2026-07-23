"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Bell, Check, ChevronDown, Clock3, ImagePlus, LayoutDashboard, ShoppingBag, Store, Trash2 } from "lucide-react";
import { updateOwnerVenue, type OwnerVenue, type VenueInput } from "../../../lib/owner-api";
import { useConfirm } from "../confirm-dialog";
import { useI18n } from "../i18n";
import { useLocalizedError } from "../error-message";
import { Button, Field, PageHeader, PanelTitle } from "../ui";
import { FloorPlan } from "../floor-plan";

const venueTabs = [
  { id: "Основное", icon: Store },
  { id: "Расписание", icon: Clock3 },
  { id: "Заказы", icon: ShoppingBag },
  { id: "План зала", icon: LayoutDashboard },
  { id: "Уведомления", icon: Bell },
] as const;

type VenueScreenProps = {
  venue: OwnerVenue;
  notify: (message: string) => void;
  onUpdate?: (venue: OwnerVenue) => void;
  onDelete?: () => Promise<void> | void;
};

export function VenueScreen({ venue, notify, onUpdate, onDelete }: VenueScreenProps) {
  const { t } = useI18n();
  const { confirm } = useConfirm();
  const errorMessage = useLocalizedError();
  const [tab, setTab] = useState("Основное");
  const [draft, setDraft] = useState<VenueInput>({ name: venue.name, description: venue.description, cuisine_type: venue.cuisine_type, phone: venue.phone, email: venue.email, address: venue.address, city: venue.city, postal_code: venue.postal_code, country_code: venue.country_code, timezone: venue.timezone, currency: venue.currency, status: venue.status, settings: editableVenueSettings(venue.settings) });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [processingCover, setProcessingCover] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const floorTab = tab === "План зала";
  const set = (field: keyof VenueInput, value: string | Record<string, unknown>) => setDraft((current) => ({ ...current, [field]: value }));
  const coverImage = settingText(draft, "cover_image_url");
  const updateSettingValue = (key: string, value: unknown) => setDraft((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  const selectCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify("Выберите изображение в формате JPG, PNG или WebP"); return; }
    if (file.size > 10 * 1024 * 1024) { notify("Изображение должно быть меньше 10 МБ"); return; }
    setProcessingCover(true);
    try {
      updateSettingValue("cover_image_url", await prepareCoverImage(file));
      notify("Обложка готова. Нажмите «Сохранить»");
    } catch {
      notify("Не удалось обработать изображение");
    } finally {
      setProcessingCover(false);
    }
  };
  const removeCover = async () => {
    if (!await confirm({ description: t("Удалить обложку заведения?"), confirmLabel: t("Удалить") })) return;
    updateSettingValue("cover_image_url", "");
  };
  const save = async () => { setSaving(true); try { const updated = await updateOwnerVenue(venue.id, draft); onUpdate?.(updated); notify("Изменения сохранены"); } catch (error) { notify(errorMessage(error, "Не удалось сохранить изменения")); } finally { setSaving(false); } };
  const removeVenue = async () => {
    if (!onDelete || !await confirm({
      title: t("Удалить заведение"),
      description: t("Удалить заведение «{name}» и связанные с ним данные?", { name: venue.name }),
      confirmLabel: t("Удалить"),
    })) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      notify(errorMessage(error, "Не удалось удалить заведение"));
    } finally {
      setDeleting(false);
    }
  };

  const saveButton = <Button icon={Check} disabled={saving || processingCover} onClick={() => void save()}>{saving ? "Сохраняем..." : "Сохранить"}</Button>;

  return <>
    <PageHeader title={venue.name} subtitle="Публичная информация и настройки сервиса." actions={!floorTab ? <div className="venue-desktop-save">{saveButton}</div> : undefined} />
    <label className="venue-section-select">
      <span>Раздел</span>
      <select value={tab} onChange={(event) => setTab(event.target.value)}>
        {venueTabs.map((item) => <option value={item.id} key={item.id}>{item.id}</option>)}
      </select>
      <ChevronDown size={17} />
    </label>
    <div className={"settings-layout " + (floorTab ? "floor-settings-layout" : "")}>
      <aside className="settings-nav">
        {venueTabs.map(({ id, icon: Icon }) => <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}><Icon size={18} strokeWidth={1.8} /><span>{id}</span></button>)}
      </aside>
      {floorTab ? <section className="floor-settings-editor"><FloorPlan mode="owner" venueID={venue.id} venueName={venue.name} notify={notify} embedded /></section> : <section className="panel settings-form">
        {tab === "Основное" ? <>
          <PanelTitle title="Профиль заведения" subtitle="Эти данные видят гости." />
          <div className="cover-upload"><div className={`cover-photo ${coverImage ? "custom" : ""}`} style={coverImage ? { backgroundImage: `url("${coverImage}")` } : undefined} role="img" aria-label="Обложка заведения" /><input ref={coverInput} className="cover-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectCover(event)} /><div className="cover-actions">{coverImage && <Button kind="secondary" icon={Trash2} onClick={() => void removeCover()}>Удалить</Button>}<Button kind="secondary" icon={ImagePlus} disabled={processingCover} onClick={() => coverInput.current?.click()}>{processingCover ? "Обрабатываем..." : "Изменить обложку"}</Button></div></div>
          <div className="form-grid"><Field label="Название"><input value={draft.name} onChange={(event) => set("name", event.target.value)} /></Field><Field label="Тип кухни"><input value={draft.cuisine_type ?? ""} onChange={(event) => set("cuisine_type", event.target.value)} placeholder="Современная европейская" /></Field><Field label="Телефон"><input value={draft.phone ?? ""} onChange={(event) => set("phone", event.target.value)} /></Field><Field label="E-mail"><input type="email" value={draft.email ?? ""} onChange={(event) => set("email", event.target.value)} /></Field><Field label="Город"><input value={draft.city} onChange={(event) => set("city", event.target.value)} /></Field><Field label="Адрес"><input value={draft.address} onChange={(event) => set("address", event.target.value)} /></Field><Field label="Описание" wide><textarea value={draft.description ?? ""} onChange={(event) => set("description", event.target.value)} /></Field><Field label="Статус"><select value={draft.status} onChange={(event) => set("status", event.target.value)}><option value="draft">Черновик</option><option value="active">Открыто</option><option value="paused">Приостановлено</option><option value="closed">Закрыто</option></select></Field></div>
          <PanelTitle title="Валюта" subtitle="Используется в меню, заказах и отчетах." />
          <div className="form-grid localization-grid"><Field label="Валюта меню и заказов"><select value={draft.currency ?? "EUR"} onChange={(event) => set("currency", event.target.value)}>{currencyOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field></div>
          {onDelete && <section className="venue-delete-section"><div><strong>Удалить заведение</strong><p>Меню, план зала и история заведения станут недоступны.</p></div><Button kind="danger" icon={Trash2} disabled={deleting} onClick={() => void removeVenue()}>{deleting ? "Удаление..." : "Удалить заведение"}</Button></section>}
        </> : tab === "Расписание" ? <ScheduleSettings draft={draft} setDraft={setDraft} /> : tab === "Заказы" ? <OrderSettings draft={draft} setDraft={setDraft} /> : <NotificationSettings draft={draft} setDraft={setDraft} />}
        <footer className="venue-mobile-save">{saveButton}</footer>
      </section>}
    </div>
  </>;
}

const currencyOptions = [
  { value: "EUR", label: "EUR · Евро (€)" },
  { value: "USD", label: "USD · Доллар США ($)" },
  { value: "GBP", label: "GBP · Фунт стерлингов (£)" },
  { value: "UAH", label: "UAH · Украинская гривна (₴)" },
  { value: "RUB", label: "RUB · Российский рубль (₽)" },
  { value: "CZK", label: "CZK · Чешская крона (Kč)" },
];

const editableVenueSettings = (settings: Record<string, unknown>) => Object.fromEntries(Object.entries(settings).filter(([key]) => key !== "floor_plan" && key !== "interface_language"));
const settingText = (draft: VenueInput, key: string, fallback = "") => typeof draft.settings?.[key] === "string" ? String(draft.settings[key]) : fallback;

export const prepareCoverImage = (file: File) => new Promise<string>((resolve, reject) => {
  const objectURL = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const targetRatio = 2;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;
    if (sourceWidth / sourceHeight > targetRatio) {
      sourceWidth = sourceHeight * targetRatio;
      sourceX = (image.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = sourceWidth / targetRatio;
      sourceY = (image.naturalHeight - sourceHeight) / 2;
    }
    const width = Math.min(1200, Math.round(sourceWidth));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(1, Math.round(width / targetRatio));
    const context = canvas.getContext("2d");
    if (!context) { URL.revokeObjectURL(objectURL); reject(new Error("Canvas is unavailable")); return; }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    const firstPass = canvas.toDataURL("image/jpeg", 0.8);
    resolve(firstPass.length <= 800_000 ? firstPass : canvas.toDataURL("image/jpeg", 0.62));
    URL.revokeObjectURL(objectURL);
  };
  image.onerror = () => { URL.revokeObjectURL(objectURL); reject(new Error("Invalid image")); };
  image.src = objectURL;
});

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
