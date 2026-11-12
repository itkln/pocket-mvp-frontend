"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  LayoutGrid,
  List,
  Heart,
  Info,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Utensils,
  X,
} from "lucide-react";
import {
  getPreorderCategories,
  type PublicMenuCategory,
  type PublicMenuItem,
  type PublicVenue,
} from "../../../lib/public-catalog-api";
import { useI18n } from "../i18n";
import { useMenuView } from "./menu-view";
import { usePublicVenue, useVenueReviews } from "./venue/use-public-venue";
import { VenueInfoSheet } from "./venue/venue-info-sheet";
import { VenueReviewsDialog } from "./venue/venue-reviews-dialog";
import { PreorderCart } from "./venue/preorder-cart";
import { VenueMobileSearch } from "./venue/venue-mobile-search";
import { PublicMenuCards } from "./public-menu-cards";
import { PublicMenuItemDialog } from "./public-menu-item-dialog";
import { BookingPicker } from "./booking-picker";
import {
  DesktopBookingFlow,
  type DesktopBookingFlowHandle,
  type DesktopBookingSummary,
} from "./desktop-booking-flow";
import type { AuthUser } from "../../../lib/auth-api";
import type { TableContext } from "../../../lib/table-orders-api";

const illustrations: Record<string, string> = {
  activities: "travel",
  "yoga-pilates": "yoga",
  "spa-massage": "spa",
  masterclasses: "workshops",
};

const mobileBookingQuery = "(max-width: 760px)";
const subscribeMobileBooking = (onChange: () => void) => {
  const query = window.matchMedia(mobileBookingQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const mobileBookingSnapshot = () => window.matchMedia(mobileBookingQuery).matches;

export function VenueDetailsScreen({
  venueID,
  onBack,
  saved,
  onToggleSaved,
  user = null,
  onMenuLoaded,
  onVenueLoaded,
  desktopMenuQuery = "",
  tableOrder,
  menuRevision = 0,
  standalone = false,
  reservationPage = false,
  onReserve,
  menuPage = false,
  initialCategoryID,
  initialSearchOpen = false,
}: {
  standalone?: boolean;
  reservationPage?: boolean;
  menuPage?: boolean;
  initialCategoryID?: string;
  initialSearchOpen?: boolean;
  onReserve?: () => void;
  venueID: string;
  onBack: () => void;
  saved: boolean;
  onToggleSaved?: (id: string) => void;
  user?: AuthUser | null;
  onMenuLoaded?: (menu: PublicMenuCategory[]) => void;
  onVenueLoaded?: (venue: PublicVenue) => void;
  desktopMenuQuery?: string;
  menuRevision?: number;
  tableOrder?: {
    table: TableContext;
    quantities: Record<string, number>;
    onQuantityChange?: (id: string, delta: number) => void;
    onOpenCart: () => void;
    count: number;
    totalLabel: string;
    historyButton: ReactNode;
    panel: ReactNode;
  };
}) {
  const { locale, t } = useI18n();
  const mobileBooking = useSyncExternalStore(
    subscribeMobileBooking,
    mobileBookingSnapshot,
    () => false,
  );
  const {
    venueState: state,
    menuState,
    retry,
    replaceMenu,
  } = usePublicVenue(venueID, menuRevision);
  const [activeCategory, setActiveCategory] = useState("");
  const [compactHeader, setCompactHeader] = useState(false);
  const [menuPinned, setMenuPinned] = useState(false);
  const categoryNavRef = useRef<HTMLElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const closeInfo = useCallback(() => setInfoOpen(false), []);
  const [menuView, setMenuView] = useMenuView();
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const closeReviews = useCallback(() => setReviewsOpen(false), []);
  const { reviewsState, resetReviews, retryReviews } = useVenueReviews(venueID, reviewsOpen);
  const [searchOpen, setSearchOpen] = useState(initialSearchOpen);
  const [bookingOpen, setBookingOpen] = useState(reservationPage);
  const closeBooking = useCallback(() => {
    if (reservationPage) onBack();
    else setBookingOpen(false);
  }, [reservationPage, onBack]);
  const [preorderMenuOpen, setPreorderMenuOpen] = useState(false);
  const preorderCategories = useMemo(
    () => getPreorderCategories(menuState.categories),
    [menuState.categories],
  );
  const visibleCategories = preorderMenuOpen ? preorderCategories : menuState.categories;
  const [preorderQuantities, setPreorderQuantities] = useState<Record<string, number>>({});
  const [bookingSummary, setBookingSummary] = useState<DesktopBookingSummary | null>(null);
  const [bookingFlowVersion, setBookingFlowVersion] = useState(0);
  const [detailItemID, setDetailItemID] = useState<string | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const bookingTriggerRef = useRef<HTMLButtonElement>(null);
  const bookingFlowRef = useRef<DesktopBookingFlowHandle>(null);
  const bookingCloseRef = useRef<HTMLButtonElement>(null);
  const bookingOverlayRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const preorderMenuRef = useRef<HTMLDivElement>(null);
  const preorderMenuScrollRef = useRef<HTMLDivElement>(null);
  const pendingCategoryRef = useRef<string | null>(null);
  const pendingCategoryTimerRef = useRef<number | null>(null);
  const preorderMenuBackRef = useRef<HTMLButtonElement>(null);
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
    if (reservationPage) onBack();
  }, [reservationPage, onBack]);
  useEffect(() => {
    onMenuLoaded?.(menuState.categories);
  }, [menuState.categories, onMenuLoaded]);
  useEffect(() => {
    if (state.venue) onVenueLoaded?.(state.venue);
  }, [state.venue, onVenueLoaded]);

  useEffect(() => {
    if (!preorderMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [preorderMenuOpen]);
  useEffect(() => {
    if (!preorderMenuOpen) return;
    if (detailItemID) {
      detailWasOpenRef.current = true;
      return;
    }
    if (detailWasOpenRef.current) detailTriggerRef.current?.focus();
    else preorderMenuBackRef.current?.focus();
    detailWasOpenRef.current = false;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") backToBookingDetails();
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        preorderMenuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preorderMenuOpen, detailItemID, backToBookingDetails]);
  useEffect(() => {
    if (!bookingOpen || !mobileBooking) return;
    const trigger = bookingTriggerRef.current;
    (
      bookingOverlayRef.current?.querySelector<HTMLButtonElement>(".mobile-booking-inline-close") ??
      bookingCloseRef.current
    )?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (bookingOverlayRef.current?.querySelector(".venue-preorder-product-dialog[open]")) return;
      if (
        event.key === "Escape" &&
        !bookingOverlayRef.current?.querySelector(".venue-calendar-popover")
      )
        closeBooking();
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        bookingOverlayRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea",
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [bookingOpen, mobileBooking, closeBooking]);

  useEffect(() => {
    const menuContainer = preorderMenuScrollRef.current;
    const updateScrollState = () => {
      setCompactHeader(window.scrollY > 115);
      const categoryNav = categoryNavRef.current;
      const stickyTop = categoryNav ? Number.parseFloat(getComputedStyle(categoryNav).top) : NaN;
      setMenuPinned(
        !preorderMenuOpen &&
          window.scrollY > 0 &&
          !!categoryNav &&
          Number.isFinite(stickyTop) &&
          categoryNav.getBoundingClientRect().top <= stickyTop + 1,
      );
      if (preorderMenuOpen && pendingCategoryRef.current) {
        const pending = pendingCategoryRef.current;
        const targetTop = categoryRefs.current[pending]?.getBoundingClientRect().top;
        const contentTop = menuContainer?.getBoundingClientRect().top ?? 0;
        if (targetTop !== undefined && Math.abs(targetTop - contentTop - 20) <= 16)
          pendingCategoryRef.current = null;
        else {
          setActiveCategory(pending);
          return;
        }
      }
      if (
        !preorderMenuOpen &&
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      ) {
        setActiveCategory(visibleCategories.at(-1)?.id ?? "");
        return;
      }
      if (
        preorderMenuOpen &&
        menuContainer &&
        menuContainer.scrollTop > 0 &&
        menuContainer.scrollTop + menuContainer.clientHeight >= menuContainer.scrollHeight - 2
      ) {
        setActiveCategory(visibleCategories.at(-1)?.id ?? "");
        return;
      }
      const offset = preorderMenuOpen
        ? (menuContainer?.getBoundingClientRect().top ?? 0) + 36
        : 164;
      let current = visibleCategories[0]?.id ?? "";
      visibleCategories.forEach(({ id }) => {
        if ((categoryRefs.current[id]?.getBoundingClientRect().top ?? Infinity) <= offset)
          current = id;
      });
      setActiveCategory(current);
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    if (preorderMenuOpen)
      menuContainer?.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      window.removeEventListener("resize", updateScrollState);
      window.removeEventListener("scroll", updateScrollState);
      menuContainer?.removeEventListener("scroll", updateScrollState);
    };
  }, [visibleCategories, preorderMenuOpen]);

  useEffect(() => {
    if (!initialCategoryID || menuState.loading) return;
    const frame = requestAnimationFrame(() => {
      categoryRefs.current[initialCategoryID]?.scrollIntoView?.({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialCategoryID, menuState.loading]);

  const venue = state.venue;
  const openCategory = (id: string) => {
    pendingCategoryRef.current = preorderMenuOpen ? id : null;
    if (pendingCategoryTimerRef.current !== null)
      window.clearTimeout(pendingCategoryTimerRef.current);
    pendingCategoryTimerRef.current = window.setTimeout(() => {
      pendingCategoryRef.current = null;
    }, 800);
    setActiveCategory(id);
    categoryRefs.current[id]?.scrollIntoView?.({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };
  const openReviews = () => {
    resetReviews();
    setReviewsOpen(true);
  };
  const photoStyle = venue?.image_url
    ? ({ backgroundImage: `url(${JSON.stringify(venue.image_url)})` } as CSSProperties)
    : undefined;
  const illustration = venue
    ? (illustrations[venue.category_slug] ?? venue.category_slug)
    : "restaurants";
  const details = venue
    ? [venue.cuisine_type ? t(venue.cuisine_type) : "", venue.address, venue.city]
        .filter(Boolean)
        .join(" · ")
    : "";
  // Online booking: restaurants only, unless the venue switched it off in Vendor.
  const bookable = venue?.category_slug === "restaurants" && venue.booking_enabled !== false;
  const desktopSearchActive = !mobileBooking && Boolean(desktopMenuQuery.trim());
  const normalizedQuery = (mobileBooking ? menuQuery : desktopMenuQuery)
    .trim()
    .toLocaleLowerCase(locale);
  const searchResults = normalizedQuery
    ? visibleCategories.flatMap((category) =>
        category.items.filter((item) =>
          [item.name, item.description ?? "", category.name].some((value) =>
            value.toLocaleLowerCase(locale).includes(normalizedQuery),
          ),
        ),
      )
    : [];
  const allMenuItems = menuState.categories.flatMap((category) => category.items);
  const preorderItems = preorderCategories.flatMap((category) => category.items);
  const preorderCount = Object.values(preorderQuantities).reduce(
    (total, quantity) => total + quantity,
    0,
  );
  const preorderTotal = preorderItems.reduce(
    (total, item) => total + item.price_minor * (preorderQuantities[item.id] ?? 0),
    0,
  );
  const preorderCurrency =
    preorderItems.find((item) => preorderQuantities[item.id])?.currency ?? "EUR";
  const preorderTotalLabel = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: preorderCurrency,
  }).format(preorderTotal / 100);
  const preorderSelectedItems = preorderItems.filter((item) => preorderQuantities[item.id] > 0);
  const unavailablePreorderItems = Object.entries(preorderQuantities).filter(
    ([id, quantity]) => quantity > 0 && !preorderItems.some((item) => item.id === id),
  );
  const detailItem = allMenuItems.find((item) => item.id === detailItemID);
  const changePreorderQuantity = (id: string, delta: number) =>
    setPreorderQuantities((previous) => {
      const next = { ...previous };
      const count = Math.max(0, Math.min(30, (next[id] ?? 0) + delta));
      if (count) next[id] = count;
      else delete next[id];
      return next;
    });
  const closeItemDetails = () => {
    setDetailItemID(null);
    detailTriggerRef.current?.focus();
  };
  const menuCards = (items: PublicMenuItem[]) => (
    <PublicMenuCards
      view={menuView}
      items={items}
      quantities={tableOrder?.quantities ?? (preorderMenuOpen ? preorderQuantities : undefined)}
      onQuantityChange={
        tableOrder
          ? tableOrder.onQuantityChange
          : preorderMenuOpen
            ? changePreorderQuantity
            : undefined
      }
      onOpenDetails={(item, trigger) => {
        detailTriggerRef.current = trigger;
        setDetailItemID(item.id);
      }}
    />
  );

  return (
    <section
      className={`dish-venue-detail dish-real-venue-detail ${standalone ? "venue-standalone" : ""} ${reservationPage ? "venue-reservation-page" : ""} ${searchOpen ? "venue-search-active" : ""} ${tableOrder ? "venue-table-mode" : ""} ${venue?.image_url ? "venue-cover-mode" : ""}`}
    >
      <header className={`venue-mobile-toolbar ${compactHeader ? "compact" : ""}`}>
        <div className="venue-mobile-toolbar-leading">
          {tableOrder && (
            <button type="button" aria-label={t("Назад к столу")} onClick={onBack}>
              <ArrowLeft size={24} />
            </button>
          )}
          {!tableOrder && !standalone && (
            <button
              type="button"
              aria-label={t(menuPage ? "Назад" : "Назад к результатам")}
              onClick={onBack}
            >
              <ArrowLeft size={24} />
            </button>
          )}
        </div>
        <span className="venue-mobile-toolbar-title" aria-hidden={!compactHeader}>
          {venue?.name}
        </span>
        <div className="venue-mobile-toolbar-actions">
          {!tableOrder && venue && venue.category_slug !== "restaurants" && (
            <button
              type="button"
              aria-label={t("Открыть информацию о заведении")}
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen(true)}
            >
              <Info size={23} aria-hidden="true" />
            </button>
          )}
          {
            <button
              type="button"
              aria-label={t("Поиск по меню")}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={23} />
            </button>
          }
          {venue && onToggleSaved && (
            <button
              type="button"
              aria-label={t(saved ? "Убрать из избранного" : "В избранное")}
              aria-pressed={saved}
              onClick={() => onToggleSaved(venue.id)}
            >
              <Heart size={23} fill={saved ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </header>
      {searchOpen && (
        <VenueMobileSearch
          query={menuQuery}
          onQueryChange={setMenuQuery}
          onCancel={() => {
            setSearchOpen(false);
            setMenuQuery("");
          }}
          searching={Boolean(normalizedQuery)}
          menu={menuState}
          results={searchResults.length ? menuCards(searchResults) : null}
          bookingUnavailable={!tableOrder && !bookable}
        />
      )}
      {tableOrder?.historyButton}
      {tableOrder && (
        <button
          type="button"
          className="back-link"
          aria-label={t("Назад к столу")}
          onClick={onBack}
        >
          <ArrowLeft size={24} />
        </button>
      )}
      {!tableOrder && !standalone && (
        <button type="button" className="back-link" aria-label={t("Назад")} onClick={onBack}>
          <ArrowLeft size={24} strokeWidth={2.3} aria-hidden="true" />
        </button>
      )}
      {venue ? (
        <article className="dish-restaurant venue-detail-page" aria-labelledby="venue-title">
          <div className="venue-primary-column">
            <div
              className="venue-overview-block"
              style={
                venue.image_url
                  ? ({
                      "--venue-cover-image": `url(${JSON.stringify(venue.image_url)})`,
                    } as CSSProperties)
                  : undefined
              }
            >
              <div
                className={`venue-public-photo ${venue.image_url ? "has-image" : ""}`}
                style={photoStyle}
                role="img"
                aria-label={t("Фото заведения: {name}", { name: venue.name })}
              >
                {!venue.image_url && (
                  <Image
                    src={`/assets/categories/${illustration}.png`}
                    alt=""
                    width={220}
                    height={220}
                  />
                )}
              </div>
              <div className="venue-detail-summary">
                <div className="venue-detail-heading">
                  <div className="venue-title-row">
                    <h1 id="venue-title">{venue.name}</h1>
                    {onToggleSaved && (
                      <button
                        type="button"
                        className={`icon-button ${saved ? "active" : ""}`}
                        aria-label={t(saved ? "Убрать из избранного" : "В избранное")}
                        aria-pressed={saved}
                        onClick={() => onToggleSaved(venue.id)}
                      >
                        <Heart size={22} fill={saved ? "currentColor" : "none"} />
                      </button>
                    )}
                  </div>
                  <p>{details}</p>
                  <div className="venue-facts" aria-label={t("Краткая информация")}>
                    <button
                      type="button"
                      className="venue-public-rating"
                      aria-label={t("Открыть отзывы")}
                      onClick={openReviews}
                    >
                      <Star size={16} fill="currentColor" aria-hidden="true" />
                      <b>{venue.review_count > 0 ? venue.rating.toFixed(1) : "—"}</b>
                    </button>
                    {!tableOrder && venue.preorder_enabled && (
                      <span>
                        <Check size={16} />
                        {t("Предзаказ доступен")}
                      </span>
                    )}
                    {venue.tags.map((tag) => (
                      <span key={tag}>{t(tag)}</span>
                    ))}
                    <div ref={infoRef} className="venue-desktop-info-wrap">
                      <button
                        type="button"
                        className="venue-desktop-info-button"
                        aria-label={t("Информация о заведении")}
                        aria-haspopup="dialog"
                        aria-expanded={infoOpen}
                        onClick={() => setInfoOpen((value) => !value)}
                      >
                        <Info size={20} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                {infoOpen && (
                  <VenueInfoSheet
                    venue={venue}
                    photoStyle={photoStyle}
                    illustration={illustration}
                    anchorRef={infoRef}
                    onClose={closeInfo}
                  />
                )}
              </div>
            </div>

            <div
              ref={preorderMenuRef}
              className={`venue-detail-content ${preorderMenuOpen ? "venue-preorder-menu-mode" : ""}`}
              role={preorderMenuOpen ? "dialog" : undefined}
              aria-modal={preorderMenuOpen || undefined}
              aria-label={preorderMenuOpen ? t("Меню для предзаказа") : undefined}
            >
              {preorderMenuOpen && (
                <button
                  ref={preorderMenuBackRef}
                  type="button"
                  className="venue-preorder-menu-close"
                  aria-label={t("Назад к бронированию")}
                  onClick={backToBookingDetails}
                >
                  <ArrowLeft size={23} />
                </button>
              )}
              {
                <>
                  {!desktopSearchActive && visibleCategories.length > 0 && (
                    <div className="venue-public-category-sticky-shell">
                      <div className="venue-category-controls">
                        <nav
                          ref={categoryNavRef}
                          className={`venue-section-nav venue-public-category-nav${menuPinned ? " is-pinned" : ""}`}
                          aria-label={t("Категории меню")}
                        >
                          {visibleCategories.map((category) => (
                            <button
                              type="button"
                              key={category.id}
                              className={
                                (activeCategory || visibleCategories[0].id) === category.id
                                  ? "active"
                                  : ""
                              }
                              aria-current={
                                (activeCategory || visibleCategories[0].id) === category.id
                                  ? "location"
                                  : undefined
                              }
                              onClick={() => openCategory(category.id)}
                            >
                              {category.name}
                            </button>
                          ))}
                        </nav>
                        {!mobileBooking && (
                          <button
                            type="button"
                            className="venue-desktop-menu-view-toggle"
                            aria-label={t(
                              menuView === "grid" ? "Показать списком" : "Показать сеткой",
                            )}
                            title={t(menuView === "grid" ? "Показать списком" : "Показать сеткой")}
                            onClick={() => setMenuView(menuView === "grid" ? "list" : "grid")}
                          >
                            {menuView === "grid" ? (
                              <List size={22} aria-hidden="true" />
                            ) : (
                              <LayoutGrid size={22} aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div ref={preorderMenuScrollRef} className="venue-public-menu-content">
                    {menuState.loading ? (
                      <div className="venue-public-empty" role="status">
                        {t("Загружаем меню...")}
                      </div>
                    ) : menuState.error ? (
                      <div className="venue-public-empty" role="alert">
                        {t("Не удалось загрузить меню")}
                      </div>
                    ) : desktopSearchActive ? (
                      <section
                        className="venue-public-menu-category"
                        aria-label={t("Результаты поиска")}
                        aria-live="polite"
                      >
                        <h2>{t("Результаты поиска")}</h2>
                        {searchResults.length ? (
                          menuCards(searchResults)
                        ) : (
                          <div className="venue-public-empty">
                            <Search size={28} />
                            <h3>{t("Ничего не нашли")}</h3>
                            <p>{t("Попробуйте другое название блюда")}</p>
                          </div>
                        )}
                      </section>
                    ) : visibleCategories.length ? (
                      visibleCategories.map((category) => (
                        <section
                          ref={(node) => {
                            categoryRefs.current[category.id] = node;
                          }}
                          className="venue-public-menu-category"
                          key={category.id}
                          id={`venue-menu-${category.id}`}
                          aria-label={category.name}
                        >
                          <h2>{category.name}</h2>
                          {menuCards(category.items)}
                        </section>
                      ))
                    ) : (
                      <div className="venue-public-empty">
                        <Utensils size={24} />
                        <p>{t("Меню этого заведения пока недоступно")}</p>
                      </div>
                    )}
                  </div>
                </>
              }
              {preorderMenuOpen && (
                <PreorderCart
                  bookingSummary={bookingSummary}
                  quantities={preorderQuantities}
                  selectedItems={preorderSelectedItems}
                  unavailableItems={unavailablePreorderItems}
                  allMenuItems={allMenuItems}
                  count={preorderCount}
                  totalLabel={preorderTotalLabel}
                  onQuantityChange={changePreorderQuantity}
                  onClear={() => setPreorderQuantities({})}
                  onCheckout={() => {
                    setPreorderMenuOpen(false);
                    bookingFlowRef.current?.checkout();
                  }}
                  onBookWithoutPreorder={() => {
                    setPreorderMenuOpen(false);
                    bookingFlowRef.current?.bookWithoutPreorder();
                  }}
                />
              )}
            </div>
          </div>
          {tableOrder ? (
            tableOrder.panel
          ) : bookable ? (
            standalone && !reservationPage && mobileBooking ? null : (
              <div
                ref={bookingOverlayRef}
                className={`venue-public-booking-shell ${bookingOpen ? "open" : ""}`}
                role={bookingOpen && mobileBooking ? "dialog" : undefined}
                aria-modal={(bookingOpen && mobileBooking) || undefined}
                aria-labelledby={bookingOpen && mobileBooking ? "venue-booking-title" : undefined}
              >
                <button
                  ref={bookingCloseRef}
                  type="button"
                  className="venue-mobile-booking-close"
                  aria-label={t("Закрыть")}
                  onClick={closeBooking}
                >
                  <X size={24} />
                </button>
                {mobileBooking ? (
                  <BookingPicker
                    key={venue.id}
                    venueID={venue.id}
                    venueName={venue.name}
                    venueLogoURL={venue.logo_url}
                    menu={menuState.categories}
                    preorderEnabled={venue.preorder_enabled}
                    onClose={closeBooking}
                  />
                ) : (
                  <DesktopBookingFlow
                    ref={bookingFlowRef}
                    key={`${venue.id}-${bookingFlowVersion}`}
                    venueID={venue.id}
                    venueName={venue.name}
                    venueLogoURL={venue.logo_url}
                    menu={menuState.categories}
                    preorderEnabled={venue.preorder_enabled}
                    user={user}
                    quantities={preorderQuantities}
                    onQuantityChange={changePreorderQuantity}
                    menuModeOpen={preorderMenuOpen}
                    onMenuModeChange={setPreorderMenuOpen}
                    onPreorderStart={setBookingSummary}
                    onMenuUpdated={replaceMenu}
                    onConfirmationClose={finishBooking}
                  />
                )}
              </div>
            )
          ) : (
            <aside
              className="venue-booking-card venue-public-booking"
              aria-labelledby="venue-booking-title"
            >
              <CalendarDays size={25} aria-hidden="true" />
              <h2 id="venue-booking-title">{t("Бронирование")}</h2>
              <p>{t("Онлайн-бронирование этого заведения пока недоступно")}</p>
              <button type="button" className="button" disabled>
                {t("Забронировать")}
              </button>
            </aside>
          )}
          {!tableOrder && !bookable && (
            <div className="venue-mobile-booking-status" role="status">
              <span>
                <CalendarDays size={16} />
                {t("Бронирование пока недоступно")}
              </span>
            </div>
          )}
          {detailItem && (
            <PublicMenuItemDialog
              key={detailItem.id}
              item={detailItem}
              onClose={closeItemDetails}
              onAddToPreorder={
                tableOrder?.onQuantityChange
                  ? (quantity) => tableOrder.onQuantityChange?.(detailItem.id, quantity)
                  : preorderMenuOpen && preorderItems.some((item) => item.id === detailItem.id)
                    ? (quantity) => changePreorderQuantity(detailItem.id, quantity)
                    : undefined
              }
            />
          )}
          {reviewsOpen && (
            <VenueReviewsDialog
              venue={venue}
              reviews={reviewsState}
              onRetry={retryReviews}
              onClose={closeReviews}
            />
          )}
        </article>
      ) : state.error ? (
        <div className="dish-catalog-status" role="alert">
          <strong>
            {t(
              state.error === "missing"
                ? "Заведение больше недоступно"
                : "Не удалось загрузить заведение",
            )}
          </strong>
          {state.error === "failed" && (
            <button type="button" className="button secondary" onClick={retry}>
              <RefreshCw size={17} />
              {t("Повторить")}
            </button>
          )}
        </div>
      ) : (
        <div className="dish-catalog-status" role="status">
          {t("Загружаем заведение...")}
        </div>
      )}
      {tableOrder && venue && tableOrder.count > 0 && (
        <div className="venue-table-mobile-cta">
          <button
            type="button"
            aria-label={`${t("Ваш заказ")} · ${tableOrder.count} · ${tableOrder.totalLabel}`}
            onClick={() => {
              setSearchOpen(false);
              tableOrder.onOpenCart();
            }}
          >
            <strong>{tableOrder.totalLabel}</strong>
            <ShoppingBag size={23} aria-hidden="true" />
          </button>
        </div>
      )}
      {!tableOrder && bookable && (
        <div className={`venue-mobile-booking-cta ${bookingOpen ? "booking-open" : ""}`}>
          <button
            ref={bookingTriggerRef}
            type="button"
            className="venue-mobile-booking-primary"
            onClick={() => {
              setSearchOpen(false);
              if (onReserve) onReserve();
              else setBookingOpen(true);
            }}
          >
            {t("Забронировать онлайн")}
          </button>
          <button
            type="button"
            className="venue-mobile-menu-view-toggle"
            aria-label={t(menuView === "grid" ? "Показать списком" : "Показать сеткой")}
            title={t("Вид меню")}
            onClick={() => setMenuView(menuView === "grid" ? "list" : "grid")}
          >
            {menuView === "grid" ? (
              <List size={24} aria-hidden="true" />
            ) : (
              <LayoutGrid size={24} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </section>
  );
}
