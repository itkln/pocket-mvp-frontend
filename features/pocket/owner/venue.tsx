"use client";

import { useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import { type Venue } from "../model";
import { Button, PageHeader, PanelTitle, Field, ToggleRow } from "../ui";
import { FloorPlan } from "../floor-plan";

export function VenueScreen({ venue, notify }: { venue: Venue; notify: (message: string) => void }) {
  const [tab, setTab] = useState("Основное");
  const floorTab = tab === "План зала";
  return <><PageHeader title={venue.name} subtitle="Публичная информация, расписание и настройки сервиса." actions={!floorTab ? <Button icon={Check} onClick={() => notify("Изменения сохранены")}>Сохранить</Button> : undefined} /><div className={`settings-layout ${floorTab ? "floor-settings-layout" : ""}`}><aside className="settings-nav">{["Основное", "Расписание", "Заказы", "План зала", "Уведомления"].map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</aside>{floorTab ? <section className="floor-settings-editor"><FloorPlan mode="owner" venueName={venue.name} notify={notify} embedded /></section> : <section className="panel settings-form">{tab === "Основное" ? <><PanelTitle title="Профиль заведения" subtitle="Эти данные видят ваши гости." /><div className="cover-upload"><div className="cover-photo" /><Button kind="secondary" icon={ImagePlus}>Изменить обложку</Button></div><div className="form-grid"><Field label="Название"><input defaultValue={venue.name} /></Field><Field label="Тип кухни"><select defaultValue="modern"><option value="modern">Современная европейская</option></select></Field><Field label="Телефон"><input defaultValue="+421 2 555 01 148" /></Field><Field label="E-mail"><input defaultValue={`hello@${venue.id}.sk`} /></Field><Field label="Адрес" wide><input defaultValue={venue.location.replace(" · ", ", ")} /></Field><Field label="Описание" wide><textarea defaultValue="Сезонная европейская кухня, натуральные вина и спокойный городской ритм." /></Field></div></> : tab === "Расписание" ? <ScheduleSettings /> : tab === "Заказы" ? <OrderSettings /> : <NotificationSettings />}</section>}</div></>;
}



export function ScheduleSettings() { return <><PanelTitle title="Часы работы" subtitle="Гости смогут бронировать и заказывать только в эти часы." /><div className="schedule-list">{["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"].map((day, index) => <div key={day}><label className="switch"><input type="checkbox" defaultChecked={index !== 0} /><span /></label><strong>{day}</strong><input defaultValue={index === 0 ? "Закрыто" : "11:30"} disabled={index === 0} /><span>—</span><input defaultValue={index === 0 ? "Закрыто" : index > 4 ? "23:30" : "22:30"} disabled={index === 0} /></div>)}</div></>; }
export function OrderSettings() { return <><PanelTitle title="Прием заказов" subtitle="Настройте доступные каналы и правила." /><div className="setting-toggles"><ToggleRow title="Заказы в зале" text="Гости сканируют QR-код и заказывают за столом." checked /><ToggleRow title="Заказ навынос" text="Онлайн-заказы с получением в заведении." checked /><ToggleRow title="Предзаказ при бронировании" text="Гости выбирают блюда заранее." checked /><ToggleRow title="Доставка" text="Доставка собственной службой или партнером." /></div></>; }
export function NotificationSettings() { return <><PanelTitle title="Уведомления" subtitle="Выберите события и каналы для команды." /><div className="setting-toggles"><ToggleRow title="Новый онлайн-заказ" text="Push и звуковой сигнал на рабочих устройствах." checked /><ToggleRow title="Новая бронь" text="E-mail владельцу и менеджеру." checked /><ToggleRow title="Низкая оценка" text="Уведомлять об отзывах с оценкой ниже 4." checked /><ToggleRow title="Еженедельный отчет" text="Сводка продаж каждый понедельник." /></div></>; }


