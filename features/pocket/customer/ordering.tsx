"use client";

import { tipAmount, tipSelection, type TipDraft } from "../../../lib/gratuity";
import { TipPicker } from "./tip-picker";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, CreditCard, Heart, MapPin, Minus, Phone, Plus, ShieldCheck, ShoppingBag, Star, Trash2, WalletCards } from "lucide-react";
import { menuItems } from "../model";
import { money, Button, IconButton, FoodImage, EmptyIllustration, PageHeader, PanelTitle } from "../ui";

type VenueSection = "overview" | "menu" | "reviews" | "about" | "contacts";

const venueSections: { id: VenueSection; label: string }[] = [
  { id: "menu", label: "Меню" },
  { id: "reviews", label: "Отзывы" },
  { id: "about", label: "О месте" },
  { id: "contacts", label: "Контакты" },
];

const reviews = [
  { name: "Анна", date: "12 сентября", text: "Очень тёплое место для спокойного ужина. Паста отличная, а команда помогла выбрать вино к основным блюдам." },
  { name: "Михаил", date: "8 сентября", text: "Зашли без долгих планов и остались на весь вечер. Понравились открытая кухня, быстрый сервис и десерты." },
  { name: "София", date: "31 августа", text: "Красивый свет, удобные столы и понятное меню. Буррата и сибас — то, ради чего точно вернёмся." },
];

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const addDays = (value: Date, amount: number) => new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount);
const isSameDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
const capitalized = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const reservationDateLabel = (value: Date) => {
  const today = startOfDay(new Date());
  if (isSameDay(value, today)) return "Сегодня";
  if (isSameDay(value, addDays(today, 1))) return "Завтра";
  return value.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");
};
const accessibleDateLabel = (value: Date) => value.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const calendarDates = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

export function CustomerMenu({ cart, onAdd, onUpdateQty, onCart, onReserve }: { cart: Record<number, number>; onAdd: (id: number) => void; onUpdateQty: (id: number, delta: number) => void; onCart: () => void; onReserve: () => void }) {
  const [category, setCategory] = useState("Все");
  const [activeSection, setActiveSection] = useState<VenueSection>("menu");
  const [favorite, setFavorite] = useState(false);
  const [guests, setGuests] = useState(2);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<"details" | "preorder">("details");
  const [time, setTime] = useState("19:30");
  const sectionRefs = useRef<Partial<Record<VenueSection, HTMLElement | null>>>({});
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const categories = ["Все", "Закуски", "Паста", "Основное", "Десерты", "Напитки"];
  const visible = category === "Все" ? menuItems : menuItems.filter((item) => item.category === category);
  const today = startOfDay(new Date());
  const dates = calendarDates(calendarMonth);
  const guestLabel = `${guests} ${guests === 1 ? "гость" : guests < 5 ? "гостя" : "гостей"}`;
  const preorderItems = menuItems.filter((item) => cart[item.id]);
  const preorderCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const preorderTotal = menuItems.reduce((sum, item) => sum + item.price * (cart[item.id] || 0), 0);

  useEffect(() => {
    const updateActiveSection = () => {
      const offset = window.innerWidth <= 760 ? 190 : 170;
      let current: VenueSection = "menu";
      venueSections.forEach(({ id }) => {
        if ((sectionRefs.current[id]?.getBoundingClientRect().top ?? Infinity) <= offset) current = id;
      });
      setActiveSection(current);
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!calendarRef.current?.contains(event.target as Node)) setCalendarOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [calendarOpen]);

  const openSection = (section: VenueSection) => {
    setActiveSection(section);
    sectionRefs.current[section]?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  const selectedDishList = preorderItems.length ? <div className="venue-booking-preorder-list">{preorderItems.map((item) => <article key={item.id}><FoodImage item={item} /><div><strong title={item.name}>{item.name}</strong><small>{money(item.price * cart[item.id])}</small></div><div className="venue-preorder-quantity"><button type="button" aria-label={`Уменьшить в предзаказе: ${item.name}`} onClick={() => onUpdateQty(item.id, -1)}><Minus size={17} /></button><strong>{cart[item.id]}</strong><button type="button" aria-label={`Добавить ещё в предзаказ: ${item.name}`} onClick={() => onUpdateQty(item.id, 1)}><Plus size={17} /></button></div></article>)}</div> : null;
  const emptyPreorderState = <div className="venue-preorder-empty"><div><h3>В предзаказе пока пусто</h3><p>Добавьте блюда из меню — приготовим их к вашему приходу</p></div></div>;
  return <div className="spots-restaurant venue-detail-page">
    <div className="venue-primary-column">
    <div className="venue-overview-block">
    <section ref={(node) => { sectionRefs.current.overview = node; }} className="venue-detail-hero venue-scroll-section" aria-labelledby="venue-title">
      <div className="venue-detail-summary">
        <div className="venue-detail-heading">
          <div className="venue-title-row"><h1 id="venue-title">North &amp; Vine</h1><IconButton icon={Heart} label={favorite ? "Убрать из избранного" : "В избранное"} active={favorite} onClick={() => setFavorite((value) => !value)} /></div>
          <p>Европейская кухня · Štúrova 12, Bratislava</p>
          <div className="venue-facts" aria-label="Краткая информация">
            <span><Star size={16} fill="currentColor" />4.8 <small>124 отзыва</small></span>
            <span className="venue-open-status"><i />Открыто до 22:30</span>
            <span>€€</span>
          </div>
          <div className="venue-feature-list venue-feature-list-primary"><span><Check size={16} />Открытая кухня</span><span><Check size={16} />Летняя терраса</span><span><Check size={16} />Можно с питомцами</span><span><Check size={16} />Предзаказ блюд</span></div>
        </div>
      </div>
    </section>
    </div>

    <div className="venue-detail-content">
        <nav className="venue-section-nav" aria-label="Разделы заведения">
          {venueSections.map(({ id, label }) => <button type="button" key={id} className={activeSection === id ? "active" : ""} aria-current={activeSection === id ? "location" : undefined} onClick={() => openSection(id)}>{label}</button>)}
        </nav>
        <section ref={(node) => { sectionRefs.current.menu = node; }} className="venue-content-section venue-menu-section venue-scroll-section" aria-labelledby="venue-menu-title">
          <div className="venue-section-heading"><h2 id="venue-menu-title">Меню</h2></div>
          <nav className="venue-menu-categories" aria-label="Категории меню">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</nav>
          <div className="venue-menu-grid">{visible.map((item) => <article className="venue-menu-card" key={item.id}><div className="venue-menu-card-media"><FoodImage item={item} />{item.popular && <span className="venue-menu-hit">Хит</span>}{cart[item.id] ? <div className="qty-inline"><button type="button" aria-label="Уменьшить" onClick={() => onUpdateQty(item.id, -1)}><Minus size={17} /></button><span>{cart[item.id]}</span><button type="button" aria-label="Добавить ещё" onClick={() => onUpdateQty(item.id, 1)}><Plus size={17} /></button></div> : <button type="button" className="food-add-button" aria-label="Добавить" onClick={() => onAdd(item.id)}><Plus size={20} /></button>}</div><div className="venue-menu-card-copy"><strong>{money(item.price)}</strong><h3>{item.name}</h3><p>{item.description}</p></div></article>)}</div>
        </section>

        <section ref={(node) => { sectionRefs.current.reviews = node; }} className="venue-content-section venue-reviews-section venue-scroll-section" aria-labelledby="venue-reviews-title">
          <div className="venue-section-heading"><h2 id="venue-reviews-title">Отзывы</h2><button type="button" className="venue-section-link">Все отзывы</button></div>
          <div className="venue-rating-summary"><strong>4.8</strong><div><span aria-label="5 из 5 звёзд">★★★★★</span><p>На основе 124 оценок</p></div></div>
          <div className="venue-review-list">{reviews.slice(0, 2).map((review) => <article key={review.name}><header><div className="venue-review-avatar">{review.name[0]}</div><div><strong>{review.name}</strong><small>{review.date}</small></div><span>★★★★★</span></header><p>{review.text}</p></article>)}</div>
        </section>

        <section ref={(node) => { sectionRefs.current.about = node; }} className="venue-content-section venue-about-section venue-scroll-section" aria-labelledby="venue-about-title">
          <div className="venue-section-heading"><h2 id="venue-about-title">О месте</h2></div>
          <p className="venue-about-copy">Городское бистро с сезонным меню, открытой кухней и спокойной атмосферой. Здесь готовят современную европейскую еду из локальных продуктов и помогают подобрать вино к каждому блюду.</p>
          <div className="venue-about-gallery" aria-label="Фотографии North & Vine"><div className="venue-gallery-photo pos-0" role="img" aria-label="Основной зал North & Vine" /><div className="venue-gallery-photo pos-1" role="img" aria-label="Открытая кухня North & Vine" /><div className="venue-gallery-photo pos-2" role="img" aria-label="Столики у окна North & Vine" /></div>
        </section>

        <section ref={(node) => { sectionRefs.current.contacts = node; }} className="venue-content-section venue-contacts-section venue-scroll-section" aria-labelledby="venue-contacts-title">
          <div className="venue-section-heading"><h2 id="venue-contacts-title">Контакты</h2></div>
          <div className="venue-contact-grid"><div className="venue-contact-details"><div><MapPin size={19} /><span><strong>Štúrova 12</strong><small>Bratislava, 811 02</small></span></div><div><Clock3 size={19} /><span><strong>Сегодня до 22:30</strong><small>Пн–Вс · 09:00–22:30</small></span></div><div><Phone size={19} /><span><strong>+421 910 555 101</strong><small>Позвонить в заведение</small></span></div></div><div className="venue-map-preview" aria-label="Расположение на карте"><span><MapPin size={22} /></span><small>Старый город</small></div></div>
        </section>
    </div>
    </div>

    <aside className={`venue-booking-card ${bookingStep === "preorder" ? "is-preorder" : ""}`} aria-labelledby="quick-booking-title">
        <div className="venue-booking-heading"><h2 id="quick-booking-title">{bookingStep === "details" ? "Забронировать" : "Предзаказ"}</h2></div>
        {bookingStep === "details" ? <>
        <div className="venue-booking-toolbar">
          <div className="venue-date-picker" ref={calendarRef}>
            <button type="button" className={`venue-date-trigger ${calendarOpen ? "active" : ""}`} aria-label={`Выбрать дату: ${reservationDateLabel(selectedDate)}`} aria-haspopup="dialog" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((value) => !value)}><CalendarDays size={17} /><span>{reservationDateLabel(selectedDate)}</span><ChevronDown className="venue-date-chevron" size={16} /></button>
            {calendarOpen && <div className="venue-calendar-popover" role="dialog" aria-label="Выбор даты">
              <div className="venue-calendar-header"><strong>{capitalized(calendarMonth.toLocaleDateString("ru-RU", { month: "long" }))}</strong><div><button type="button" aria-label="Предыдущий месяц" disabled={calendarMonth.getFullYear() === today.getFullYear() && calendarMonth.getMonth() === today.getMonth()} onClick={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><button type="button" aria-label="Следующий месяц" onClick={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div></div>
              <div className="venue-calendar-weekdays" aria-hidden="true">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((item) => <span key={item}>{item}</span>)}</div>
              <div className="venue-calendar-grid">{dates.map((date) => {
                const disabled = date < today;
                const outside = date.getMonth() !== calendarMonth.getMonth();
                const selected = isSameDay(date, selectedDate);
                return <button type="button" key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`} className={`${outside ? "outside" : ""} ${selected ? "selected" : ""}`} aria-label={accessibleDateLabel(date)} aria-pressed={selected} disabled={disabled} onClick={() => { setSelectedDate(date); setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setCalendarOpen(false); }}>{date.getDate()}</button>;
              })}</div>
            </div>}
          </div>
          <div className="venue-guests"><button type="button" aria-label="Уменьшить количество гостей" disabled={guests === 1} onClick={() => setGuests((value) => Math.max(1, value - 1))}><Minus size={16} /></button><strong>{guestLabel}</strong><button type="button" aria-label="Увеличить количество гостей" disabled={guests === 8} onClick={() => setGuests((value) => Math.min(8, value + 1))}><Plus size={16} /></button></div>
        </div>
        <p className="venue-booking-label">Свободное время</p>
        <div className="venue-time-grid">{["18:30", "19:00", "19:30", "20:00", "20:30", "21:00"].map((item) => <button type="button" key={item} className={time === item ? "active" : ""} aria-pressed={time === item} onClick={() => setTime(item)}>{item}</button>)}</div>
        <div className="venue-booking-details-selection">{selectedDishList ?? emptyPreorderState}</div>
        <button type="button" className="venue-booking-next venue-booking-details-next" onClick={() => preorderCount ? setBookingStep("preorder") : onReserve()}>{preorderCount ? <><span>Продолжить</span><strong>{money(preorderTotal)}</strong></> : <span>Продолжить без предзаказа</span>}</button>
        </> : <div className="venue-booking-preorder-step">
          <div className="venue-reservation-summary">
            <div><strong>{reservationDateLabel(selectedDate)} · {time}</strong><small>{guestLabel}</small></div>
            <button type="button" onClick={() => setBookingStep("details")}>Изменить</button>
          </div>
          {selectedDishList ?? emptyPreorderState}
          <button type="button" className="venue-booking-next" onClick={() => preorderCount ? onCart() : onReserve()}>{preorderCount ? <><span>Далее</span><strong>{money(preorderTotal)}</strong></> : <span>Продолжить без предзаказа</span>}</button>
        </div>}
    </aside>
  </div>;
}

export function Checkout({ cart, total, updateQty, onBack, onDone }: { cart: Record<number, number>; total: number; updateQty: (id: number, delta: number) => void; onBack: () => void; onDone: () => void }) {
  const [tip, setTip] = useState<TipDraft>({ mode: "none" });
  const [method, setMethod] = useState("card");
  const subtotalMinor = Math.round(total * 100);
  const calculatedTip = tipAmount(subtotalMinor, tipSelection(tip));
  const tipValue = (calculatedTip ?? 0) / 100;
  const selected = menuItems.filter((item) => cart[item.id]);
  return <><button className="back-link" onClick={onBack}><ChevronLeft size={17} />Вернуться в меню</button><PageHeader title="Ваш заказ" subtitle="North & Vine · Стол 08" /><div className="checkout-layout"><section className="checkout-main"><div className="panel checkout-items"><PanelTitle title={`Позиции · ${Object.values(cart).reduce((a,b)=>a+b,0)}`} />{selected.length ? selected.map((item) => <div className="checkout-item" key={item.id}><FoodImage item={item} /><div><strong>{item.name}</strong><small>Без изменений</small><button>Добавить комментарий</button></div><div className="qty-control"><IconButton icon={cart[item.id] === 1 ? Trash2 : Minus} label="Уменьшить" onClick={() => updateQty(item.id, -1)} /><span>{cart[item.id]}</span><IconButton icon={Plus} label="Увеличить" onClick={() => updateQty(item.id, 1)} /></div><b>{money(item.price * cart[item.id])}</b></div>) : <EmptyIllustration icon={ShoppingBag} title="Корзина пуста" text="Вернитесь в меню и выберите блюда." />}</div><div className="panel"><TipPicker value={tip} onChange={setTip} subtotal={subtotalMinor} currency="EUR" /></div><div className="panel"><PanelTitle title="Способ оплаты" /><div className="payment-options"><button className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}><CreditCard size={20} /><span><strong>Карта •••• 4242</strong><small>Основной способ</small></span><i /></button><button className={method === "apple" ? "active" : ""} onClick={() => setMethod("apple")}><WalletCards size={20} /><span><strong>Apple Pay</strong><small>Быстрая оплата</small></span><i /></button></div></div></section><aside className="panel order-summary"><PanelTitle title="Итого" /><dl><div><dt>Блюда</dt><dd>{money(total)}</dd></div><div><dt>Сервисный сбор</dt><dd>€0.00</dd></div><div><dt>Чаевые</dt><dd>{money(tipValue)}</dd></div></dl><div className="summary-total"><span>К оплате</span><strong>{money(total + tipValue)}</strong></div><Button className="full pay-button" icon={ShieldCheck} disabled={!selected.length || calculatedTip === null} onClick={onDone}>Оплатить {money(total + tipValue)}</Button><p className="secure-note"><ShieldCheck size={14} />Безопасная оплата через Stripe</p></aside></div></>;
}
