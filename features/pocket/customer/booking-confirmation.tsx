"use client";

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
        <VenueLogo venueID={venueID} name={venueName} imageURL={venueLogoURL} />
        <p className="booking-confirmation-venue">{venueName}</p>
        <h2 id={headingID}>{t("Бронь подтверждена")}</h2>
      </div>
      <div className="booking-confirmation-visit">
        {guestName?.trim() && <p className="booking-confirmation-guest">{guestName.trim()}</p>}
        <p className="booking-confirmation-date">{date}</p>
        <p className="booking-confirmation-time">
          {t("Гостей: {count}", { count: reservation.guest_count })} · {time}
        </p>
      </div>
      <div className="booking-confirmation-meta">
        <p>
          {t("Номер брони")}: {reservation.code}
        </p>
        {guestPhone?.trim() && <p>{guestPhone.trim()}</p>}
        {reservation.preorder_order_number ? (
          <p>
            {t("Номер предзаказа")}: {reservation.preorder_order_number}
          </p>
        ) : null}
      </div>
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
      {onClose && (
        <button type="button" className="venue-booking-submit" onClick={onClose}>
          {t("Вернуться к заведению")}
        </button>
      )}
    </section>
  );
}
