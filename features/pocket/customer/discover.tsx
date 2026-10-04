"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Heart, RefreshCw, Search, Star, X } from "lucide-react";
import Image from "next/image";
import { listPublicVenues, type PublicVenue, type PublicVenuePage } from "../../../lib/public-catalog-api";
import { useI18n } from "../i18n";
import { categoryForRoute, spotCategories } from "./categories";

import { CategoryFilterStrip } from "./filter-strip";

const emptyPage: PublicVenuePage = { venues: [], page: 1, page_size: 24, total: 0, total_pages: 0, has_next: false };

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

type SavedPlacesProps = { savedPlaces?: string[]; onToggleSaved?: (id: string) => void; savingIds?: string[] };

export function DiscoverScreen({ city = "", query, categorySlug, filter = "Все", onCategoryChange, onFilterChange, onVenue, savedPlaces, onToggleSaved }: {
  city?: string; query: string; categorySlug?: string; filter?: string;
  onCategoryChange: (slug: string) => void; onFilterChange: (filter: string) => void;
  onVenue: (venue: PublicVenue) => void;
} & SavedPlacesProps) {
  const { t } = useI18n();
  const category = categoryForRoute(categorySlug);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const activeFilter = category?.filters.includes(filter) ? filter : "Все";
  const queryScope = JSON.stringify([city, query, category?.slug ?? "", activeFilter]);
  const [pagination, setPagination] = useState({ scope: queryScope, page: 1 });
  const page = pagination.scope === queryScope ? pagination.page : 1;
  const [reload, setReload] = useState(0);
  const requestKey = JSON.stringify([queryScope, page, reload]);
  const [catalog, setCatalog] = useState<{ requestKey: string; result: PublicVenuePage; error: boolean }>({ requestKey: "", result: emptyPage, error: false });
  const state = catalog.requestKey !== requestKey ? "loading" : catalog.error ? "error" : "ready";
  const result = catalog.requestKey === requestKey ? catalog.result : emptyPage;

  useEffect(() => {
    const controller = new AbortController();
    listPublicVenues({ city, query, category: category?.slug, filter: activeFilter, page }, controller.signal)
      .then((next) => setCatalog({ requestKey, result: next, error: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalog({ requestKey, result: emptyPage, error: true });
      });
    return () => controller.abort();
  }, [city, query, category?.slug, activeFilter, page, requestKey]);

  const venuesByCategory = useMemo(() => new Map(spotCategories.map((item) => [
    item.slug,
    result.venues.filter((venue) => venue.category_slug === item.slug),
  ])), [result.venues]);
  const visibleCategories = category
    ? [category]
    : spotCategories.filter((item) => (venuesByCategory.get(item.slug)?.length ?? 0) > 0);
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
        <div className="spots-picker-footer"><button type="button" className="button secondary" onClick={() => onFilterChange("Все")}>{t("Сбросить")}</button><button type="button" className="button primary" onClick={() => filterDialog.current?.close()}>{t("Показать")} ({result.total})</button></div>
      </div>
    </dialog>

    <div className="spots-results" aria-busy={state === "loading"}>
      {state === "loading" && <CatalogStatus><span className="spots-catalog-spinner" />{t("Загружаем заведения...")}</CatalogStatus>}
      {state === "error" && <CatalogStatus alert><strong>{t("Не удалось загрузить заведения")}</strong><button type="button" className="button secondary" onClick={() => setReload((value) => value + 1)}><RefreshCw size={17} />{t("Повторить")}</button></CatalogStatus>}
      {state === "ready" && result.total === 0 && !category && <div className="spots-search-empty"><Search size={24} /><strong>{t(city ? "В этом городе пока нет заведений" : "Ничего не нашли")}</strong>{city && <p>{t(city)}</p>}</div>}
      {state === "ready" && visibleCategories.map((item) => <CategorySection
        key={item.slug} category={item.label} venues={venuesByCategory.get(item.slug) ?? []}
        expanded={Boolean(category)} selected={Boolean(category)} filters={item.filters} activeFilter={activeFilter}
        onFilter={setFilter} onOpenFilters={() => filterDialog.current?.showModal()} onExpand={() => onCategoryChange(item.slug)}
        savedPlaces={savedPlaces} onToggleSaved={onToggleSaved} onVenue={onVenue}
      />)}
      {state === "ready" && result.total_pages > 1 && <nav className="spots-catalog-pagination" aria-label={t("Страницы каталога")}>
        <button type="button" className="button secondary" disabled={page <= 1} onClick={() => setPagination({ scope: queryScope, page: Math.max(1, page - 1) })}><ChevronLeft size={17} />{t("Назад")}</button>
        <span>{t("Страница")} {result.page} / {result.total_pages}</span>
        <button type="button" className="button secondary" disabled={!result.has_next} onClick={() => setPagination({ scope: queryScope, page: page + 1 })}>{t("Далее")}<ChevronRight size={17} /></button>
      </nav>}
    </div>
  </div>;
}

function CatalogStatus({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return <div className="spots-catalog-status" role={alert ? "alert" : "status"}>{children}</div>;
}

function CategorySection({ category, venues, expanded, selected, filters, activeFilter, onFilter, onOpenFilters, onExpand, onVenue, savedPlaces, onToggleSaved }: {
  category: string; venues: PublicVenue[]; expanded: boolean; selected: boolean; filters: string[]; activeFilter: string; onFilter: (filter: string) => void; onOpenFilters: () => void; onExpand: () => void; onVenue: (venue: PublicVenue) => void;
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
  }, [venues.length, expanded]);
  const scroll = (direction: number) => {
    const element = list.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const Heading = expanded ? "h1" : "h2";
  return <section className="discover-section spots-category-section" aria-label={t(category)}>
    {!selected && <div className="spots-section-heading">
      <Heading>{t(category)}</Heading>
      <div className="spots-section-actions">{!expanded && venues.length > 0 && <button type="button" className="spots-show-category" onClick={onExpand} aria-label={`${t("Все")}: ${t(category)}`}>{t("Все")}</button>}</div>
    </div>}
    {selected && <CategoryFilterStrip options={filters.map((label) => ({ value: label, label, active: activeFilter === label }))} filtersActive={activeFilter !== "Все"} ariaLabel={`${t("Фильтры заведений")}: ${t(category)}`} onSelect={onFilter} onOpenFilters={onOpenFilters} />}
    {venues.length ? <div className={`spots-venue-carousel ${expanded ? "expanded" : ""}`}>
      <div ref={list} onScroll={updateScroll} className={expanded ? "venue-grid" : "spots-venue-shelf"}>
        {venues.map((venue) => <VenueCard key={venue.id} venue={venue} saved={savedPlaces?.includes(venue.id)} onToggleSaved={onToggleSaved} onClick={() => onVenue(venue)} />)}
      </div>
      {!expanded && (scrollState.previous || scrollState.next) && <>
        <button type="button" className="spots-carousel-button previous" disabled={!scrollState.previous} onClick={() => scroll(-1)} aria-label={`${t(category)}: ${t("Назад")}`}><ChevronLeft size={26} /></button>
        <button type="button" className="spots-carousel-button next" disabled={!scrollState.next} onClick={() => scroll(1)} aria-label={`${t(category)}: ${t("Далее")}`}><ChevronRight size={26} /></button>
      </>}
    </div> : <p className="spots-category-empty">{t("В этой категории пока нет мест")}</p>}
  </section>;
}

export function SavedPlacesScreen({ savedPlaces = [], onToggleSaved, onVenue }: SavedPlacesProps & { onVenue: (venue: PublicVenue) => void }) {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const idsKey = savedPlaces.join(",");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const ids = idsKey ? idsKey.split(",") : [];
    const batches: string[][] = [];
    for (let index = 0; index < ids.length; index += 50) batches.push(ids.slice(index, index + 50));
    Promise.allSettled(batches.map((batch) => listPublicVenues({ ids: batch, pageSize: 50 }, controller.signal)))
      .then((results) => {
        if (!active) return;
        const byID = new Map(results.flatMap((result) => result.status === "fulfilled" ? result.value.venues : []).map((venue) => [venue.id, venue]));
        setVenues(ids.flatMap((id) => byID.has(id) ? [byID.get(id)!] : []));
        setError(results.some((result) => result.status === "rejected"));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [idsKey, reload]);
  return <section><div className="page-header"><h1>Сохранённые места</h1></div>{loading ? <CatalogStatus>Загружаем заведения...</CatalogStatus> : <>{error && <CatalogStatus alert><strong>Не удалось загрузить часть заведений</strong><button type="button" className="button secondary" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Повторить</button></CatalogStatus>}{venues.length ? <div className="venue-grid">{venues.map((venue) => <VenueCard key={venue.id} venue={venue} saved onToggleSaved={onToggleSaved} onClick={() => onVenue(venue)} />)}</div> : !error && <div className="spots-search-empty"><Heart size={28} /><strong>Пока нет сохранённых мест</strong></div>}</>}</section>;
}

export function VenueCard({ venue, onClick, saved, onToggleSaved }: { venue: PublicVenue; onClick: () => void; saved?: boolean; onToggleSaved?: (id: string) => void }) {
  const { t } = useI18n();
  const [localFavorite, setLocalFavorite] = useState(false);
  const favorite = saved ?? localFavorite;
  const illustration = categoryIllustrations[venue.category_slug] ?? venue.category_slug;
  const imageStyle = venue.image_url
    ? { backgroundImage: `url(${JSON.stringify(venue.image_url)})`, backgroundPosition: "center", backgroundSize: "cover" } as CSSProperties
    : { "--venue-illustration": `url('/assets/categories/${illustration}.png')`, "--venue-illustration-background": "var(--spots-gradient-restaurants)" } as CSSProperties;
  const tag = venue.tags[0] || (venue.preorder_enabled ? "Предзаказ доступен" : "Открыто");
  const details = [venue.cuisine_type, venue.address, venue.city].filter(Boolean).join(" · ");
  return <article className="venue-card"><div className={`venue-card-image ${venue.image_url ? "remote-venue-image" : "illustrated-venue-image"}`} style={imageStyle}><button type="button" className="venue-image-link" aria-label={`Открыть ${venue.name}`} onClick={onClick} />{onToggleSaved && <button type="button" className="icon-button" aria-label={favorite ? "Убрать из избранного" : "В избранное"} aria-pressed={favorite} onClick={() => { if (saved === undefined) setLocalFavorite(!favorite); onToggleSaved(venue.id); }}><Heart size={19} fill={favorite ? "currentColor" : "none"} /></button>}</div><button type="button" className="venue-card-copy" onClick={onClick}><span><h3>{venue.name}</h3><b><Star size={14} fill="currentColor" />{venue.review_count ? venue.rating.toFixed(1) : "—"}</b></span><p>{t(details)}</p><small className="venue-card-tag">{t(tag)}</small></button></article>;
}
