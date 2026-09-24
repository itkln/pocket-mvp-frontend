"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { CalendarDays, Check, ChevronLeft, Ellipsis, Heart, MapPin, MessageSquareText, RefreshCw, Search, Star, Utensils, X } from "lucide-react";
import { APIError } from "../../../lib/api-client";
import { getPublicVenue, getPublicVenueMenu, type PublicMenuCategory, type PublicMenuItem, type PublicVenue } from "../../../lib/public-catalog-api";
import { useI18n } from "../i18n";
import { categoryForRoute } from "./categories";

type VenueSection = "menu" | "reviews" | "about" | "contacts";
const sections: { id: VenueSection; label: string }[] = [
  { id: "menu", label: "Меню" },
  { id: "reviews", label: "Отзывы" },
  { id: "about", label: "О месте" },
  { id: "contacts", label: "Контакты" },
];
const illustrations: Record<string, string> = {
  activities: "travel", "yoga-pilates": "yoga", "spa-massage": "spa", masterclasses: "workshops",
};

export function VenueDetailsScreen({ venueID, onBack, saved, onToggleSaved }: {
  venueID: string;
  onBack: () => void;
  saved: boolean;
  onToggleSaved?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const [state, setState] = useState<{ venue?: PublicVenue; error?: "missing" | "failed" }>({});
  const [menuState, setMenuState] = useState<{ categories: PublicMenuCategory[]; loading: boolean; error: boolean }>({ categories: [], loading: true, error: false });
  const [reload, setReload] = useState(0);
  const [activeSection, setActiveSection] = useState<VenueSection>("menu");
  const [compactHeader, setCompactHeader] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const infoCloseRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<VenueSection, HTMLElement | null>>>({});

  useEffect(() => {
    const controller = new AbortController();
    getPublicVenue(venueID, controller.signal)
      .then((venue) => setState({ venue }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ error: error instanceof APIError && error.status === 404 ? "missing" : "failed" });
      });
    return () => controller.abort();
  }, [venueID, reload]);

  useEffect(() => {
    const controller = new AbortController();
    getPublicVenueMenu(venueID, controller.signal)
      .then((categories) => setMenuState({ categories, loading: false, error: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMenuState({ categories: [], loading: false, error: true });
      });
    return () => controller.abort();
  }, [venueID, reload]);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMoreOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [moreOpen]);
  useEffect(() => {
    if (!infoOpen) return;
    infoCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setInfoOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [infoOpen]);

  useEffect(() => {
    const updateScrollState = () => {
      setCompactHeader(window.scrollY > 115);
      const offset = window.innerWidth <= 760 ? 220 : 170;
      let current: VenueSection = "menu";
      sections.forEach(({ id }) => {
        if ((sectionRefs.current[id]?.getBoundingClientRect().top ?? Infinity) <= offset) current = id;
      });
      setActiveSection(current);
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, [state.venue?.id]);

  const venue = state.venue;
  const openSection = (section: VenueSection) => {
    setActiveSection(section);
    sectionRefs.current[section]?.scrollIntoView?.({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };
  const photoStyle = venue?.image_url ? { backgroundImage: `url(${JSON.stringify(venue.image_url)})` } as CSSProperties : undefined;
  const illustration = venue ? illustrations[venue.category_slug] ?? venue.category_slug : "restaurants";
  const categoryLabel = venue ? categoryForRoute(venue.category_slug)?.label : undefined;
  const details = venue ? [venue.cuisine_type ? t(venue.cuisine_type) : "", venue.address, venue.city].filter(Boolean).join(" · ") : "";
  const normalizedQuery = menuQuery.trim().toLocaleLowerCase(locale);
  const searchResults = normalizedQuery ? menuState.categories.flatMap((category) => category.items.filter((item) =>
    [item.name, item.description ?? "", category.name].some((value) => value.toLocaleLowerCase(locale).includes(normalizedQuery)),
  )) : [];
  const formatPrice = (item: PublicMenuItem) => new Intl.NumberFormat(locale, { style: "currency", currency: item.currency }).format(item.price_minor / 100);
  const menuCards = (items: PublicMenuItem[]) => <div className="venue-public-menu-grid">{items.map((item) => <article className="venue-public-menu-card" key={item.id}>
    <div className="venue-public-menu-photo" style={item.image_url ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` } : undefined} role={item.image_url ? "img" : undefined} aria-label={item.image_url ? item.name : undefined}>
      {!item.image_url && <Utensils size={34} aria-hidden="true" />}
    </div>
    <div className="venue-public-menu-copy"><strong>{formatPrice(item)}</strong><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}</div>
  </article>)}</div>;

  return <section className={`spots-venue-detail spots-real-venue-detail ${searchOpen ? "venue-search-active" : ""}`}>
    <header className={`venue-mobile-toolbar ${compactHeader ? "compact" : ""}`}>
      <button type="button" aria-label={t("Назад к результатам")} onClick={onBack}><ChevronLeft size={24} /></button>
      <span className="venue-mobile-toolbar-title" aria-hidden={!compactHeader}>{venue?.name}</span>
      <div className="venue-mobile-toolbar-actions">
        <button type="button" aria-label={t("Поиск по меню")} onClick={() => setSearchOpen(true)}><Search size={23} /></button>
        {venue && onToggleSaved && <button type="button" aria-label={t(saved ? "Убрать из избранного" : "В избранное")} aria-pressed={saved} onClick={() => onToggleSaved(venue.id)}><Heart size={23} fill={saved ? "currentColor" : "none"} /></button>}
      </div>
    </header>
    {searchOpen && <div className="venue-mobile-search" role="search" aria-label={t("Поиск по меню")}>
      <div className="venue-mobile-search-bar"><input ref={searchRef} type="search" value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} placeholder={t("Поиск по меню")} aria-label={t("Поиск по меню")} />
        {menuQuery && <button type="button" className="venue-search-clear" aria-label={t("Очистить поиск")} onClick={() => { setMenuQuery(""); searchRef.current?.focus(); }}><X size={18} /></button>}
        <button type="button" className="venue-search-cancel" onClick={() => { setSearchOpen(false); setMenuQuery(""); }}>{t("Отменить")}</button></div>
      <div className="venue-search-results" aria-live="polite">{!normalizedQuery ? <h2>{t("Что будем искать?")}</h2> : menuState.loading ? <p>{t("Загружаем меню...")}</p> : menuState.error ? <p>{t("Не удалось загрузить меню")}</p> : searchResults.length ? menuCards(searchResults) : <div className="venue-search-no-results"><Search size={28} /><h2>{t("Ничего не нашли")}</h2><p>{t("Попробуйте другое название блюда")}</p></div>}</div>
      <div className="venue-mobile-booking-status" role="status"><span><CalendarDays size={16} />{t("Бронирование пока недоступно")}</span></div>
    </div>}
    <button type="button" className="back-link" onClick={onBack}><ChevronLeft size={18} />{t("Назад")}</button>
    {venue ? <article className="spots-restaurant venue-detail-page" aria-labelledby="venue-title">
      <div className="venue-primary-column">
        <div className="venue-overview-block">
          <div className={`venue-public-photo ${venue.image_url ? "has-image" : ""}`} style={photoStyle} role="img" aria-label={t("Фото заведения: {name}", { name: venue.name })}>
            {!venue.image_url && <Image src={`/assets/categories/${illustration}.png`} alt="" width={220} height={220} />}
          </div>
          <div className="venue-detail-summary">
            <div className="venue-detail-heading">
              {categoryLabel && <span className="venue-public-category">{t(categoryLabel)}</span>}
              <div className="venue-title-row"><h1 id="venue-title">{venue.name}</h1>{onToggleSaved && <button type="button" className={`icon-button ${saved ? "active" : ""}`} aria-label={t(saved ? "Убрать из избранного" : "В избранное")} aria-pressed={saved} onClick={() => onToggleSaved(venue.id)}><Heart size={22} fill={saved ? "currentColor" : "none"} /></button>}</div>
              <p>{details}</p>
              <div className="venue-facts" aria-label={t("Краткая информация")}>
                {venue.review_count > 0 && <span className="venue-public-rating"><Star size={16} fill="currentColor" /><span><b>{venue.rating.toFixed(1)}</b><small>{t("Оценок: {count}", { count: venue.review_count })}</small></span></span>}
                {venue.preorder_enabled && <span><Check size={16} />{t("Предзаказ доступен")}</span>}
                {venue.tags.map((tag) => <span key={tag}>{t(tag)}</span>)}
                <div ref={moreRef} className="venue-public-more-wrap"><button type="button" className="venue-public-more" aria-label={t("Ещё о заведении")} aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}><Ellipsis size={21} /></button>
                  {moreOpen && <div className="venue-more-popover"><button type="button" onClick={() => { setMoreOpen(false); setInfoOpen(true); }}>{t("Информация о заведении")}</button></div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="venue-detail-content">
          <nav className="venue-section-nav" aria-label={t("Разделы заведения")}>
            {sections.map(({ id, label }) => <button type="button" key={id} className={activeSection === id ? "active" : ""} aria-current={activeSection === id ? "location" : undefined} onClick={() => openSection(id)}>{t(label)}</button>)}
          </nav>
          <section ref={(node) => { sectionRefs.current.menu = node; }} className="venue-content-section venue-scroll-section" aria-labelledby="venue-menu-title">
            <div className="venue-section-heading"><h2 id="venue-menu-title">{t("Меню")}</h2></div>
            {menuState.loading ? <div className="venue-public-empty" role="status">{t("Загружаем меню...")}</div> : menuState.error ? <div className="venue-public-empty" role="alert">{t("Не удалось загрузить меню")}</div> : menuState.categories.length ? menuState.categories.map((category) => <div className="venue-public-menu-category" key={category.id}><h3>{category.name}</h3>{menuCards(category.items)}</div>) : <div className="venue-public-empty"><Utensils size={24} /><p>{t("Меню этого заведения пока недоступно")}</p></div>}
          </section>
          <section ref={(node) => { sectionRefs.current.reviews = node; }} className="venue-content-section venue-scroll-section" aria-labelledby="venue-reviews-title">
            <div className="venue-section-heading"><h2 id="venue-reviews-title">{t("Отзывы")}</h2></div>
            {venue.review_count > 0 && <div className="venue-rating-summary"><strong>{venue.rating.toFixed(1)}</strong><div><span aria-label={t("Рейтинг заведения")}><Star size={21} fill="currentColor" /></span><p>{t("Оценок: {count}", { count: venue.review_count })}</p></div></div>}
            <div className="venue-public-empty"><MessageSquareText size={24} /><p>{t("Подробные отзывы пока недоступны")}</p></div>
          </section>
          <section ref={(node) => { sectionRefs.current.about = node; }} className="venue-content-section venue-scroll-section" aria-labelledby="venue-about-title">
            <div className="venue-section-heading"><h2 id="venue-about-title">{t("О месте")}</h2></div>
            <p className="venue-about-copy">{venue.description || t("Описание заведения пока не добавлено")}</p>
            {venue.filters.length > 0 && <div className="venue-feature-list">{venue.filters.map((filter) => <span key={filter}><Check size={15} />{t(filter)}</span>)}</div>}
          </section>
          <section ref={(node) => { sectionRefs.current.contacts = node; }} className="venue-content-section venue-scroll-section" aria-labelledby="venue-contacts-title">
            <div className="venue-section-heading"><h2 id="venue-contacts-title">{t("Контакты")}</h2></div>
            <div className="venue-contact-details"><div><MapPin size={20} /><span><strong>{venue.address}</strong><small>{`${venue.city}, ${venue.country_code}`}</small></span></div></div>
          </section>
        </div>
      </div>
      <aside className="venue-booking-card venue-public-booking" aria-labelledby="venue-booking-title">
        <CalendarDays size={25} aria-hidden="true" />
        <h2 id="venue-booking-title">{t("Бронирование")}</h2>
        <p>{t("Онлайн-бронирование этого заведения пока недоступно")}</p>
        <button type="button" className="button" disabled>{t("Забронировать")}</button>
      </aside>
      <div className="venue-mobile-booking-status" role="status"><span><CalendarDays size={16} />{t("Бронирование пока недоступно")}</span></div>
      {infoOpen && <div className="venue-info-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setInfoOpen(false); }}>
        <section className="venue-info-sheet" role="dialog" aria-modal="true" aria-labelledby="venue-info-title">
          <div className="venue-info-handle" aria-hidden="true" /><button ref={infoCloseRef} type="button" className="venue-info-close" aria-label={t("Закрыть")} onClick={() => setInfoOpen(false)}><X size={22} /></button>
          <h2 id="venue-info-title">{t("Информация о заведении")}</h2><h3>{venue.name}</h3>
          <div className="venue-info-group"><strong>{t("О месте")}</strong><p>{venue.description || t("Описание заведения пока не добавлено")}</p>
            <div className={`venue-about-photo ${venue.image_url ? "has-image" : ""}`} style={photoStyle} role="img" aria-label={t("Фото заведения: {name}", { name: venue.name })}>{!venue.image_url && <Image src={`/assets/categories/${illustration}.png`} alt="" width={170} height={170} />}</div>
            {venue.filters.length > 0 && <div className="venue-feature-list">{venue.filters.map((filter) => <span key={filter}><Check size={15} />{t(filter)}</span>)}</div>}
          </div>
          <div className="venue-info-group"><strong>{t("Контакты")}</strong><p><MapPin size={18} />{venue.address}, {venue.city}, {venue.country_code}</p></div>
        </section>
      </div>}
    </article> : state.error ? <div className="spots-catalog-status" role="alert"><strong>{t(state.error === "missing" ? "Заведение больше недоступно" : "Не удалось загрузить заведение")}</strong>{state.error === "failed" && <button type="button" className="button secondary" onClick={() => { setState({}); setReload((value) => value + 1); }}><RefreshCw size={17} />{t("Повторить")}</button>}</div> : <div className="spots-catalog-status" role="status">{t("Загружаем заведение...")}</div>}
  </section>;
}
