"use client";

import { useI18n } from "../../i18n";

const stepLabels = ["Время и контакты", "Предзаказ", "Подтверждение"] as const;

// Three-segment progress of a booking with pre-order: time and contacts, dishes, confirmation.
export function BookingProgress({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useI18n();
  const label = `${t("Шаг {step} из 3", { step })} · ${t(stepLabels[step - 1])}`;
  return (
    <div className="booking-progress">
      <div
        className="booking-progress-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
      >
        {[1, 2, 3].map((segment) => (
          <span key={segment} className={segment <= step ? "done" : ""} />
        ))}
      </div>
      <span className="booking-progress-label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
