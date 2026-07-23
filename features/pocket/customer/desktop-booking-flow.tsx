"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import type { AuthUser } from "../../../lib/auth-api";
import { APIError } from "../../../lib/api-client";
import { createReservationKey } from "../../../lib/reservation-key";
import {
  clearSavedPublicReservation,
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
import {
  addDays,
  asDay,
  bookingWindowDays,
  guestsLabel,
  monthStart,
  venueToday,
} from "./booking/booking-dates";
import { bookingNotes, BookingWishes } from "./booking/booking-wishes";
import { BookingProgress } from "./booking/booking-progress";
import { CalendarPopover } from "./booking/calendar-popover";
import { BookingSummary } from "./booking/booking-summary";
import { TimeSlotPicker } from "./booking/time-slot-picker";

type Step = "schedule" | "details" | "preorder" | "checkout";
type Period = "day" | "evening";
export type DesktopBookingFlowHandle = {
  checkout: () => void;
  bookWithoutPreorder: () => void;
  backToDetails: () => void;
};
export type DesktopBookingSummary = {
  date: string;
  time: string;
  guests: number;
};

export const DesktopBookingFlow = forwardRef<
  DesktopBookingFlowHandle,
  {
    venueID: string;
    venueName: string;
    venueAddress?: string;
    venueLogoURL?: string;
    menu: PublicMenuCategory[];
    preorderEnabled: boolean;
    user: AuthUser | null;
    quantities: Record<string, number>;
    onQuantityChange: (id: string, delta: number) => void;
    menuModeOpen: boolean;
    onMenuModeChange: (open: boolean) => void;
    onPreorderStart?: (summary: DesktopBookingSummary) => void;
    onMenuUpdated: (categories: PublicMenuCategory[]) => void;
    onConfirmationClose: () => void;
    onViewReservations?: () => void;
  }
>(function DesktopBookingFlow(
  {
    venueID,
    venueName,
    venueAddress,
    venueLogoURL,
    menu,
    preorderEnabled,
    user,
    quantities,
    onQuantityChange,
    menuModeOpen,
    onMenuModeChange,
    onPreorderStart,
    onMenuUpdated,
    onConfirmationClose,
    onViewReservations,
  },
  ref,
) {
  const { locale, t } = useI18n();
  const [step, setStep] = useState<Step>("schedule");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [period, setPeriod] = useState<Period>("day");
  const [availability, setAvailability] = useState<VenueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [guestName, setGuestName] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [guestPhone, setGuestPhone] = useState<string | null>(null);
  const [wishes, setWishes] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState<CreatedReservation | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const detailsCloseRef = useRef<HTMLButtonElement>(null);
  const detailsDialogRef = useRef<HTMLElement>(null);
  const scheduleTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpen = useRef(false);
  const submissionKey = useRef("");

  useEffect(() => {
    let active = true;
    void getSavedPublicReservation(venueID).then((saved) => {
      if (active && saved) setConfirmed(saved);
    });
    return () => {
      active = false;
    };
  }, [venueID]);

  useEffect(() => {
    const controller = new AbortController();
    getVenueAvailability(venueID, date, guests, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setAvailability(result);
        if (!date) {
          setDate(result.date);
          setMonth(monthStart(result.date));
        }
        setLoading(false);
        setAvailabilityError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setAvailabilityError(true);
        }
      });
    return () => controller.abort();
  }, [venueID, date, guests, revision]);

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

  useEffect(() => {
    if (wasMenuOpen.current && !menuModeOpen) menuTriggerRef.current?.focus();
    wasMenuOpen.current = menuModeOpen;
  }, [menuModeOpen]);

  useEffect(() => {
    if (step !== "details" && step !== "checkout" && !confirmed) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (confirmed)
      detailsDialogRef.current
        ?.querySelector<HTMLButtonElement>(".booking-confirmation .venue-booking-submit")
        ?.focus();
    else detailsCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (detailsDialogRef.current?.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        if (calendarRef.current?.querySelector(".venue-calendar-popover")) {
          setCalendarOpen(false);
          return;
        }
        if (step === "checkout") {
          setStep("preorder");
          onMenuModeChange(true);
        } else if (step === "details") {
          setStep("schedule");
          scheduleTriggerRef.current?.focus();
        }
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        detailsDialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, textarea",
        ) ?? [],
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
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [step, confirmed, onMenuModeChange]);

  const contactName = guestName ?? [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  const contactEmail = guestEmail ?? user?.email ?? "";
  const contactPhone = guestPhone ?? user?.phone ?? "";
  useEffect(() => {
    submissionKey.current = createReservationKey();
  }, [date, guests, time, user?.id]);

  const current = availability?.date === date ? availability : null;
  const daySlots = current?.slots.filter((slot) => slot.time < "18:00") ?? [];
  const eveningSlots = current?.slots.filter((slot) => slot.time >= "18:00") ?? [];
  const activePeriod =
    period === "day" && !daySlots.length
      ? "evening"
      : period === "evening" && !eveningSlots.length
        ? "day"
        : period;
  const selectedSlot = current?.slots.find((slot) => slot.time === time);
  const today = current ? venueToday(current.timezone) : date;
  const latest = today ? addDays(today, bookingWindowDays) : date;
  const catalog = getPreorderCategories(menu).flatMap((category) => category.items);
  const selectedItems = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({
      id,
      quantity,
      item: catalog.find((candidate) => candidate.id === id),
    }));
  const missingItems = selectedItems.some(({ item }) => !item);
  const totalMinor = selectedItems.reduce(
    (sum, { item, quantity }) => sum + (item?.price_minor ?? 0) * quantity,
    0,
  );
  const validContact =
    contactName.trim().length >= 2 &&
    contactPhone.trim().length >= 5 &&
    (!contactEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()));
  const detailsHint =
    loading || availabilityError || !current?.slots.length
      ? ""
      : !selectedSlot
        ? t("Выберите время, чтобы продолжить")
        : step === "details" && (!contactName.trim() || !contactPhone.trim())
          ? t("Введите имя и телефон")
          : "";
  const currency = selectedItems.find(({ item }) => item)?.item?.currency ?? "EUR";
  const formatMoney = (minor: number, code = currency) =>
    new Intl.NumberFormat(localeTags[locale], { style: "currency", currency: code }).format(
      minor / 100,
    );
  const dateLabel = date
    ? new Intl.DateTimeFormat(localeTags[locale], {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(asDay(date))
    : "";
  const changeQuantity = (id: string, delta: number) => {
    onQuantityChange(id, delta);
    setSubmitError("");
  };
  const changeDate = (value: string) => {
    if (value < today || value > latest) return;
    setDate(value);
    setTime("");
    setAvailability(null);
    setLoading(true);
    setMonth(monthStart(value));
    setCalendarOpen(false);
  };
  const changeGuests = (value: number) => {
    setGuests(value);
    setTime("");
    setAvailability(null);
    setLoading(true);
  };
  const startPreorder = () => {
    onPreorderStart?.({ date, time, guests });
    setStep("preorder");
    onMenuModeChange(true);
  };
  const submit = async (withPreorder: boolean) => {
    if (
      !selectedSlot ||
      submitting ||
      !validContact ||
      (withPreorder && (selectedItems.length === 0 || missingItems))
    )
      return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await createPublicReservation(venueID, {
        starts_at: selectedSlot.starts_at,
        guests,
        guest_name: contactName.trim(),
        guest_email: contactEmail.trim(),
        guest_phone: contactPhone.trim(),
        notes: bookingNotes(wishes, comment),
        items: withPreorder
          ? selectedItems.flatMap(({ item, quantity }) =>
              item
                ? [{ menu_item_id: item.id, quantity, expected_price_minor: item.price_minor }]
                : [],
            )
          : [],
        expected_total_minor: withPreorder ? totalMinor : 0,
        idempotency_key: submissionKey.current,
      });
      setConfirmed(result);
    } catch (caught) {
      if (
        caught instanceof APIError &&
        (caught.code === "price_changed" || caught.code === "item_unavailable")
      ) {
        try {
          onMenuUpdated(await getPublicVenueMenu(venueID));
          setSubmitError(
            caught.code === "price_changed"
              ? t("Цена изменилась. Проверьте новую сумму и подтвердите ещё раз")
              : t("Одно из блюд больше недоступно. Уберите его из предзаказа"),
          );
          if (caught.code === "item_unavailable") {
            setStep("preorder");
            onMenuModeChange(false);
          }
        } catch {
          setSubmitError(t("Не удалось обновить меню. Попробуйте ещё раз"));
        }
      } else if (
        caught instanceof APIError &&
        (caught.code === "slot_unavailable" || caught.code === "hold_expired")
      ) {
        setStep("schedule");
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

  useImperativeHandle(ref, () => ({
    checkout: () => {
      setStep("checkout");
      setSubmitError("");
    },
    bookWithoutPreorder: () => {
      void submit(false);
    },
    backToDetails: () => {
      setStep("details");
      setSubmitError("");
    },
  }));

  const goBack = () => {
    if (step === "checkout") {
      setStep(preorderEnabled ? "preorder" : "details");
      if (preorderEnabled) onMenuModeChange(true);
    } else if (step === "preorder") setStep("details");
    else if (step === "details") setStep("schedule");
    setSubmitError("");
  };
  const selectedList = selectedItems.length ? (
    <div className="desktop-booking-selected-list">
      {selectedItems.map(({ id, quantity, item }) => (
        <article key={id}>
          {item?.image_url ? (
            <div
              className="desktop-booking-item-image"
              style={{ backgroundImage: `url(${JSON.stringify(item.image_url)})` }}
            />
          ) : (
            <div className="desktop-booking-item-image placeholder">
              <ShoppingBag size={20} />
            </div>
          )}
          <div>
            <strong>{item?.name ?? t("Блюдо недоступно")}</strong>
            <small>{item ? formatMoney(item.price_minor * quantity, item.currency) : ""}</small>
          </div>
          <div className="desktop-booking-quantity">
            <button
              type="button"
              aria-label={`${t("Убрать")} ${item?.name ?? id}`}
              onClick={() => changeQuantity(id, -1)}
            >
              <Minus size={15} />
            </button>
            <b>{quantity}</b>
            <button
              type="button"
              aria-label={`${t("Добавить")} ${item?.name ?? id}`}
              disabled={!item}
              onClick={() => changeQuantity(id, 1)}
            >
              <Plus size={15} />
            </button>
          </div>
        </article>
      ))}
    </div>
  ) : (
    <div className="desktop-booking-empty">
      <ShoppingBag size={30} aria-hidden="true" />
      <strong>{t("В предзаказе пока пусто")}</strong>
      <p>{t("Добавьте блюда из меню или забронируйте без предзаказа")}</p>
    </div>
  );

  return (
    <>
      {(step === "details" || step === "checkout" || confirmed) && (
        <div
          className="desktop-booking-backdrop"
          onMouseDown={() => {
            if (submitting) return;
            if (confirmed) {
              clearSavedPublicReservation(venueID);
              onConfirmationClose();
            } else if (step === "checkout") goBack();
            else {
              setStep("schedule");
              setCalendarOpen(false);
              scheduleTriggerRef.current?.focus();
            }
          }}
        />
      )}
      <aside
        ref={detailsDialogRef}
        className={`venue-booking-card venue-public-booking desktop-booking-flow ${step === "details" ? "details-open" : step === "checkout" || confirmed ? "checkout-open" : ""} ${confirmed ? "confirmation-open" : ""}`}
        hidden={step === "preorder" && menuModeOpen}
        aria-labelledby="venue-desktop-booking-title"
        role={step === "details" || step === "checkout" || confirmed ? "dialog" : undefined}
        aria-modal={step === "details" || step === "checkout" || Boolean(confirmed) || undefined}
      >
        {!confirmed && (
          <header className="desktop-booking-header">
            {step !== "schedule" && step !== "details" && !confirmed && (
              <button type="button" aria-label={t("Назад")} onClick={goBack}>
                <ArrowLeft size={19} />
              </button>
            )}
            <h2 id="venue-desktop-booking-title">
              {confirmed
                ? t("Бронь подтверждена")
                : step === "preorder"
                  ? t("Предзаказ")
                  : step === "checkout"
                    ? t("Подтверждение брони")
                    : t("Забронировать стол")}
            </h2>
            {(step === "details" || step === "checkout") && (
              <button
                ref={detailsCloseRef}
                type="button"
                className="desktop-booking-close"
                aria-label={t("Закрыть")}
                disabled={submitting}
                onClick={() => {
                  if (step === "checkout") {
                    goBack();
                    return;
                  }
                  setStep("schedule");
                  setCalendarOpen(false);
                  scheduleTriggerRef.current?.focus();
                }}
              >
                <X size={22} />
              </button>
            )}
          </header>
        )}
        {!confirmed && preorderEnabled && (step !== "preorder" || !menuModeOpen) && (
          <BookingProgress step={step === "checkout" ? 3 : step === "preorder" ? 2 : 1} />
        )}
        {confirmed ? (
          <BookingConfirmation
            venueID={venueID}
            venueName={venueName}
            venueLogoURL={venueLogoURL}
            reservation={confirmed}
            timezone={availability?.timezone ?? "Europe/Bratislava"}
            guestName={contactName}
            guestPhone={contactPhone}
            headingID="venue-desktop-booking-title"
            onViewReservations={
              user && onViewReservations
                ? () => {
                    clearSavedPublicReservation(venueID);
                    onViewReservations();
                  }
                : undefined
            }
            items={selectedItems.map(({ id, quantity, item }) => ({
              id,
              quantity,
              name: item?.name ?? t("Блюдо недоступно"),
            }))}
            onClose={() => {
              clearSavedPublicReservation(venueID);
              onConfirmationClose();
            }}
          />
        ) : (
          <>
            {(step === "schedule" || step === "details") && (
              <>
                <div
                  className={
                    step === "details"
                      ? "desktop-booking-details-body"
                      : "desktop-booking-schedule-body"
                  }
                >
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
                        <span>
                          {date
                            ? new Intl.DateTimeFormat(localeTags[locale], {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                timeZone: "UTC",
                              }).format(asDay(date))
                            : t("Дата")}
                        </span>
                        <ChevronDown size={16} />
                      </button>
                      {calendarOpen && month && (
                        <CalendarPopover
                          month={month}
                          date={date}
                          today={today}
                          latest={latest}
                          dayLabel={(value) =>
                            new Intl.DateTimeFormat(localeTags[locale], {
                              dateStyle: "full",
                              timeZone: "UTC",
                            }).format(asDay(value))
                          }
                          onMonthChange={setMonth}
                          onChoose={changeDate}
                        />
                      )}
                    </div>
                    <div className="venue-guests">
                      <button
                        type="button"
                        aria-label={t("Уменьшить количество гостей")}
                        disabled={guests === 1}
                        onClick={() => changeGuests(guests - 1)}
                      >
                        <Minus size={16} />
                      </button>
                      <strong>{guestsLabel(t, guests, locale)}</strong>
                      <button
                        type="button"
                        aria-label={t("Увеличить количество гостей")}
                        disabled={guests === 20}
                        onClick={() => changeGuests(guests + 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="venue-booking-scroll">
                    {loading ? (
                      <p role="status">{t("Ищем свободные столы...")}</p>
                    ) : availabilityError ? (
                      <div role="alert">
                        <p>{t("Не удалось проверить свободные столы")}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setLoading(true);
                            setAvailabilityError(false);
                            setRevision((value) => value + 1);
                          }}
                        >
                          {t("Повторить")}
                        </button>
                      </div>
                    ) : current?.slots.length ? (
                      <TimeSlotPicker
                        daySlots={daySlots}
                        eveningSlots={eveningSlots}
                        activePeriod={activePeriod}
                        time={time}
                        onPeriodChange={(value) => {
                          setPeriod(value);
                          setTime("");
                        }}
                        onTimeChange={(value) => {
                          setTime(value);
                          setSubmitError("");
                        }}
                      />
                    ) : (
                      <p role="status">{t("На эту дату свободных столов нет")}</p>
                    )}
                  </div>
                  {step === "details" && (
                    <div className="desktop-booking-details-scroll">
                      <div className="venue-booking-contact">
                        <h3>{t("Контакты")}</h3>
                        <label>
                          {t("Имя")}
                          <input
                            value={contactName}
                            autoComplete="name"
                            maxLength={120}
                            onChange={(event) => setGuestName(event.target.value)}
                          />
                        </label>
                        <label>
                          {t("Телефон")}
                          <input
                            value={contactPhone}
                            type="tel"
                            autoComplete="tel"
                            maxLength={40}
                            onChange={(event) => setGuestPhone(event.target.value)}
                          />
                        </label>
                        <label>
                          {t("Эл. почта (необязательно)")}
                          <input
                            value={contactEmail}
                            type="email"
                            autoComplete="email"
                            maxLength={254}
                            onChange={(event) => setGuestEmail(event.target.value)}
                          />
                        </label>
                      </div>
                      {selectedSlot && (
                        <BookingWishes
                          wishes={wishes}
                          comment={comment}
                          onWishesChange={setWishes}
                          onCommentChange={setComment}
                        />
                      )}
                    </div>
                  )}
                  {submitError && (
                    <p className="venue-booking-submit-error" role="alert">
                      {t(submitError)}
                    </p>
                  )}
                </div>
                <button
                  ref={scheduleTriggerRef}
                  type="button"
                  className="venue-booking-submit desktop-booking-footer"
                  disabled={!selectedSlot || (step === "details" && !validContact) || submitting}
                  onClick={() => {
                    if (step === "schedule") {
                      setStep("details");
                      setCalendarOpen(false);
                    } else if (preorderEnabled) startPreorder();
                    else void submit(false);
                    setSubmitError("");
                  }}
                >
                  {step === "schedule"
                    ? t("Продолжить")
                    : preorderEnabled
                      ? t("Продолжить к предзаказу")
                      : t("Забронировать")}
                </button>
                {detailsHint && <p className="desktop-booking-hint">{detailsHint}</p>}
              </>
            )}
            {step === "preorder" && (
              <>
                <div className="desktop-booking-summary">
                  <strong>{venueName}</strong>
                  <span>
                    {dateLabel} · {time} · {t("Гостей: {count}", { count: guests })}
                  </span>
                </div>
                <div className="desktop-booking-preorder-content">
                  <div className="desktop-booking-preorder-heading">
                    <h3>{t("Предзаказ блюд")}</h3>
                    <button
                      ref={menuTriggerRef}
                      type="button"
                      onClick={() => onMenuModeChange(true)}
                    >
                      <Plus size={17} />
                      {t("Добавить блюда")}
                    </button>
                  </div>
                  {selectedList}
                </div>
                {submitError && (
                  <p className="venue-booking-submit-error" role="alert">
                    {t(submitError)}
                  </p>
                )}
                <div className="desktop-booking-actions">
                  {selectedItems.length ? (
                    <button
                      type="button"
                      className="venue-booking-submit venue-preorder-payment-button"
                      disabled={missingItems}
                      onClick={() => {
                        setStep("checkout");
                        setSubmitError("");
                      }}
                    >
                      <span>{t("Продолжить к оплате")}</span>
                      <strong>{formatMoney(totalMinor)}</strong>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="venue-booking-submit"
                      disabled={submitting}
                      onClick={() => void submit(false)}
                    >
                      {submitting ? t("Сохраняем бронь...") : t("Забронировать без предзаказа")}
                    </button>
                  )}
                </div>
              </>
            )}
            {step === "checkout" && (
              <div className="desktop-booking-checkout">
                <BookingSummary
                  venueName={venueName}
                  venueAddress={venueAddress}
                  date={date}
                  time={time}
                  guests={guests}
                  onEdit={() => {
                    setStep("details");
                    setSubmitError("");
                  }}
                />
                <h3>{t("Ваш предзаказ")}</h3>
                <div className="desktop-booking-review-items">
                  {selectedItems.map(({ id, quantity, item }) => (
                    <article key={id}>
                      {item?.image_url ? (
                        <div
                          className="desktop-booking-item-image"
                          role="img"
                          aria-label={item.name}
                          style={{ backgroundImage: `url(${JSON.stringify(item.image_url)})` }}
                        />
                      ) : (
                        <div className="desktop-booking-item-image placeholder">
                          <ShoppingBag size={20} aria-hidden="true" />
                        </div>
                      )}
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
                  <strong>{formatMoney(totalMinor)}</strong>
                </div>
                <div className="desktop-booking-account">
                  <h3>{t("Контакты")}</h3>
                  <div className="desktop-booking-contact-card">
                    <span className="desktop-booking-contact-avatar">
                      <UserRound size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{contactName.trim()}</strong>
                      <span>
                        {[contactPhone.trim(), contactEmail.trim()].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={t("Изменить контакты")}
                      onClick={() => {
                        setStep("details");
                        setSubmitError("");
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {(wishes.length > 0 || comment.trim()) && (
                  <div className="desktop-booking-notes">
                    <h3>{t("Комментарий к ресторану")}</h3>
                    <p>{bookingNotes(wishes, comment, t)}</p>
                  </div>
                )}
                <section className="desktop-booking-payment desktop-booking-payment-section">
                  <h3>{t("Оплата предзаказа")}</h3>
                  <div className="desktop-booking-payment-choice">
                    <div>
                      <strong>{t("Оплата в заведении")}</strong>
                      <p>
                        {t("Онлайн-оплата пока недоступна. Предзаказ сохранится вместе с бронью.")}
                      </p>
                    </div>
                  </div>
                </section>
                {submitError && (
                  <p className="venue-booking-submit-error" role="alert">
                    {t(submitError)}
                  </p>
                )}
                <button
                  type="button"
                  className="venue-booking-submit"
                  disabled={submitting || missingItems || selectedItems.length === 0}
                  onClick={() => void submit(true)}
                >
                  {submitting
                    ? t("Сохраняем бронь...")
                    : submitError.includes(t("Цена изменилась"))
                      ? t("Подтвердить новую сумму")
                      : t("Подтвердить бронь")}
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
});
