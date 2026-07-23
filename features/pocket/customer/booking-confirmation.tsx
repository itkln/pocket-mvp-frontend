"use client";

import { CalendarDays, Check, Clock3, UserRound } from "lucide-react";
import type { CreatedReservation } from "../../../lib/public-catalog-api";
import { localeTags, useI18n } from "../i18n";
import { TipBreakdown } from "./tip-picker";
import { VenueLogo } from "../venue-logo";

type Props = {
  venueID: string;
  venueName: string;
  venueLogoURL?: string;
  reservation: CreatedReservation;
  timezone: string;
  guestName?: string;
  guestPhone?: string;
  headingID: string;
  items?: { id: string; name: string; quantity: number }[];
  onClose?: () => void;
  onViewReservations?: () => void;
};

export function BookingConfirmation({
  venueID,
  venueName,
  venueLogoURL,
  reservation,
  timezone,
  guestName,
  guestPhone,
  headingID,
  items = [],
  onClose,
  onViewReservations,
}: Props) {
  const { locale, t } = useI18n();
  const start = new Date(reservation.starts_at);
  const date = new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "full",
    timeZone: timezone,
  }).format(start);
  const time = new Intl.DateTimeFormat(localeTags[locale], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(start);
  const total = new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency: reservation.currency,
  }).format(reservation.preorder_total_minor / 100);

  return (
    <section className="venue-booking-confirmed booking-confirmation" role="status">
      <div className="booking-confirmation-brand">
        <div className="booking-confirmation-logo">
          <VenueLogo venueID={venueID} name={venueName} imageURL={venueLogoURL} />
          <span aria-hidden="true">
            <Check size={14} />
          </span>
        </div>
        <p className="booking-confirmation-venue">{venueName}</p>
        <h2 id={headingID}>{t("Бронь подтверждена")}</h2>
        <p className="booking-confirmation-meta">
          {t("Номер брони")}: {reservation.code}
        </p>
      </div>
      <div className="booking-confirmation-visit">
        <p className="booking-confirmation-date">
          <CalendarDays size={18} aria-hidden="true" /> {date}
        </p>
        <p className="booking-confirmation-time">
          <Clock3 size={18} aria-hidden="true" /> {time} ·{" "}
          {t("Гостей: {count}", { count: reservation.guest_count })}
        </p>
        {(guestName?.trim() || guestPhone?.trim()) && (
          <p className="booking-confirmation-guest">
            <UserRound size={18} aria-hidden="true" />
            <span>{guestName?.trim()}</span>
            {guestPhone?.trim() && <small>{guestPhone.trim()}</small>}
          </p>
        )}
      </div>
      {reservation.preorder_order_number && (
        <p className="booking-confirmation-meta">
          {t("Номер предзаказа")}: {reservation.preorder_order_number}
        </p>
      )}
      {reservation.preorder_total_minor > 0 && (
        <div className="booking-confirmation-preorder">
          <h3>{t("Предзаказ")}</h3>
          {items.map(({ id, name, quantity }) => (
            <p key={id}>
              {name} × {quantity}
            </p>
          ))}
          <TipBreakdown
            subtotal={
              reservation.preorder_subtotal_minor ??
              reservation.preorder_total_minor - (reservation.preorder_tip_minor ?? 0)
            }
            tip={reservation.preorder_tip_minor ?? 0}
            currency={reservation.currency}
          />
          <strong>{total}</strong>
          <p className="booking-confirmation-payment">{t("Оплата в заведении")}</p>
        </div>
      )}
      {(onClose || onViewReservations) && (
        <div className="booking-confirmation-actions">
          {onClose && (
            <button type="button" className="venue-booking-submit" onClick={onClose}>
              {t("Вернуться к заведению")}
            </button>
          )}
          {onViewReservations && (
            <button
              type="button"
              className="venue-booking-submit secondary"
              onClick={onViewReservations}
            >
              {t("Мои брони")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
