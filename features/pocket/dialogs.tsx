"use client";

import { useState, type FormEvent } from "react";
import { Clock3, Plus, ShieldCheck, Store, Table2, X } from "lucide-react";
import { type VenueInput } from "../../lib/owner-api";
import { useOwnerWorkspace } from "./owner/context";
import { Button, IconButton, StatusPill, Field, money } from "./ui";

export function NewVenueModal({ onClose, onCreate }: { onClose: () => void; onCreate: (venue: VenueInput) => Promise<void> }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Братислава");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cleanName = name.trim();
  const initials = cleanName.split(/\s+/).slice(0, 2).map((part) => part.at(0)).join("").toUpperCase();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cleanName || !city.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({ name: cleanName, city: city.trim(), address: address.trim() || "Адрес не указан", country_code: "SK", timezone: "Europe/Bratislava", currency: "EUR", status: "draft" });
    } finally { setSubmitting(false); }
  };

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal venue-create-modal" onMouseDown={(event) => event.stopPropagation()}><header><div className="venue-create-heading"><span><Store size={21} /></span><div><p className="eyebrow">НОВОЕ ПРОСТРАНСТВО</p><h2>Добавить заведение</h2></div></div><IconButton icon={X} label="Закрыть" onClick={onClose} /></header><form className="venue-create-form" onSubmit={submit}><div className="modal-body"><p className="venue-create-intro">Начните с основного. Меню, расписание и команду можно добавить позже.</p><Field label="Название" wide><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Mokka Bistro" maxLength={80} required /></Field><div className="venue-create-location"><Field label="Город"><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Город" maxLength={80} required /></Field><Field label="Адрес"><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Улица и номер" maxLength={120} /></Field></div><div className="venue-create-preview" aria-live="polite"><span>{initials || <Store size={18} />}</span><div><strong>{cleanName || "Название заведения"}</strong><small>{[city.trim(), address.trim()].filter(Boolean).join(" · ") || "Местоположение"}</small></div></div></div><footer><Button kind="quiet" onClick={onClose}>Отмена</Button><Button type="submit" icon={Plus} disabled={!cleanName || !city.trim() || submitting}>{submitting ? "Добавляем..." : "Добавить заведение"}</Button></footer></form></section></div>;
}

export function Modal({ type, onClose, notify, currency = "EUR" }: { type: "item" | "invite" | "order"; onClose: () => void; notify: (message: string) => void; currency?: string }) {
  const workspace = useOwnerWorkspace();
  const [submitting, setSubmitting] = useState(false);
  const order = workspace.orders[0];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      if (type === "item") {
        await workspace.addItem({
          name: String(data.get("name")),
          category_id: String(data.get("category")),
          price_minor: Math.round(Number(data.get("price")) * 100),
          description: String(data.get("description")),
          image_url: String(data.get("image")),
          currency,
          is_available: true,
        });
        notify("Позиция добавлена в меню");
      } else if (type === "invite") {
        await workspace.inviteStaff({
          display_name: String(data.get("name")),
          email: String(data.get("email")),
          role: String(data.get("role")) as "manager" | "waiter" | "kitchen" | "viewer",
        });
        notify("Приглашение отправлено");
      }
      onClose();
    } finally { setSubmitting(false); }
  };

  const title = type === "item" ? "Новая позиция" : type === "invite" ? "Пригласить сотрудника" : order ? `Заказ #${order.number}` : "Заказ";
  return <div className="modal-backdrop" onMouseDown={onClose}><section className={`modal ${type === "order" ? "order-modal" : ""}`} onMouseDown={(event) => event.stopPropagation()}><header><div><h2>{title}</h2></div><IconButton icon={X} label="Закрыть" onClick={onClose} /></header>
    {type !== "order" ? <form onSubmit={submit}>
      {type === "item" && <div className="modal-body"><div className="form-grid"><Field label="Название" wide><input name="name" autoFocus placeholder="Название блюда" required /></Field><Field label="Категория"><select name="category" required defaultValue=""><option value="" disabled>Выберите категорию</option>{workspace.categories.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Цена"><input name="price" type="number" min="0" step="0.01" placeholder="0.00" required /></Field><Field label="Ссылка на изображение" wide><input name="image" type="url" placeholder="https://..." /></Field><Field label="Описание" wide><textarea name="description" placeholder="Ингредиенты и короткое описание" /></Field></div></div>}
      {type === "invite" && <div className="modal-body"><div className="form-grid"><Field label="Имя"><input name="name" autoFocus placeholder="Имя сотрудника" required /></Field><Field label="E-mail"><input name="email" type="email" placeholder="name@example.com" required /></Field><Field label="Роль" wide><select name="role" defaultValue="waiter"><option value="waiter">Официант</option><option value="manager">Менеджер</option><option value="kitchen">Кухня</option><option value="viewer">Только просмотр</option></select></Field></div><div className="permission-note"><ShieldCheck size={20} /><p><strong>Доступ по роли</strong><span>Сотрудник увидит только разрешенные разделы этого заведения.</span></p></div></div>}
      <footer><Button kind="secondary" onClick={onClose}>Отмена</Button><Button type="submit" disabled={submitting || (type === "item" && workspace.categories.length === 0)}>{submitting ? "Сохраняем..." : type === "item" ? "Добавить в меню" : "Отправить приглашение"}</Button></footer>
    </form> : <><div className="modal-body order-detail">{order ? <><div className="order-detail-top"><StatusPill status={order.status} /><span><Clock3 size={15} />{new Date(order.created_at).toLocaleString("ru-RU")}</span></div><div className="order-source"><span><Table2 size={20} /></span><div><strong>{order.source}</strong><p>{order.guest_name || "Гость"}</p></div></div><dl className="order-total"><div><dt>Итого</dt><dd>{money(order.total_minor / 100, order.currency)}</dd></div></dl></> : <p>Заказов пока нет.</p>}</div><footer><Button kind="secondary" onClick={onClose}>Закрыть</Button>{order && order.status === "new" && <Button onClick={async()=>{await workspace.setOrderStatus(order.id,"accepted");notify("Заказ принят");onClose();}}>Принять заказ</Button>}</footer></>}
  </section></div>;
}
