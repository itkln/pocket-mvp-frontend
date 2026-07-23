"use client";

import { localeTags, useI18n } from "../../i18n";
import { asDay } from "./booking-dates";

export function BookingSummary({
  venueName,
  venueAddress,
  date,
  time,
  guests,
  onEdit,
}: {
  venueName: string;
  venueAddress?: string;
  date: string;
  time: string;
  guests: number;
  onEdit: () => void;
}) {
  const { locale, t } = useI18n();
  const dateLabel = new Intl.DateTimeFormat(localeTags[locale], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(asDay(date));

  return (
    <section className="venue-preorder-reservation-summary" aria-label={t("Бронирование")}>
      <div className="booking-summary-venue">
        <div>
          <h3>{venueName}</h3>
          {venueAddress && <p>{venueAddress}</p>}
        </div>
        <button type="button" onClick={onEdit}>
          {t("Изменить")}
        </button>
      </div>
      <dl className="booking-summary-slots">
        <div>
          <dt>{t("Дата")}</dt>
          <dd>{dateLabel}</dd>
        </div>
        <div>
          <dt>{t("Время")}</dt>
          <dd>{time}</dd>
        </div>
        <div>
          <dt>{t("Гости")}</dt>
          <dd>{guests}</dd>
        </div>
      </dl>
    </section>
  );
}
