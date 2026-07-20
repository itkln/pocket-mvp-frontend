"use client";

import { useState, type FormEvent } from "react";
import { Clock3, ImagePlus, Plus, ShieldCheck, Store, Table2, X } from "lucide-react";
import { type Venue, makeVenueSlug } from "./model";
import { Button, IconButton, StatusPill, Field } from "./ui";

export function NewVenueModal({ onClose, onCreate }: { onClose: () => void; onCreate: (venue: Venue) => void }) {
	const [name, setName] = useState("");
	const [city, setCity] = useState("Братислава");
	const [area, setArea] = useState("");
	const cleanName = name.trim();
	const initials = cleanName.split(/\s+/).slice(0, 2).map((part) => part.at(0)).join("").toUpperCase();
	const location = [city.trim(), area.trim()].filter(Boolean).join(" · ");

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!cleanName || !city.trim()) return;
		onCreate({
			id: `${makeVenueSlug(cleanName)}-${Date.now()}`,
			name: cleanName,
			initials: initials || cleanName.at(0)?.toUpperCase() || "V",
			location,
		});
	};

	return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal venue-create-modal" onMouseDown={(event) => event.stopPropagation()}><header><div className="venue-create-heading"><span><Store size={21} /></span><div><p className="eyebrow">НОВОЕ ПРОСТРАНСТВО</p><h2>Добавить заведение</h2></div></div><IconButton icon={X} label="Закрыть" onClick={onClose} /></header><form className="venue-create-form" onSubmit={submit}><div className="modal-body"><p className="venue-create-intro">Начните с основного. Меню, расписание и команду можно добавить позже.</p><Field label="Название" wide><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Mokka Bistro" maxLength={80} required /></Field><div className="venue-create-location"><Field label="Город"><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Город" maxLength={80} required /></Field><Field label="Район или улица"><input value={area} onChange={(event) => setArea(event.target.value)} placeholder="Необязательно" maxLength={120} /></Field></div><div className="venue-create-preview" aria-live="polite"><span>{initials || <Store size={18} />}</span><div><strong>{cleanName || "Название заведения"}</strong><small>{location || "Местоположение"}</small></div></div></div><footer><Button kind="quiet" onClick={onClose}>Отмена</Button><Button type="submit" icon={Plus} disabled={!cleanName || !city.trim()}>Добавить заведение</Button></footer></form></section></div>;
}

export function Modal({ type, onClose, notify }: { type: "item" | "invite" | "order"; onClose: () => void; notify: (message: string) => void }) {
  const copy = type === "item" ? { title: "Новая позиция", action: "Добавить в меню" } : type === "invite" ? { title: "Пригласить сотрудника", action: "Отправить приглашение" } : { title: "Заказ #1048", action: "Закрыть" };
  return <div className="modal-backdrop" onMouseDown={onClose}><section className={`modal ${type === "order" ? "order-modal" : ""}`} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">NORTH & VINE</p><h2>{copy.title}</h2></div><IconButton icon={X} label="Закрыть" onClick={onClose} /></header>{type === "item" && <div className="modal-body"><button className="image-drop"><ImagePlus size={24} /><strong>Добавить фотографию</strong><span>PNG или JPG до 8 МБ</span></button><div className="form-grid"><Field label="Название" wide><input placeholder="Название блюда" /></Field><Field label="Категория"><select><option>Закуски</option><option>Основное</option><option>Десерты</option></select></Field><Field label="Цена"><input placeholder="€ 0.00" /></Field><Field label="Описание" wide><textarea placeholder="Ингредиенты и короткое описание" /></Field></div></div>}{type === "invite" && <div className="modal-body"><div className="form-grid"><Field label="Имя"><input placeholder="Имя сотрудника" /></Field><Field label="E-mail"><input placeholder="name@example.com" /></Field><Field label="Роль" wide><select><option>Официант</option><option>Менеджер</option><option>Кухня</option><option>Только просмотр</option></select></Field></div><div className="permission-note"><ShieldCheck size={20} /><p><strong>Доступ по роли</strong><span>Сотрудник увидит только разрешенные разделы этого заведения.</span></p></div></div>}{type === "order" && <div className="modal-body order-detail"><div className="order-detail-top"><StatusPill status="Новый" /><span><Clock3 size={15} />2 минуты назад</span></div><div className="order-source"><span><Table2 size={20} /></span><div><strong>Стол 08 · 4 гостя</strong><p>Официант: София Марек</p></div></div><div className="order-lines"><p><b>2×</b><span>Тальятелле с трюфелем<small>Одна порция без пармезана</small></span><strong>€37.00</strong></p><p><b>1×</b><span>Буррата и томаты</span><strong>€13.50</strong></p><p><b>3×</b><span>Красный апельсин</span><strong>€21.00</strong></p></div><dl className="order-total"><div><dt>Подытог</dt><dd>€71.50</dd></div><div><dt>Чаевые</dt><dd>€5.00</dd></div><div><dt>Итого</dt><dd>€76.50</dd></div></dl></div>}<footer><Button kind="secondary" onClick={onClose}>Назад</Button><Button onClick={() => notify(type === "item" ? "Позиция добавлена в меню" : type === "invite" ? "Приглашение отправлено" : "Заказ принят")}>{copy.action}</Button></footer></section></div>;
}

