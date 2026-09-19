"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Heart, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { useI18n } from "../i18n";
import Image from "next/image";
import { categoryForRoute, matchesSpotQuery, spotCategories } from "./categories";

const venues = [
  { name: "North & Vine", category: "Рестораны", cuisine: "Европейская", distance: "0,8 км", rating: "4.8", tag: "Стол через 20 мин", position: "0% 0%", filters: ["Лучшие", "Открыто"] },
  { name: "Casa Forma", category: "Рестораны", cuisine: "Итальянская", distance: "1,2 км", rating: "4.7", tag: "Есть места сегодня", position: "50% 0%", filters: ["Итальянская", "Открыто"] },
  { name: "Mizu Table", category: "Рестораны", cuisine: "Японская", distance: "1,7 км", rating: "4.9", tag: "Предзаказ доступен", position: "100% 0%", filters: ["Азиатская", "Лучшие", "С предзаказом"] },
  { name: "Basil & Stone", category: "Рестораны", cuisine: "Средиземноморская", distance: "2,1 км", rating: "4.6", tag: "Бронь на вечер", position: "0% 100%", filters: [] },
  { name: "Morning Lab", category: "Рестораны", cuisine: "Завтраки", distance: "0,5 км", rating: "4.9", tag: "Открыто сейчас", position: "50% 100%", filters: ["Завтраки", "Лучшие", "Открыто", "Рядом"] },
  { name: "Café Dunaj", category: "Рестораны", cuisine: "Кофе и десерты", distance: "1,4 км", rating: "4.8", tag: "Столик у окна", position: "100% 100%", filters: ["Кофе и десерты", "Лучшие", "Рядом"] },
  { name: "Old Town Barber", category: "Красота", cuisine: "Стрижка", distance: "0,7 км", rating: "4.9", tag: "Есть окно сегодня", position: "0% 0%", filters: ["Стрижка", "Лучшие", "Рядом"] },
  { name: "Gentlemen Studio", category: "Красота", cuisine: "Борода", distance: "1,8 км", rating: "4.7", tag: "Запись на вечер", position: "50% 0%", filters: ["Борода"] },
  { name: "Nail Room", category: "Красота", cuisine: "Аппаратный маникюр", distance: "0,9 км", rating: "4.8", tag: "Свободно сегодня", position: "100% 0%", filters: ["Аппаратный", "Лучшие", "Рядом"] },
  { name: "Pure Nails", category: "Красота", cuisine: "Маникюр и педикюр", distance: "1,6 км", rating: "4.7", tag: "Онлайн-запись", position: "0% 100%", filters: ["Классический", "Педикюр"] },
  { name: "Atelier Beauty", category: "Красота", cuisine: "Волосы", distance: "1,1 км", rating: "4.9", tag: "Мастер свободен", position: "50% 100%", filters: ["Волосы", "Лучшие", "Рядом"] },
  { name: "Glow Studio", category: "Красота", cuisine: "Макияж", distance: "2,3 км", rating: "4.7", tag: "Запись на завтра", position: "100% 100%", filters: ["Макияж"] },
  { name: "Urban Gym", category: "Спорт", cuisine: "Тренажёрный зал", distance: "1,3 км", rating: "4.8", tag: "Пробный визит", position: "0% 0%", filters: ["Тренажёрный зал", "Лучшие", "Рядом"] },
  { name: "Motion Club", category: "Спорт", cuisine: "Групповые занятия", distance: "2,0 км", rating: "4.6", tag: "Занятие сегодня", position: "50% 0%", filters: ["Групповые занятия"] },
  { name: "Still Yoga", category: "Йога и пилатес", cuisine: "Йога", distance: "0,6 км", rating: "4.9", tag: "Для начинающих", position: "100% 0%", filters: ["Йога", "Для начинающих", "Рядом"] },
  { name: "Core Pilates", category: "Йога и пилатес", cuisine: "Пилатес", distance: "1,9 км", rating: "4.8", tag: "Группа сегодня", position: "0% 100%", filters: ["Пилатес"] },
  { name: "Quiet Touch", category: "SPA и массаж", cuisine: "Расслабляющий массаж", distance: "1,0 км", rating: "4.9", tag: "Свободно сегодня", position: "50% 100%", filters: ["Расслабляющий", "Лучшие", "Рядом"] },
  { name: "Recovery Point", category: "SPA и массаж", cuisine: "Спортивный массаж", distance: "2,2 км", rating: "4.7", tag: "Запись на вечер", position: "100% 100%", filters: ["Спортивный"] },
  { name: "Cinema Lumière", category: "Развлечения", cuisine: "Кино", distance: "1,2 км", rating: "4.8", tag: "Вечерние сеансы", position: "", filters: ["Кино", "Для двоих"] },
  { name: "Exit Room", category: "Развлечения", cuisine: "Квесты", distance: "2,0 км", rating: "4.9", tag: "Для компании", position: "", filters: ["Квесты", "Для компании"] },
  { name: "Danube Walks", category: "Активности", cuisine: "Экскурсии", distance: "0,8 км", rating: "4.9", tag: "Прогулки по городу", position: "", filters: ["Экскурсии", "На улице"] },
  { name: "River Paddle", category: "Активности", cuisine: "На воде", distance: "2,8 км", rating: "4.7", tag: "Прокат SUP", position: "", filters: ["На воде", "На улице"] },
  { name: "Clay House", category: "Мастер-классы", cuisine: "Керамика", distance: "1,1 км", rating: "4.9", tag: "Для начинающих", position: "", filters: ["Керамика", "Для начинающих"] },
  { name: "Studio Palette", category: "Мастер-классы", cuisine: "Живопись", distance: "1,9 км", rating: "4.8", tag: "Творческий вечер", position: "", filters: ["Живопись", "Для начинающих"] },
];

const categoryImagePositions: Record<string, string> = {
  "Красота": "0% 100%", "Спорт": "33.333% 100%",
  "Йога и пилатес": "66.667% 100%", "SPA и массаж": "100% 100%",
};

const categoryIllustrations: Record<string, string> = {
  restaurants: "restaurants",
  entertainment: "entertainment",
  activities: "travel",
  sports: "sports",
  "yoga-pilates": "yoga",
  "spa-massage": "spa",
  beauty: "beauty",
  masterclasses: "workshops",
};

const venueIllustrations: Record<string, { image: string; gradient: string }> = {
  "Развлечения": { image: "entertainment", gradient: "var(--spots-gradient-entertainment)" },
  "Активности": { image: "travel", gradient: "var(--spots-gradient-activities)" },
  "Мастер-классы": { image: "workshops", gradient: "var(--spots-gradient-workshops)" },
};

type SavedPlacesProps = { savedPlaces?: string[]; onToggleSaved?: (name: string) => void };

export function DiscoverScreen({ city = "", query, categorySlug, filter = "Все", onCategoryChange, onFilterChange, onVenue, savedPlaces, onToggleSaved }: {
  city?: string; query: string; categorySlug?: string; filter?: string;
  onCategoryChange: (slug: string) => void; onFilterChange: (filter: string) => void;
  onVenue: () => void; onReservation: () => void;
} & SavedPlacesProps) {
  const { t } = useI18n();
  const category = categoryForRoute(categorySlug);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const activeFilter = category?.filters.includes(filter) ? filter : "Все";
  const matchingVenues = useMemo(() => venues.filter((venue) => {
    if (category && venue.category !== category.label) return false;
    const text = `${venue.name} ${venue.cuisine} ${venue.category} ${venue.filters.join(" ")} ${t(venue.cuisine)} ${t(venue.category)}`;
    return (!city || city === "Братислава") && matchesSpotQuery(text, query)
      && (activeFilter === "Все" || venue.filters.includes(activeFilter));
  }), [query, city, t, category, activeFilter]);
  const visibleCategories = category ? [category] : spotCategories;
  const setFilter = (value: string) => onFilterChange(activeFilter === value ? "Все" : value);

  return <div className={`spots-discover spots-category-catalog ${category ? "category-selected" : ""}`}>
    {!category && <nav className="spots-category-navigation" aria-label={t("Категории")}>
      {spotCategories.map(({ slug, label }) => <button type="button" key={slug} className="spots-category-tile" data-category={slug} onClick={() => onCategoryChange(slug)}>
        <span className="spots-category-label">{t(label)}</span>
        <Image className="spots-category-illustration" src={`/assets/categories/${categoryIllustrations[slug] ?? slug}.png`} alt="" width={144} height={144} sizes="(max-width: 760px) 120px, 144px" />
      </button>)}
    </nav>}

    <dialog ref={filterDialog} className="spots-picker-dialog" aria-labelledby="spots-filter-title" onClick={(event) => { if (event.target === event.currentTarget) filterDialog.current?.close(); }}>
      <div className="spots-picker-content">
        <div className="spots-picker-heading"><h2 id="spots-filter-title">{t("Фильтры")}</h2><button type="button" className="icon-button" aria-label={t("Закрыть фильтры")} onClick={() => filterDialog.current?.close()}><X size={20} /></button></div>
        {category && <><p className="spots-filter-category">{t(category.label)}</p><div className="spots-filter-options">{category.filters.map((label) => <button type="button" key={label} aria-pressed={activeFilter === label} onClick={() => setFilter(label)}>{t(label)}</button>)}</div></>}
        <div className="spots-picker-footer"><button type="button" className="button secondary" onClick={() => onFilterChange("Все")}>{t("Сбросить")}</button><button type="button" className="button primary" onClick={() => filterDialog.current?.close()}>{t("Показать")} ({matchingVenues.length})</button></div>
      </div>
    </dialog>
    <div className="spots-results">
      {(!city || city === "Братислава") ? visibleCategories.map((item) => <CategorySection
        key={item.slug} category={item.label} venues={matchingVenues.filter((venue) => venue.category === item.label)}
        expanded={Boolean(category)} selected={Boolean(category)} filters={item.filters} activeFilter={activeFilter}
        onFilter={setFilter} onOpenFilters={() => filterDialog.current?.showModal()} onExpand={() => onCategoryChange(item.slug)}
        savedPlaces={savedPlaces} onToggleSaved={onToggleSaved} onVenue={onVenue}
      />) : <div className="spots-search-empty"><Search size={24} /><strong>{t("В этом городе пока нет заведений")}</strong><p>{t(city)}</p></div>}
    </div>
  </div>;
}

function CategorySection({ category, venues: items, expanded, selected, filters, activeFilter, onFilter, onOpenFilters, onExpand, onVenue, savedPlaces, onToggleSaved }: {
  category: string; venues: typeof venues; expanded: boolean; selected: boolean; filters: string[]; activeFilter: string; onFilter: (filter: string) => void; onOpenFilters: () => void; onExpand: () => void; onVenue: () => void;
} & SavedPlacesProps) {
  const { t } = useI18n();
  const list = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ previous: false, next: false });
  const updateScroll = () => {
    const element = list.current;
    if (element) setScrollState({ previous: element.scrollLeft > 1, next: element.scrollLeft + element.clientWidth < element.scrollWidth - 1 });
  };
  useEffect(() => {
    updateScroll();
    if (!list.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateScroll);
    observer.observe(list.current);
    return () => observer.disconnect();
  }, [items.length, expanded]);
  const scroll = (direction: number) => {
    const element = list.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const Heading = expanded ? "h1" : "h2";
  return <section className="discover-section spots-category-section" aria-label={t(category)}>
    <div className="spots-section-heading">
      <Heading>{t(category)}</Heading>
      <div className="spots-section-actions">
        {!expanded && items.length > 0 && <button type="button" className="spots-show-category" onClick={onExpand} aria-label={`${t("Все")}: ${t(category)}`}>{t("Все")}</button>}
      </div>
    </div>
    {selected && <section className="cuisine-section spots-category-filters" aria-label={`${t("Фильтры заведений")}: ${t(category)}`}>
      <div className="cuisine-strip">
        <button type="button" className={`spots-filter-trigger ${activeFilter !== "Все" ? "active" : ""}`} aria-label={t("Фильтры")} aria-haspopup="dialog" onClick={onOpenFilters}><SlidersHorizontal size={17} /></button>
        {filters.map((label) => <button type="button" key={label} aria-pressed={activeFilter === label} className={activeFilter === label ? "active" : ""} onClick={() => onFilter(label)}><strong>{t(label)}</strong></button>)}
      </div>
    </section>}
    {items.length ? <div className={`spots-venue-carousel ${expanded ? "expanded" : ""}`}>
      <div ref={list} onScroll={updateScroll} className={expanded ? "venue-grid" : "spots-venue-shelf"}>
        {items.map((venue) => <VenueCard key={venue.name} {...venue} saved={savedPlaces?.includes(venue.name)} onToggleSaved={onToggleSaved} onClick={onVenue} />)}
      </div>
      {!expanded && (scrollState.previous || scrollState.next) && <>
        <button type="button" className="spots-carousel-button previous" disabled={!scrollState.previous} onClick={() => scroll(-1)} aria-label={`${t(category)}: ${t("Назад")}`}><ChevronLeft size={26} /></button>
        <button type="button" className="spots-carousel-button next" disabled={!scrollState.next} onClick={() => scroll(1)} aria-label={`${t(category)}: ${t("Далее")}`}><ChevronRight size={26} /></button>
      </>}
    </div> : <p className="spots-category-empty">{t("В этой категории пока нет мест")}</p>}
  </section>;
}

export function SavedPlacesScreen({ savedPlaces = [], onToggleSaved, onVenue }: SavedPlacesProps & { onVenue: () => void }) {
  const savedVenues = venues.filter((venue) => savedPlaces.includes(venue.name));
  return <section><div className="page-header"><h1>Сохранённые места</h1></div>{savedVenues.length ? <div className="venue-grid">{savedVenues.map((venue) => <VenueCard key={venue.name} {...venue} saved onToggleSaved={onToggleSaved} onClick={onVenue} />)}</div> : <div className="spots-search-empty"><Heart size={28} /><strong>Пока нет сохранённых мест</strong></div>}</section>;
}

export function VenueCard({ name, category, cuisine, distance, rating, tag, position, onClick, saved, onToggleSaved }: { name: string; category: string; cuisine: string; distance: string; rating: string; tag: string; position: string; onClick: () => void; saved?: boolean; onToggleSaved?: (name: string) => void }) {
  const { t } = useI18n();
  const [localFavorite, setLocalFavorite] = useState(false);
  const favorite = saved ?? localFavorite;
  const setFavorite = (value: boolean) => {
    setLocalFavorite(value);
    onToggleSaved?.(name);
  };
  const serviceImage = category === "Рестораны" ? undefined : categoryImagePositions[category];
  const venueIllustration = !position ? venueIllustrations[category] : undefined;
  const imageStyle = serviceImage
    ? { "--service-image-position": serviceImage } as CSSProperties
    : venueIllustration
      ? { "--venue-illustration": `url('/assets/categories/${venueIllustration.image}.png')`, "--venue-illustration-background": venueIllustration.gradient } as CSSProperties
    : { backgroundPosition: position };
  return <article className="venue-card"><div className={`venue-card-image ${serviceImage ? "service-venue-image" : venueIllustration ? "illustrated-venue-image" : !position ? "text-venue-image" : ""}`} style={imageStyle}><button type="button" className="venue-image-link" aria-label={`Открыть ${name}`} onClick={onClick} />{!position && !venueIllustration && <strong className="text-venue-name">{name}</strong>}{onToggleSaved && <button type="button" className="icon-button" aria-label={favorite ? "Убрать из избранного" : "В избранное"} aria-pressed={favorite} onClick={() => setFavorite(!favorite)}><Heart size={19} fill={favorite ? "currentColor" : "none"} /></button>}</div><button type="button" className="venue-card-copy" onClick={onClick}><span><h3>{name}</h3><b><Star size={14} fill="currentColor" />{rating}</b></span><p>{t(cuisine)} · {distance}</p><small className="venue-card-tag">{t(tag)}</small></button></article>;
}
