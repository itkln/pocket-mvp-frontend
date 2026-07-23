"use client";

import type { VenueAvailability } from "../../../../lib/public-catalog-api";
import { useI18n } from "../../i18n";
import type { TimePeriod } from "./booking-dates";

type Slot = VenueAvailability["slots"][number];

// Day/evening switch and the free time slots of the chosen period.
export function TimeSlotPicker({
  daySlots,
  eveningSlots,
  activePeriod,
  time,
  onPeriodChange,
  onTimeChange,
}: {
  daySlots: Slot[];
  eveningSlots: Slot[];
  activePeriod: TimePeriod;
  time: string;
  onPeriodChange: (period: TimePeriod) => void;
  onTimeChange: (time: string) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="venue-time-heading">
        <h3>{t("Свободное время")}</h3>
        <div className="venue-time-periods" role="group" aria-label={t("Свободное время")}>
          <button
            type="button"
            aria-pressed={activePeriod === "day"}
            disabled={!daySlots.length}
            className={activePeriod === "day" ? "active" : ""}
            onClick={() => onPeriodChange("day")}
          >
            {t("День")}
          </button>
          <button
            type="button"
            aria-pressed={activePeriod === "evening"}
            disabled={!eveningSlots.length}
            className={activePeriod === "evening" ? "active" : ""}
            onClick={() => onPeriodChange("evening")}
          >
            {t("Вечер")}
          </button>
        </div>
      </div>
      <div className="venue-time-grid">
        {(activePeriod === "day" ? daySlots : eveningSlots).map((slot) => (
          <button
            type="button"
            key={slot.time}
            className={time === slot.time ? "active" : ""}
            aria-pressed={time === slot.time}
            onClick={() => onTimeChange(slot.time)}
          >
            {slot.time}
          </button>
        ))}
      </div>
    </>
  );
}
