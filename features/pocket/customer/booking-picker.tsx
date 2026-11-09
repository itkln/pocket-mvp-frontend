"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Minus,
  Plus,
  Utensils,
  X,
} from "lucide-react";
import { useMenuView } from "./menu-view";
import { PublicMenuCards } from "./public-menu-cards";
import { PublicMenuItemDialog } from "./public-menu-item-dialog";
import { apiRequest, APIError } from "../../../lib/api-client";
import { createReservationKey } from "../../../lib/reservation-key";
import {
  createPublicReservation,
  getPreorderCategories,
  getPublicVenueMenu,
  getSavedPublicReservation,
  getVenueAvailability,
  type CreatedReservation,
  type PublicMenuCategory,
  type VenueAvailability,
} from "../../../lib/public-catalog-api";
import { localeTags, useI18n } from "../i18n";
import { BookingConfirmation } from "./booking-confirmation";

const day = (value: string) => new Date(`${value}T12:00:00Z`);
const isoDay = (value: Date) => value.toISOString().slice(0, 10);
const addDays = (value: string, count: number) => {
  const date = day(value);
  date.setUTCDate(date.getUTCDate() + count);
  return isoDay(date);
};
const monthStart = (value: string) => `${value.slice(0, 7)}-01`;
const moveMonth = (value: string, count: number) => {
  const date = day(value);
  date.setUTCMonth(date.getUTCMonth() + count, 1);
  return isoDay(date);
};
const calendarDays = (month: string) => {
  const date = day(month);
  const offset = (date.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => addDays(month, index - offset));
};
const wishOptions = [
  { id: "date", icon: "🌹", label: "Свидание" },
  { id: "birthday", icon: "🎂", label: "День рождения" },
  { id: "children", icon: "🧸", label: "С детьми" },
] as const;
type TimePeriod = "day" | "evening";
const periodForTime = (time: string): TimePeriod => (time < "18:00" ? "day" : "evening");

export type BookingService = {
  id: string;
  name: string;
  category_name?: string;
  duration_minutes: number;
  price_minor: number;
  currency: string;
};

export function BookingPicker({
  service,
  venueID,
  menu = [],
  preorderEnabled = false,
  onClose,
  venueName,
  venueLogoURL,
}: {
  service?: BookingService;
  venueID: string;
  venueName?: string;
  venueLogoURL?: string;
  menu?: PublicMenuCategory[];
  preorderEnabled?: boolean;
  onClose?: () => void;
}) {
  const { locale, t } = useI18n();
  const [menuView, setMenuView] = useMenuView();
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [period, setPeriod] = useState<TimePeriod>("day");
  const [wishes, setWishes] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [availability, setAvailability] = useState<VenueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [revision, setRevision] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [updatedMenu, setUpdatedMenu] = useState<PublicMenuCategory[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState<"details" | "preorder" | "checkout">("details");
  const [preorderScrolled, setPreorderScrolled] = useState(false);
  const changeStep = (next: typeof step) => {
    setPreorderScrolled(false);
    setStep(next);
  };
  const [detailItemID, setDetailItemID] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [storedActiveCategory, setActiveCategory] = useState("");
  const categories = useMemo(() => getPreorderCategories(updatedMenu ?? menu), [menu, updatedMenu]);
  const activeCategory = categories.some((category) => category.id === storedActiveCategory)
    ? storedActiveCategory
    : (categories[0]?.id ?? "");
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const categoryNavRef = useRef<HTMLElement>(null);
  const pendingCategory = useRef<string | null>(null);
  const pendingCategoryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pendingCategoryTimer.current) clearTimeout(pendingCategoryTimer.current);
    },
    [],
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const nav = categoryNavRef.current;
    const tab = nav?.querySelector<HTMLButtonElement>('button[aria-current="location"]');
    if (nav && tab) {
      if (tab.offsetLeft < nav.scrollLeft) nav.scrollLeft = tab.offsetLeft;
      else if (tab.offsetLeft + tab.offsetWidth > nav.scrollLeft + nav.clientWidth)
        nav.scrollLeft = tab.offsetLeft + tab.offsetWidth - nav.clientWidth;
    }
  }, [activeCategory, step]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    pendingCategory.current = null;
    if (step !== "details") headingRef.current?.focus();
  }, [step]);
  const [confirmed, setConfirmed] = useState<CreatedReservation | null>(null);
  const submissionKey = useRef("");

  useEffect(() => {
    if (service) return;
    let active = true;
    void getSavedPublicReservation(venueID).then((saved) => {
      if (active && saved) setConfirmed(saved);
    });
    return () => {
      active = false;
    };
  }, [venueID, service]);
  const calendarRef = useRef<HTMLDivElement>(null);
  const formatter = new Intl.DateTimeFormat(localeTags[locale], {
    day: "numeric",
    month: locale === "sk" ? "long" : "short",
    timeZone: "UTC",
  });
  const longFormatter = new Intl.DateTimeFormat(localeTags[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const monthFormatter = new Intl.DateTimeFormat(localeTags[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  useEffect(() => {
    const controller = new AbortController();
    (service
      ? apiRequest<VenueAvailability>(
          `/public/venues/${venueID}/service-availability?${new URLSearchParams({ service_id: service.id, ...(date ? { date } : {}) })}`,
          { signal: controller.signal, cache: "no-store" },
        )
      : getVenueAvailability(venueID, date, guests, controller.signal)
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setAvailability(result);
        if (!date) {
          setDate(result.date);
          setMonth(monthStart(result.date));
        }
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setError(true);
        }
      });
    return () => controller.abort();
  }, [venueID, date, guests, revision, service]);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    const outside = (event: PointerEvent) => {
      if (!calendarRef.current?.contains(event.target as Node)) setCalendarOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [calendarOpen]);

  const chooseDate = (value: string) => {
    if (!availability || value < today || value > latest) return;
    setDate(value);
    setTime("");
    setAvailability(null);
    setLoading(true);
    setMonth(monthStart(value));
    setCalendarOpen(false);
  };
  const changeGuests = (count: number) => {
    setGuests(count);
    setTime("");
    setAvailability(null);
    setLoading(true);
  };
  const current = availability?.date === date ? availability : null;
  const daySlots = current?.slots.filter((slot) => periodForTime(slot.time) === "day") ?? [];
  const eveningSlots =
    current?.slots.filter((slot) => periodForTime(slot.time) === "evening") ?? [];
  const activePeriod =
    period === "day" && !daySlots.length
      ? "evening"
      : period === "evening" && !eveningSlots.length
        ? "day"
        : period;
  const visibleSlots = activePeriod === "day" ? daySlots : eveningSlots;
  const selectedSlot = current?.slots.find((slot) => slot.time === time);
  const choosePeriod = (value: TimePeriod) => {
    if (value !== activePeriod) {
      setPeriod(value);
      setTime("");
    }
  };
  const toggleWish = (id: string) =>
    setWishes((selected) =>
      selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id],
    );
  const today = current
    ? (() => {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: current.timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
        return `${get("year")}-${get("month")}-${get("day")}`;
      })()
    : date;
  const latest = today ? addDays(today, 30) : date;
  const catalog = categories.flatMap((category) => category.items);
  const detailItem = catalog.find((item) => item.id === detailItemID);
  const selectedItems = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ item: catalog.find((item) => item.id === id), id, quantity }));
  const missingItems = selectedItems.some(({ item }) => !item);
  const preorderTotal = selectedItems.reduce(
    (sum, { item, quantity }) => sum + (item?.price_minor ?? 0) * quantity,
    0,
  );
  const currency = selectedItems.find(({ item }) => item)?.item?.currency ?? "EUR";
  const formatMoney = (minor: number, moneyCurrency = currency) =>
    new Intl.NumberFormat(localeTags[locale], {
      style: "currency",
      currency: moneyCurrency,
    }).format(minor / 100);
  const changeQuantity = (id: string, delta: number) => {
    setQuantities((previous) => {
      const next = { ...previous };
      const quantity = Math.max(0, Math.min(30, (next[id] ?? 0) + delta));
      if (quantity) next[id] = quantity;
      else delete next[id];
      return next;
    });
    setSubmitError("");
  };
  useEffect(() => {
    submissionKey.current = createReservationKey();
  }, [date, guests, time]);
  const submit = async () => {
    if (!selectedSlot || !guestName.trim() || !guestPhone.trim() || missingItems || submitting)
      return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const reservation = service
        ? (
            await apiRequest<{ reservation: CreatedReservation }>(
              `/public/venues/${venueID}/appointments`,
              {
                method: "POST",
                body: JSON.stringify({
                  service_id: service.id,
                  starts_at: selectedSlot.starts_at,
                  guest_name: guestName.trim(),
                  guest_phone: guestPhone.trim(),
                  notes: comment.trim(),
                  expected_price_minor: service.price_minor,
                  idempotency_key: submissionKey.current,
                }),
              },
            )
          ).reservation
        : await createPublicReservation(venueID, {
            starts_at: selectedSlot.starts_at,
            guests,
            guest_name: guestName.trim(),
            guest_phone: guestPhone.trim(),
            guest_email: guestEmail.trim(),
            notes: [
              wishes
                .map((id) => wishOptions.find((wish) => wish.id === id)?.label)
                .filter(Boolean)
                .join(", "),
              comment.trim(),
            ]
              .filter(Boolean)
              .join(" · "),
            items: selectedItems.flatMap(({ item, quantity }) =>
              item
                ? [{ menu_item_id: item.id, quantity, expected_price_minor: item.price_minor }]
                : [],
            ),
            expected_total_minor: preorderTotal,
            idempotency_key: submissionKey.current,
          });
      setConfirmed(reservation);
    } catch (caught) {
      if (service && caught instanceof APIError && caught.code === "price_changed") {
        setSubmitError(t("Условия записи изменились. Выберите время ещё раз."));
        onClose?.();
      } else if (
        caught instanceof APIError &&
        (caught.code === "price_changed" || caught.code === "item_unavailable")
      ) {
        try {
          setUpdatedMenu(await getPublicVenueMenu(venueID));
          if (caught.code === "item_unavailable") changeStep("preorder");
          setSubmitError(
            caught.code === "price_changed"
              ? t("Цена изменилась. Проверьте новую сумму и подтвердите ещё раз")
              : t("Одно из блюд больше недоступно. Уберите его из предзаказа"),
          );
        } catch {
          setSubmitError(t("Не удалось обновить меню. Попробуйте ещё раз"));
        }
      } else if (
        caught instanceof APIError &&
        (caught.code === "slot_unavailable" || caught.code === "hold_expired")
      ) {
        changeStep("details");
        setTime("");
        setRevision((value) => value + 1);
        setSubmitError(t("Это время уже занято. Выберите другое"));
      } else {
        setSubmitError(t("Не удалось сохранить бронь. Попробуйте ещё раз"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openCategory = (id: string) => {
    const container = scrollRef.current;
    const section = categoryRefs.current[id];
    if (!container || !section) return;
    setActiveCategory(id);
    pendingCategory.current = id;
    if (pendingCategoryTimer.current) clearTimeout(pendingCategoryTimer.current);
    pendingCategoryTimer.current = setTimeout(() => {
      pendingCategory.current = null;
    }, 800);
    container.scrollTo({
      top:
        container.scrollTop +
        section.getBoundingClientRect().top -
        container.getBoundingClientRect().top,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };
  const updateCategory = () => {
    const container = scrollRef.current;
    if (step !== "preorder" || !container) return;
    setPreorderScrolled(container.scrollTop > 0);
    if (pendingCategory.current) return;
    let current = categories[0]?.id ?? "";
    if (
      container.scrollTop > 0 &&
      container.scrollTop + container.clientHeight >= container.scrollHeight - 2
    )
      current = categories.at(-1)?.id ?? current;
    else
      categories.forEach(({ id }) => {
        if (
          (categoryRefs.current[id]?.getBoundingClientRect().top ?? Infinity) <=
          container.getBoundingClientRect().top + 24
        )
          current = id;
      });
    setActiveCategory(current);
  };

  const heading = (
    <div className="venue-booking-heading">
      {step !== "details" && !confirmed && (
        <button
          type="button"
          className="mobile-booking-back"
          aria-label={t("Назад")}
          disabled={submitting}
          onClick={() => changeStep(step === "checkout" && !service ? "preorder" : "details")}
        >
          <ArrowLeft size={22} />
        </button>
      )}
      <h2 ref={headingRef} tabIndex={-1} id="venue-booking-title">
        {t(
          !confirmed && step === "checkout"
            ? "Подтверждение брони"
            : step === "preorder" && !confirmed
              ? "Предзаказ блюд"
              : "Бронирование",
        )}
      </h2>
      {!confirmed && onClose && (
        <button
          type="button"
          className="mobile-booking-inline-close"
          aria-label={t("Закрыть")}
          disabled={submitting}
          onClick={onClose}
        >
          <X size={24} />
        </button>
      )}
    </div>
  );

  return (
    <aside
      className={`venue-booking-card venue-public-booking mobile-booking-flow ${step !== "details" && !confirmed ? "preorder-step" : ""} ${confirmed ? "confirmation-open" : step === "details" ? "details-step" : ""}`}
      aria-labelledby="venue-booking-title"
    >
      {!confirmed && step !== "details" && heading}
      {confirmed ? (
        <BookingConfirmation
          service={service}
          venueID={venueID}
          venueName={venueName ?? "Pocket"}
          venueLogoURL={venueLogoURL}
          reservation={confirmed}
          timezone={availability?.timezone ?? "Europe/Bratislava"}
          guestName={guestName}
          guestPhone={guestPhone}
          headingID="venue-booking-title"
          items={selectedItems.map(({ id, quantity, item }) => ({
            id,
            quantity,
            name: item?.name ?? t("Блюдо недоступно"),
          }))}
        />
      ) : (
        <>
          {step === "preorder" && (
            <div className={`mobile-preorder-top${preorderScrolled ? " is-scrolled" : ""}`}>
              <div className="mobile-preorder-summary">
                <strong>
                  {date ? formatter.format(day(date)) : ""} · {time}
                </strong>
                <span>{t("Гостей: {count}", { count: guests })}</span>
              </div>
              {step === "preorder" && categories.length > 0 && (
                <nav
                  ref={categoryNavRef}
                  className="venue-section-nav venue-public-category-nav mobile-preorder-categories"
                  aria-label={t("Категории меню")}
                >
                  {categories.map((category) => (
                    <button
                      type="button"
                      key={category.id}
                      className={
                        (activeCategory || categories[0].id) === category.id ? "active" : ""
                      }
                      aria-current={
                        (activeCategory || categories[0].id) === category.id
                          ? "location"
                          : undefined
                      }
                      onClick={() => openCategory(category.id)}
                    >
                      {category.name}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          )}
          <div
            className="venue-booking-scroll"
            ref={scrollRef}
            onScroll={updateCategory}
            onTouchStart={() => {
              pendingCategory.current = null;
            }}
            onWheel={() => {
              pendingCategory.current = null;
            }}
          >
            {step === "details" ? (
              <>
                {heading}
                <section className="mobile-booking-selection" aria-label={t("Дата и время")}>
                  <div className="venue-booking-toolbar">
                    <div className="venue-date-picker" ref={calendarRef}>
                      <button
                        type="button"
                        className={`venue-date-trigger ${calendarOpen ? "active" : ""}`}
                        aria-label={t("Выбрать дату")}
                        aria-expanded={calendarOpen}
                        aria-haspopup="dialog"
                        disabled={!date}
                        onClick={() => setCalendarOpen((value) => !value)}
                      >
                        <CalendarDays size={17} />
                        <span>{date ? formatter.format(day(date)) : t("Дата")}</span>
                        <ChevronDown className="venue-date-chevron" size={16} />
                      </button>
                      {calendarOpen && month && (
                        <div
                          className="venue-calendar-popover"
                          role="dialog"
                          aria-label={t("Выбор даты")}
                        >
                          <div className="venue-calendar-header">
                            <strong>{monthFormatter.format(day(month))}</strong>
                            <div>
                              <button
                                type="button"
                                aria-label={t("Предыдущий месяц")}
                                disabled={month <= monthStart(today)}
                                onClick={() => setMonth(moveMonth(month, -1))}
                              >
                                <ChevronLeft size={17} />
                              </button>
                              <button
                                type="button"
                                aria-label={t("Следующий месяц")}
                                disabled={moveMonth(month, 1) > monthStart(latest)}
                                onClick={() => setMonth(moveMonth(month, 1))}
                              >
                                <ChevronRight size={17} />
                              </button>
                            </div>
                          </div>
                          <div className="venue-calendar-weekdays" aria-hidden="true">
                            {Array.from({ length: 7 }, (_, index) =>
                              new Intl.DateTimeFormat(localeTags[locale], {
                                weekday: "short",
                                timeZone: "UTC",
                              }).format(day(addDays("2026-09-28", index))),
                            ).map((label, index) => (
                              <span key={index}>{label}</span>
                            ))}
                          </div>
                          <div className="venue-calendar-grid">
                            {calendarDays(month).map((value) => (
                              <button
                                type="button"
                                key={value}
                                className={`${value.slice(0, 7) !== month.slice(0, 7) ? "outside" : ""} ${value === date ? "selected" : ""}`}
                                aria-label={longFormatter.format(day(value))}
                                aria-pressed={value === date}
                                disabled={value < today || value > latest}
                                onClick={() => chooseDate(value)}
                              >
                                {Number(value.slice(8))}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {!service && (
                      <div className="venue-guests">
                        <button
                          type="button"
                          aria-label={t("Уменьшить количество гостей")}
                          disabled={guests === 1}
                          onClick={() => changeGuests(guests - 1)}
                        >
                          <Minus size={16} />
                        </button>
                        <strong>{t("Гостей: {count}", { count: guests })}</strong>
                        <button
                          type="button"
                          aria-label={t("Увеличить количество гостей")}
                          disabled={guests === 20}
                          onClick={() => changeGuests(guests + 1)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {service && (
                    <p>
                      <strong>{service.category_name}</strong>
                      <br />
                      {service.name} · {formatMoney(service.price_minor, service.currency)} ·{" "}
                      {service.duration_minutes} {t("мин")}
                    </p>
                  )}
                  {loading ? (
                    <p role="status">{t(service ? "Загрузка..." : "Ищем свободные столы...")}</p>
                  ) : error ? (
                    <div role="alert">
                      <p>
                        {t(
                          service
                            ? "Не удалось загрузить свободное время"
                            : "Не удалось проверить свободные столы",
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLoading(true);
                          setError(false);
                          setRevision((value) => value + 1);
                        }}
                      >
                        {t("Повторить")}
                      </button>
                    </div>
                  ) : current?.slots.length ? (
                    <div className="mobile-booking-times">
                      <div
                        className="venue-time-periods"
                        role="group"
                        aria-label={t("Свободное время")}
                      >
                        <button
                          type="button"
                          aria-pressed={activePeriod === "day"}
                          disabled={!daySlots.length}
                          className={activePeriod === "day" ? "active" : ""}
                          onClick={() => choosePeriod("day")}
                        >
                          {t("День")}
                        </button>
                        <button
                          type="button"
                          aria-pressed={activePeriod === "evening"}
                          disabled={!eveningSlots.length}
                          className={activePeriod === "evening" ? "active" : ""}
                          onClick={() => choosePeriod("evening")}
                        >
                          {t("Вечер")}
                        </button>
                      </div>
                      <div className="venue-time-grid">
                        {visibleSlots.map((slot) => (
                          <button
                            type="button"
                            key={slot.time}
                            className={time === slot.time ? "active" : ""}
                            aria-pressed={time === slot.time}
                            onClick={() => setTime(slot.time)}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="venue-booking-label">{t("Свободное время")}</p>
                      <p role="status">
                        {t(
                          service
                            ? "Нет свободного времени. Выберите другую дату."
                            : "На эту дату свободных столов нет",
                        )}
                      </p>
                    </>
                  )}
                </section>
                {!loading && !error && Boolean(current?.slots.length) && (
                  <>
                    {selectedSlot && (
                      <div className="venue-booking-wishes">
                        <h3>{t("Пожелания к брони")}</h3>
                        {!service && (
                          <div className="venue-wish-options">
                            {wishOptions.map((wish) => (
                              <button
                                type="button"
                                key={wish.id}
                                className={wishes.includes(wish.id) ? "active" : ""}
                                aria-pressed={wishes.includes(wish.id)}
                                onClick={() => toggleWish(wish.id)}
                              >
                                <span aria-hidden="true">{wish.icon}</span>
                                {t(wish.label)}
                              </button>
                            ))}
                          </div>
                        )}
                        <textarea
                          aria-label={t(service ? "Комментарий" : "Комментарий к ресторану")}
                          placeholder={t(service ? "Комментарий" : "Комментарий к ресторану")}
                          value={comment}
                          maxLength={500}
                          onChange={(event) => setComment(event.target.value.slice(0, 500))}
                        />
                        <small className="comment-character-count">{comment.length}/500</small>
                      </div>
                    )}

                    <div className="venue-booking-contact">
                      <h3>{t("Контакты")}</h3>
                      <label>
                        {t("Имя")}
                        <input
                          value={guestName}
                          maxLength={120}
                          autoComplete="name"
                          onChange={(event) => setGuestName(event.target.value)}
                        />
                      </label>
                      <label>
                        {t("Телефон")}
                        <input
                          value={guestPhone}
                          maxLength={40}
                          type="tel"
                          autoComplete="tel"
                          onChange={(event) => setGuestPhone(event.target.value)}
                        />
                      </label>
                      {!service && (
                        <label>
                          {t("Эл. почта (необязательно)")}
                          <input
                            value={guestEmail}
                            maxLength={254}
                            type="email"
                            autoComplete="email"
                            onChange={(event) => setGuestEmail(event.target.value)}
                          />
                        </label>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : step === "preorder" ? (
              <>
                <div className="mobile-preorder-menu">
                  {categories.length ? (
                    categories.map((category) => (
                      <section
                        key={category.id}
                        ref={(node) => {
                          categoryRefs.current[category.id] = node;
                        }}
                        className="venue-public-menu-category"
                        aria-label={category.name}
                      >
                        <h2>{category.name}</h2>
                        <PublicMenuCards
                          view={menuView}
                          items={category.items}
                          quantities={quantities}
                          onQuantityChange={changeQuantity}
                          onOpenDetails={(item) => setDetailItemID(item.id)}
                        />
                      </section>
                    ))
                  ) : (
                    <p>{t("Меню пока недоступно")}</p>
                  )}
                  {selectedItems
                    .filter(({ item }) => !item)
                    .map(({ id, quantity }) => (
                      <div key={id} className="venue-booking-menu-item unavailable">
                        <span>
                          {t("Блюдо недоступно")} · {quantity}
                        </span>
                        <button type="button" onClick={() => changeQuantity(id, -quantity)}>
                          {t("Убрать")}
                        </button>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="mobile-booking-review desktop-booking-checkout">
                <div className="desktop-booking-summary">
                  <strong>{venueName ?? t("Бронирование")}</strong>
                  <span>
                    {date ? longFormatter.format(day(date)) : ""} · {time}{" "}
                    {!service && <>· {t("Гостей: {count}", { count: guests })}</>}
                  </span>
                </div>
                {service ? (
                  <>
                    <h3>{service.category_name}</h3>
                    <p>
                      {service.name} · {service.duration_minutes} {t("мин")}
                    </p>
                  </>
                ) : (
                  <h3>{t("Ваш предзаказ")}</h3>
                )}
                <div className="desktop-booking-review-items">
                  {selectedItems.map(({ id, quantity, item }) => (
                    <article key={id}>
                      <div
                        className="desktop-booking-item-image"
                        role={item?.image_url ? "img" : undefined}
                        aria-label={item?.image_url ? item.name : undefined}
                        style={
                          item?.image_url
                            ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` }
                            : undefined
                        }
                      >
                        {!item?.image_url && <Utensils size={20} aria-hidden="true" />}
                      </div>
                      <span>
                        {item?.name ?? t("Блюдо недоступно")} × {quantity}
                      </span>
                      <strong>
                        {item ? formatMoney(item.price_minor * quantity, item.currency) : ""}
                      </strong>
                    </article>
                  ))}
                </div>
                <div className="desktop-booking-total">
                  <span>{t("Итого к оплате")}</span>
                  <strong>
                    {service
                      ? formatMoney(service.price_minor, service.currency)
                      : formatMoney(preorderTotal)}
                  </strong>
                </div>
                <div className="desktop-booking-account">
                  <h3>{t("Контакты")}</h3>
                  <strong>{guestName.trim()}</strong>
                  <span>{guestPhone.trim()}</span>
                  {guestEmail.trim() && <span>{guestEmail.trim()}</span>}
                </div>
                {(comment.trim() || wishes.length > 0) && (
                  <div className="desktop-booking-notes">
                    <h3>{t(service ? "Комментарий" : "Комментарий к ресторану")}</h3>
                    <p>
                      {[
                        wishes
                          .map((id) => t(wishOptions.find((wish) => wish.id === id)?.label ?? ""))
                          .join(", "),
                        comment.trim(),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                )}
                {!service && (
                  <div className="desktop-booking-payment">
                    <h3>{t("Оплата предзаказа")}</h3>
                    <strong>{t("Оплата в заведении")}</strong>
                    <p>
                      {t("Онлайн-оплата пока недоступна. Предзаказ сохранится вместе с бронью.")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mobile-booking-footer">
            {submitError && (
              <p className="venue-booking-submit-error" role="alert">
                {submitError}
              </p>
            )}
            <div className="mobile-booking-footer-actions">
              <button
                type="button"
                className={`venue-booking-submit ${step === "preorder" && selectedItems.length > 0 ? "venue-preorder-payment-button" : ""}`}
                disabled={
                  !selectedSlot ||
                  submitting ||
                  guestName.trim().length < 2 ||
                  guestPhone.trim().length < 5 ||
                  (step !== "details" && missingItems)
                }
                onClick={() => {
                  if (step === "details" && service) {
                    changeStep("checkout");
                  } else if (step === "details" && preorderEnabled) {
                    setCalendarOpen(false);
                    setActiveCategory("");
                    changeStep("preorder");
                  } else if (step === "preorder" && selectedItems.length > 0) {
                    setSubmitError("");
                    changeStep("checkout");
                  } else void submit();
                }}
              >
                <span>
                  {submitting
                    ? t("Сохраняем бронь...")
                    : step === "details" && (preorderEnabled || service)
                      ? t("Продолжить")
                      : step === "preorder" && selectedItems.length > 0
                        ? t("Продолжить к оплате")
                        : submitError.includes(t("Цена изменилась"))
                          ? t("Подтвердить новую сумму")
                          : step === "preorder"
                            ? t("Забронировать без предзаказа")
                            : t("Забронировать")}
                </span>
                {step === "preorder" && selectedItems.length > 0 && (
                  <strong>{formatMoney(preorderTotal)}</strong>
                )}
              </button>
              {step === "preorder" && (
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
              )}
            </div>
          </div>
          {step === "preorder" && detailItem && (
            <PublicMenuItemDialog
              key={detailItem.id}
              item={detailItem}
              onClose={() => setDetailItemID(null)}
              onAddToPreorder={(quantity) => changeQuantity(detailItem.id, quantity)}
            />
          )}
        </>
      )}
    </aside>
  );
}
