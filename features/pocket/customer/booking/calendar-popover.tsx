"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { localeTags, useI18n } from "../../i18n";
import { addDays, asDay, calendarDays, monthStart, moveMonth } from "./booking-dates";

// Month grid for choosing a booking date between `today` and `latest`.
export function CalendarPopover({
  month,
  date,
  today,
  latest,
  dayLabel,
  onMonthChange,
  onChoose,
}: {
  month: string;
  date: string;
  today: string;
  latest: string;
  // Accessible name of a day button, e.g. "Monday, 9 November 2026".
  dayLabel: (value: string) => string;
  onMonthChange: (month: string) => void;
  onChoose: (value: string) => void;
}) {
  const { locale, t } = useI18n();
  return (
    <div className="venue-calendar-popover" role="dialog" aria-label={t("Выбор даты")}>
      <div className="venue-calendar-header">
        <strong>
          {new Intl.DateTimeFormat(localeTags[locale], {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(asDay(month))}
        </strong>
        <div>
          <button
            type="button"
            aria-label={t("Предыдущий месяц")}
            disabled={month <= monthStart(today)}
            onClick={() => onMonthChange(moveMonth(month, -1))}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            aria-label={t("Следующий месяц")}
            disabled={moveMonth(month, 1) > monthStart(latest)}
            onClick={() => onMonthChange(moveMonth(month, 1))}
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
          }).format(asDay(addDays("2026-09-28", index))),
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
            aria-label={dayLabel(value)}
            aria-pressed={value === date}
            disabled={value < today || value > latest}
            onClick={() => onChoose(value)}
          >
            {Number(value.slice(8))}
          </button>
        ))}
      </div>
    </div>
  );
}
