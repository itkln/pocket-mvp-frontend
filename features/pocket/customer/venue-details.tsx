"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type TouchEvent } from "react";
import Image from "next/image";
import { ArrowLeft, CalendarDays, Check, Heart, Info, MapPin, Minus, Plus, RefreshCw, Search, ShoppingBag, Star, UserRound, UsersRound, Utensils, X } from "lucide-react";
import { APIError } from "../../../lib/api-client";
import { getPublicVenue, getPublicVenueMenu, getPublicVenueReviews, type PublicMenuCategory, type PublicMenuItem, type PublicReview, type PublicVenue } from "../../../lib/public-catalog-api";
import { useI18n } from "../i18n";
import { PublicMenuCards } from "./public-menu-cards";
import { BookingPicker } from "./booking-picker";
import { DesktopBookingFlow, type DesktopBookingFlowHandle, type DesktopBookingSummary } from "./desktop-booking-flow";
import type { AuthUser } from "../../../lib/auth-api";

const illustrations: Record<string, string> = {
  activities: "travel", "yoga-pilates": "yoga", "spa-massage": "spa", masterclasses: "workshops",
};

const mobileBookingQuery = "(max-width: 760px)";
const subscribeMobileBooking = (onChange: () => void) => {
  const query = window.matchMedia(mobileBookingQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const mobileBookingSnapshot = () => window.matchMedia(mobileBookingQuery).matches;

export function VenueDetailsScreen({ venueID, onBack, saved, onToggleSaved, user = null }: {
  venueID: string;
  onBack: () => void;
  saved: boolean;
  onToggleSaved?: (id: string) => void;
  user?: AuthUser | null;
}) {
  const { locale, t } = useI18n();
  const mobileBooking = useSyncExternalStore(subscribeMobileBooking, mobileBookingSnapshot, () => false);
  const [state, setState] = useState<{ venue?: PublicVenue; error?: "missing" | "failed" }>({});
  const [menuState, setMenuState] = useState<{ categories: PublicMenuCategory[]; loading: boolean; error: boolean }>({ categories: [], loading: true, error: false });
  const [reviewsState, setReviewsState] = useState<{ items: PublicReview[]; loading: boolean; error: boolean }>({ items: [], loading: true, error: false });
  const [reload, setReload] = useState(0);
  const [reviewsReload, setReviewsReload] = useState(0);
  const [activeCategory, setActiveCategory] = useState("");
  const [compactHeader, setCompactHeader] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoDrag, setInfoDrag] = useState(0);
  const [infoDragging, setInfoDragging] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preorderMenuOpen, setPreorderMenuOpen] = useState(false);
  const [preorderQuantities, setPreorderQuantities] = useState<Record<string, number>>({});
  const [bookingSummary, setBookingSummary] = useState<DesktopBookingSummary | null>(null);
  const [bookingFlowVersion, setBookingFlowVersion] = useState(0);
  const [detailItemID, setDetailItemID] = useState<string | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [menuQuery, setMenuQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const infoCloseRef = useRef<HTMLButtonElement>(null);
  const reviewsCloseRef = useRef<HTMLButtonElement>(null);
  const bookingTriggerRef = useRef<HTMLButtonElement>(null);
  const bookingFlowRef = useRef<DesktopBookingFlowHandle>(null);
  const bookingCloseRef = useRef<HTMLButtonElement>(null);
  const bookingOverlayRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const infoOverlayRef = useRef<HTMLDivElement>(null);
  const infoTouchStart = useRef<{ x: number; y: number } | null>(null);
  const infoDragRef = useRef(0);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const preorderMenuRef = useRef<HTMLDivElement>(null);
  const preorderMenuScrollRef = useRef<HTMLDivElement>(null);
  const pendingCategoryRef = useRef<string | null>(null);
  const pendingCategoryTimerRef = useRef<number | null>(null);
  const preorderMenuBackRef = useRef<HTMLButtonElement>(null);
  const detailDialogRef = useRef<HTMLElement>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const detailWasOpenRef = useRef(false);
  const backToBookingDetails = useCallback(() => {
    setPreorderMenuOpen(false);
    setDetailItemID(null);
    bookingFlowRef.current?.backToDetails();
  }, []);
  const finishBooking = useCallback(() => {
    setPreorderQuantities({});
    setBookingSummary(null);
    setBookingFlowVersion((version) => version + 1);
  }, []);

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
    if (!reviewsOpen) return;
    const controller = new AbortController();
    getPublicVenueReviews(venueID, controller.signal)
      .then((items) => setReviewsState({ items, loading: false, error: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReviewsState({ items: [], loading: false, error: true });
      });
    return () => controller.abort();
  }, [venueID, reviewsOpen, reviewsReload]);

  useEffect(() => {
    let controller: AbortController | undefined;
    const loadMenu = () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      getPublicVenueMenu(venueID, request.signal)
        .then((categories) => {
          if (!request.signal.aborted) setMenuState({ categories, loading: false, error: false });
        })
        .catch((error: unknown) => {
          if (request.signal.aborted || error instanceof DOMException && error.name === "AbortError") return;
          setMenuState({ categories: [], loading: false, error: true });
        });
    };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") loadMenu(); };
    loadMenu();
    window.addEventListener("focus", loadMenu);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", loadMenu);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [venueID, reload]);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    if (!preorderMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [preorderMenuOpen]);
  useEffect(() => {
    if (!preorderMenuOpen) return;
    if (detailItemID) detailCloseRef.current?.focus();
    else if (detailWasOpenRef.current) detailTriggerRef.current?.focus();
    else preorderMenuBackRef.current?.focus();
    detailWasOpenRef.current = Boolean(detailItemID);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (detailItemID) { setDetailItemID(null); detailTriggerRef.current?.focus(); }
        else backToBookingDetails();
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from((detailItemID ? detailDialogRef.current : preorderMenuRef.current)?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preorderMenuOpen, detailItemID, backToBookingDetails]);
  useEffect(() => {
    if (!infoOpen) return;
    if (window.innerWidth <= 760) infoCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setInfoOpen(false); };
    const onPointerDown = (event: PointerEvent) => {
      if (window.innerWidth > 760 && !infoRef.current?.contains(event.target as Node) && !infoOverlayRef.current?.contains(event.target as Node)) setInfoOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("pointerdown", onPointerDown); };
  }, [infoOpen]);
  useEffect(() => {
    if (!reviewsOpen) return;
    reviewsCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setReviewsOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reviewsOpen]);
  useEffect(() => {
    if (!bookingOpen) return;
    const trigger = bookingTriggerRef.current;
    bookingCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !bookingOverlayRef.current?.querySelector(".venue-calendar-popover")) setBookingOpen(false);
      if (event.key !== "Tab") return;
      const focusable = Array.from(bookingOverlayRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), textarea") ?? []);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); trigger?.focus(); };
  }, [bookingOpen]);

  useEffect(() => {
    const menuContainer = preorderMenuScrollRef.current;
    const updateScrollState = () => {
      setCompactHeader(window.scrollY > 115);
      if (preorderMenuOpen && pendingCategoryRef.current) {
        const pending = pendingCategoryRef.current;
        const targetTop = categoryRefs.current[pending]?.getBoundingClientRect().top;
        const contentTop = menuContainer?.getBoundingClientRect().top ?? 0;
        if (targetTop !== undefined && Math.abs(targetTop - contentTop - 20) <= 16) pendingCategoryRef.current = null;
        else { setActiveCategory(pending); return; }
      }
      if (!preorderMenuOpen && window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActiveCategory(menuState.categories.at(-1)?.id ?? "");
        return;
      }
      if (preorderMenuOpen && menuContainer && menuContainer.scrollTop > 0 && menuContainer.scrollTop + menuContainer.clientHeight >= menuContainer.scrollHeight - 2) {
        setActiveCategory(menuState.categories.at(-1)?.id ?? "");
        return;
      }
      const offset = preorderMenuOpen ? (menuContainer?.getBoundingClientRect().top ?? 0) + 36 : 164;
      let current = menuState.categories[0]?.id ?? "";
      menuState.categories.forEach(({ id }) => {
        if ((categoryRefs.current[id]?.getBoundingClientRect().top ?? Infinity) <= offset) current = id;
      });
      setActiveCategory(current);
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    if (preorderMenuOpen) menuContainer?.addEventListener("scroll", updateScrollState, { passive: true });
    return () => { window.removeEventListener("scroll", updateScrollState); menuContainer?.removeEventListener("scroll", updateScrollState); };
  }, [menuState.categories, preorderMenuOpen]);

  const venue = state.venue;
  const openCategory = (id: string) => {
    pendingCategoryRef.current = preorderMenuOpen ? id : null;
    if (pendingCategoryTimerRef.current !== null) window.clearTimeout(pendingCategoryTimerRef.current);
    pendingCategoryTimerRef.current = window.setTimeout(() => { pendingCategoryRef.current = null; }, 800);
    setActiveCategory(id);
    categoryRefs.current[id]?.scrollIntoView?.({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };
  const openReviews = () => { setReviewsState({ items: [], loading: true, error: false }); setReviewsOpen(true); };
  const onInfoTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (window.innerWidth > 760 || event.currentTarget.scrollTop > 0) return;
    const touch = event.touches[0];
    if (touch) infoTouchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onInfoTouchMove = (event: TouchEvent<HTMLElement>) => {
    const start = infoTouchStart.current;
    const touch = event.touches[0];
    if (!start || !touch || event.currentTarget.scrollTop > 0) return;
    const distance = touch.clientY - start.y;
    if (distance <= 0 || Math.abs(touch.clientX - start.x) > distance) return;
    infoDragRef.current = Math.min(distance, 320);
    setInfoDragging(true);
    setInfoDrag(infoDragRef.current);
  };
  const onInfoTouchEnd = () => {
    if (infoDragRef.current >= 80) setInfoOpen(false);
    infoTouchStart.current = null;
    infoDragRef.current = 0;
    setInfoDragging(false);
    setInfoDrag(0);
  };
  const photoStyle = venue?.image_url ? { backgroundImage: `url(${JSON.stringify(venue.image_url)})` } as CSSProperties : undefined;
  const illustration = venue ? illustrations[venue.category_slug] ?? venue.category_slug : "restaurants";
  const details = venue ? [venue.cuisine_type ? t(venue.cuisine_type) : "", venue.address, venue.city].filter(Boolean).join(" · ") : "";
  const normalizedQuery = menuQuery.trim().toLocaleLowerCase(locale);
  const searchResults = normalizedQuery ? menuState.categories.flatMap((category) => category.items.filter((item) =>
    [item.name, item.description ?? "", category.name].some((value) => value.toLocaleLowerCase(locale).includes(normalizedQuery)),
  )) : [];
  const formatPrice = (item: PublicMenuItem) => new Intl.NumberFormat(locale, { style: "currency", currency: item.currency }).format(item.price_minor / 100);
  const preorderItems = menuState.categories.flatMap((category) => category.items);
  const preorderCount = Object.values(preorderQuantities).reduce((total, quantity) => total + quantity, 0);
  const preorderTotal = preorderItems.reduce((total, item) => total + item.price_minor * (preorderQuantities[item.id] ?? 0), 0);
  const preorderCurrency = preorderItems.find((item) => preorderQuantities[item.id])?.currency ?? "EUR";
  const preorderTotalLabel = new Intl.NumberFormat(locale, { style: "currency", currency: preorderCurrency }).format(preorderTotal / 100);
  const preorderSelectedItems = preorderItems.filter((item) => preorderQuantities[item.id] > 0);
  const detailItem = preorderItems.find((item) => item.id === detailItemID);
  const changePreorderQuantity = (id: string, delta: number) => setPreorderQuantities((previous) => {
    const next = { ...previous };
    const count = Math.max(0, Math.min(30, (next[id] ?? 0) + delta));
    if (count) next[id] = count; else delete next[id];
    return next;
  });
  const closeItemDetails = () => { setDetailItemID(null); detailTriggerRef.current?.focus(); };
  const menuCards = (items: PublicMenuItem[]) => <PublicMenuCards items={items} quantities={preorderMenuOpen ? preorderQuantities : undefined} onQuantityChange={preorderMenuOpen ? changePreorderQuantity : undefined} onOpenDetails={preorderMenuOpen ? (item, trigger) => { detailTriggerRef.current = trigger; setDetailQuantity(1); setDetailItemID(item.id); } : undefined} />;

  return <section className={`spots-venue-detail spots-real-venue-detail ${searchOpen ? "venue-search-active" : ""}`}>
    <header className={`venue-mobile-toolbar ${compactHeader ? "compact" : ""}`}>
      <button type="button" aria-label={t("Назад к результатам")} onClick={onBack}><ArrowLeft size={24} /></button>
      <span className="venue-mobile-toolbar-title" aria-hidden={!compactHeader}>{venue?.name}</span>
      <div className="venue-mobile-toolbar-actions">
        {venue && venue.category_slug !== "restaurants" && <button type="button" aria-label={t("Открыть информацию о заведении")} aria-expanded={infoOpen} onClick={() => setInfoOpen(true)}><Info size={23} aria-hidden="true" /></button>}
        <button type="button" aria-label={t("Поиск по меню")} onClick={() => setSearchOpen(true)}><Search size={23} /></button>
        {venue && onToggleSaved && <button type="button" aria-label={t(saved ? "Убрать из избранного" : "В избранное")} aria-pressed={saved} onClick={() => onToggleSaved(venue.id)}><Heart size={23} fill={saved ? "currentColor" : "none"} /></button>}
      </div>
    </header>
    {searchOpen && <div className="venue-mobile-search" role="search" aria-label={t("Поиск по меню")}>
      <div className="venue-mobile-search-bar"><input ref={searchRef} type="search" value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} placeholder={t("Поиск по меню")} aria-label={t("Поиск по меню")} />
        {menuQuery && <button type="button" className="venue-search-clear" aria-label={t("Очистить поиск")} onClick={() => { setMenuQuery(""); searchRef.current?.focus(); }}><X size={18} /></button>}
        <button type="button" className="venue-search-cancel" onClick={() => { setSearchOpen(false); setMenuQuery(""); }}>{t("Отменить")}</button></div>
      <div className="venue-search-results" aria-live="polite">{!normalizedQuery ? <h2>{t("Что будем искать?")}</h2> : menuState.loading ? <p>{t("Загружаем меню...")}</p> : menuState.error ? <p>{t("Не удалось загрузить меню")}</p> : searchResults.length ? menuCards(searchResults) : <div className="venue-search-no-results"><Search size={28} /><h2>{t("Ничего не нашли")}</h2><p>{t("Попробуйте другое название блюда")}</p></div>}</div>
      {venue?.category_slug !== "restaurants" && <div className="venue-mobile-booking-status" role="status"><span><CalendarDays size={16} />{t("Бронирование пока недоступно")}</span></div>}
    </div>}
    <button type="button" className="back-link" aria-label={t("Назад")} onClick={onBack}><ArrowLeft size={24} strokeWidth={2.3} aria-hidden="true" /></button>
    {venue ? <article className="spots-restaurant venue-detail-page" aria-labelledby="venue-title">
      <div className="venue-primary-column">
        <div className="venue-overview-block">
          <div className={`venue-public-photo ${venue.image_url ? "has-image" : ""}`} style={photoStyle} role="img" aria-label={t("Фото заведения: {name}", { name: venue.name })}>
            {!venue.image_url && <Image src={`/assets/categories/${illustration}.png`} alt="" width={220} height={220} />}
          </div>
          <div className="venue-detail-summary">
            <div className="venue-detail-heading">
              <div className="venue-title-row"><h1 id="venue-title">{venue.name}</h1>{onToggleSaved && <button type="button" className={`icon-button ${saved ? "active" : ""}`} aria-label={t(saved ? "Убрать из избранного" : "В избранное")} aria-pressed={saved} onClick={() => onToggleSaved(venue.id)}><Heart size={22} fill={saved ? "currentColor" : "none"} /></button>}</div>
              <p>{details}</p>
              <div className="venue-facts" aria-label={t("Краткая информация")}>
                <button type="button" className="venue-public-rating" aria-label={t("Открыть отзывы")} onClick={openReviews}><Star size={16} fill="currentColor" /><span><b>{venue.review_count > 0 ? venue.rating.toFixed(1) : t("Отзывы")}</b>{venue.review_count > 0 && <small>{t("Оценок: {count}", { count: venue.review_count })}</small>}</span></button>
                {venue.preorder_enabled && <span><Check size={16} />{t("Предзаказ доступен")}</span>}
                {venue.tags.map((tag) => <span key={tag}>{t(tag)}</span>)}
                <div ref={infoRef} className="venue-desktop-info-wrap"><button type="button" className="venue-desktop-info-button" aria-label={t("Информация о заведении")} aria-expanded={infoOpen} onClick={() => setInfoOpen((value) => !value)}><Info size={17} /></button></div>
              </div>
            </div>
            {infoOpen && <div ref={infoOverlayRef} className="venue-info-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setInfoOpen(false); }}>
              <section className={`venue-info-sheet ${infoDragging ? "dragging" : ""}`} role="dialog" aria-modal="true" aria-labelledby="venue-info-title" style={infoDrag ? { transform: `translateY(${infoDrag}px)` } : undefined} onTouchStart={onInfoTouchStart} onTouchMove={onInfoTouchMove} onTouchEnd={onInfoTouchEnd} onTouchCancel={onInfoTouchEnd}>
                <div className="venue-info-handle" aria-hidden="true" /><button ref={infoCloseRef} type="button" className="venue-info-close" aria-label={t("Закрыть")} onClick={() => setInfoOpen(false)}><X size={22} /></button>
                <h2 id="venue-info-title">{t("Информация о заведении")}</h2><h3>{venue.name}</h3>
                <div className="venue-info-group"><strong>{t("Контакты")}</strong><p><MapPin size={18} />{venue.address}, {venue.city}, {venue.country_code}</p></div>
                <div className="venue-info-group"><strong>{t("О месте")}</strong><p>{venue.description || t("Описание заведения пока не добавлено")}</p>
                  <div className={`venue-about-photo ${venue.image_url ? "has-image" : ""}`} style={photoStyle} role="img" aria-label={t("Фото заведения: {name}", { name: venue.name })}>{!venue.image_url && <Image src={`/assets/categories/${illustration}.png`} alt="" width={170} height={170} />}</div>
                  {venue.filters.length > 0 && <div className="venue-feature-list">{venue.filters.map((filter) => <span key={filter}><Check size={15} />{t(filter)}</span>)}</div>}
                </div>
              </section>
            </div>}
          </div>
        </div>

        <div ref={preorderMenuRef} className={`venue-detail-content ${preorderMenuOpen ? "venue-preorder-menu-mode" : ""}`} role={preorderMenuOpen ? "dialog" : undefined} aria-modal={preorderMenuOpen || undefined} aria-label={preorderMenuOpen ? t("Меню для предзаказа") : undefined}>
          {preorderMenuOpen && <button ref={preorderMenuBackRef} type="button" className="venue-preorder-menu-close" aria-label={t("Назад к бронированию")} onClick={backToBookingDetails}><ArrowLeft size={23} /></button>}
          {menuState.categories.length > 0 && <div className="venue-public-category-sticky-shell"><nav className="venue-section-nav venue-public-category-nav" aria-label={t("Категории меню")}>{menuState.categories.map((category) => <button type="button" key={category.id} className={(activeCategory || menuState.categories[0].id) === category.id ? "active" : ""} aria-current={(activeCategory || menuState.categories[0].id) === category.id ? "location" : undefined} onClick={() => openCategory(category.id)}>{category.name}</button>)}</nav></div>}
          <div ref={preorderMenuScrollRef} className="venue-public-menu-content">{menuState.loading ? <div className="venue-public-empty" role="status">{t("Загружаем меню...")}</div> : menuState.error ? <div className="venue-public-empty" role="alert">{t("Не удалось загрузить меню")}</div> : menuState.categories.length ? menuState.categories.map((category) => <section ref={(node) => { categoryRefs.current[category.id] = node; }} className="venue-public-menu-category" key={category.id} id={`venue-menu-${category.id}`} aria-label={category.name}><h2>{category.name}</h2>{menuCards(category.items)}</section>) : <div className="venue-public-empty"><Utensils size={24} /><p>{t("Меню этого заведения пока недоступно")}</p></div>}</div>
          {preorderMenuOpen && <aside className="venue-preorder-cart" aria-label={t("Предзаказ")}>
            <header><h2>{t("Предзаказ")}</h2>{preorderCount > 0 && <button type="button" onClick={() => setPreorderQuantities({})}>{t("Очистить")}</button>}</header>
            <div className="venue-preorder-cart-body">
            {bookingSummary && <section className="venue-preorder-reservation-summary" aria-label={t("Бронирование")}>
              <h3>{t("Бронирование")}</h3>
              <div><CalendarDays size={17} aria-hidden="true" /><span>{bookingSummary.dateLabel} · {bookingSummary.time}</span></div>
              <div><UsersRound size={17} aria-hidden="true" /><span>{t("Гостей: {count}", { count: bookingSummary.guests })}</span></div>
              <div><UserRound size={17} aria-hidden="true" /><span>{bookingSummary.name}<small>{bookingSummary.phone}{bookingSummary.email && <> · {bookingSummary.email}</>}</small></span></div>
              {bookingSummary.comment && <p>{bookingSummary.comment}</p>}
            </section>}
            {preorderSelectedItems.length ? <div className="venue-preorder-cart-items">{preorderSelectedItems.map((item) => <article key={item.id}>
              <div className="venue-preorder-cart-image" style={item.image_url ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` } : undefined}>{!item.image_url && <Utensils size={20} aria-hidden="true" />}</div>
              <div className="venue-preorder-cart-copy"><strong>{item.name}</strong><span>{new Intl.NumberFormat(locale, { style: "currency", currency: item.currency }).format(item.price_minor * preorderQuantities[item.id] / 100)}</span></div>
              <div className="venue-preorder-cart-quantity"><button type="button" aria-label={`${t("Убрать")} ${item.name}`} onClick={() => changePreorderQuantity(item.id, -1)}><Minus size={16} /></button><b>{preorderQuantities[item.id]}</b><button type="button" aria-label={`${t("Добавить")} ${item.name}`} disabled={preorderQuantities[item.id] >= 30} onClick={() => changePreorderQuantity(item.id, 1)}><Plus size={16} /></button></div>
            </article>)}</div> : <div className="venue-preorder-cart-empty"><ShoppingBag size={46} aria-hidden="true" /><h3>{t("В предзаказе пока пусто")}</h3><p>{t("Добавьте блюда из меню")}</p></div>}
            </div>
            <div className="venue-preorder-cart-footer">{preorderCount > 0 ? <button type="button" disabled={preorderSelectedItems.length !== Object.keys(preorderQuantities).length} onClick={() => { setPreorderMenuOpen(false); bookingFlowRef.current?.checkout(); }}><span>{t("Продолжить к оплате")}</span><strong>{preorderTotalLabel}</strong></button> : <button type="button" className="venue-preorder-book-without" onClick={() => { setPreorderMenuOpen(false); bookingFlowRef.current?.bookWithoutPreorder(); }}><span>{t("Забронировать без предзаказа")}</span></button>}</div>
          </aside>}
          {preorderMenuOpen && detailItem && <div className="venue-preorder-product-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeItemDetails(); }}><section ref={detailDialogRef} className="venue-preorder-product-dialog" role="dialog" aria-modal="true" aria-label={detailItem.name}>
            <button ref={detailCloseRef} type="button" className="venue-preorder-product-close" aria-label={t("Закрыть")} onClick={closeItemDetails}><X size={23} /></button>
            <div className="venue-preorder-product-main"><div className="venue-preorder-product-image" style={detailItem.image_url ? { backgroundImage: `url(${JSON.stringify(detailItem.image_url)})` } : undefined}>{!detailItem.image_url && <Utensils size={50} aria-hidden="true" />}</div><div className="venue-preorder-product-info"><h2>{detailItem.name}</h2><strong>{formatPrice(detailItem)}</strong><div className="venue-preorder-product-action"><div className="venue-preorder-cart-quantity"><button type="button" aria-label={t("Уменьшить количество")} disabled={detailQuantity <= 1} onClick={() => setDetailQuantity((value) => value - 1)}><Minus size={18} /></button><b>{detailQuantity}</b><button type="button" aria-label={t("Увеличить количество")} disabled={detailQuantity >= 30} onClick={() => setDetailQuantity((value) => value + 1)}><Plus size={18} /></button></div><button type="button" onClick={() => { changePreorderQuantity(detailItem.id, detailQuantity); closeItemDetails(); }}>{t("Добавить")}</button></div></div></div>
            {detailItem.description && <p>{detailItem.description}</p>}
          </section></div>}
        </div>
      </div>
      {venue.category_slug === "restaurants" ? <div ref={bookingOverlayRef} className={`venue-public-booking-shell ${bookingOpen ? "open" : ""}`} role={bookingOpen ? "dialog" : undefined} aria-modal={bookingOpen || undefined} aria-labelledby={bookingOpen ? "venue-booking-title" : undefined}>
        <button ref={bookingCloseRef} type="button" className="venue-mobile-booking-close" aria-label={t("Закрыть")} onClick={() => setBookingOpen(false)}><X size={24} /></button>
        {mobileBooking ? <BookingPicker key={venue.id} venueID={venue.id} menu={menuState.categories} preorderEnabled={venue.preorder_enabled} /> : <DesktopBookingFlow ref={bookingFlowRef} key={`${venue.id}-${bookingFlowVersion}`} venueID={venue.id} venueName={venue.name} menu={menuState.categories} preorderEnabled={venue.preorder_enabled} user={user} quantities={preorderQuantities} onQuantityChange={changePreorderQuantity} menuModeOpen={preorderMenuOpen} onMenuModeChange={setPreorderMenuOpen} onPreorderStart={setBookingSummary} onMenuUpdated={(categories) => setMenuState({ categories, loading: false, error: false })} onConfirmationClose={finishBooking} />}
      </div> : <aside className="venue-booking-card venue-public-booking" aria-labelledby="venue-booking-title">
        <CalendarDays size={25} aria-hidden="true" />
        <h2 id="venue-booking-title">{t("Бронирование")}</h2>
        <p>{t("Онлайн-бронирование этого заведения пока недоступно")}</p>
        <button type="button" className="button" disabled>{t("Забронировать")}</button>
      </aside>}
      {venue.category_slug !== "restaurants" && <div className="venue-mobile-booking-status" role="status"><span><CalendarDays size={16} />{t("Бронирование пока недоступно")}</span></div>}
      {reviewsOpen && <div className="venue-reviews-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewsOpen(false); }}>
        <section className="venue-reviews-dialog" role="dialog" aria-modal="true" aria-labelledby="venue-reviews-dialog-title">
          <header><h2 id="venue-reviews-dialog-title">{t("Рейтинг и отзывы")}</h2><button ref={reviewsCloseRef} type="button" aria-label={t("Закрыть")} onClick={() => setReviewsOpen(false)}><X size={21} /></button></header>
          <div className="venue-reviews-score"><strong>{venue.review_count > 0 ? venue.rating.toFixed(1) : "—"}</strong><span>{t("Оценок: {count}", { count: venue.review_count })}</span></div>
          <div className="venue-reviews-list"><h3>{t("Отзывы")}</h3>
            {reviewsState.loading ? <p role="status">{t("Загружаем отзывы...")}</p> : reviewsState.error ? <div role="alert"><p>{t("Не удалось загрузить отзывы")}</p><button type="button" onClick={() => { setReviewsState({ items: [], loading: true, error: false }); setReviewsReload((value) => value + 1); }}>{t("Повторить")}</button></div> : reviewsState.items.length ? reviewsState.items.map((review) => <article key={review.id}><div className="venue-review-meta"><strong>{t("Гость")}</strong><span aria-label={t("Оценка: {rating} из 5", { rating: review.rating })}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < review.rating ? "currentColor" : "none"} />)}</span></div><small>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(review.created_at))}</small>{review.body && <p>{review.body}</p>}{review.owner_reply && <div className="venue-review-reply"><strong>{t("Ответ заведения")}</strong><p>{review.owner_reply}</p></div>}</article>) : <p>{t("Отзывов пока нет")}</p>}
          </div>
        </section>
      </div>}
    </article> : state.error ? <div className="spots-catalog-status" role="alert"><strong>{t(state.error === "missing" ? "Заведение больше недоступно" : "Не удалось загрузить заведение")}</strong>{state.error === "failed" && <button type="button" className="button secondary" onClick={() => { setState({}); setReload((value) => value + 1); }}><RefreshCw size={17} />{t("Повторить")}</button>}</div> : <div className="spots-catalog-status" role="status">{t("Загружаем заведение...")}</div>}
    {venue?.category_slug === "restaurants" && <div className={`venue-mobile-booking-cta ${bookingOpen ? "booking-open" : ""}`}>
      <button ref={bookingTriggerRef} type="button" className="venue-mobile-booking-primary" onClick={() => { setSearchOpen(false); setBookingOpen(true); }}>{t("Забронировать онлайн")}</button>
      <button type="button" className="venue-mobile-booking-info" aria-label={t("Открыть информацию о заведении")} aria-expanded={infoOpen} onClick={() => { setSearchOpen(false); setInfoOpen(true); }}><Info size={24} aria-hidden="true" /></button>
    </div>}
  </section>;
}
