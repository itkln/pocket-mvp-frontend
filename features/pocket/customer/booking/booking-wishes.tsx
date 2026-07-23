"use client";

import { useI18n } from "../../i18n";

const options = [
  { id: "date", icon: "🌹", label: "Свидание" },
  { id: "birthday", icon: "🎂", label: "День рождения" },
  { id: "children", icon: "🧸", label: "С детьми" },
] as const;

export function bookingNotes(
  wishes: string[],
  comment: string,
  translate: (label: string) => string = (label) => label,
) {
  const labels = wishes.flatMap((id) => {
    const wish = options.find((option) => option.id === id);
    return wish ? [translate(wish.label)] : [];
  });
  return [labels.join(", "), comment.trim()].filter(Boolean).join(" · ");
}

export function BookingWishes({
  wishes,
  comment,
  onWishesChange,
  onCommentChange,
}: {
  wishes: string[];
  comment: string;
  onWishesChange: (wishes: string[]) => void;
  onCommentChange: (comment: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="venue-booking-wishes">
      <h3>{t("Пожелания к брони")}</h3>
      <div className="venue-wish-options">
        {options.map(({ id, icon, label }) => {
          const selected = wishes.includes(id);
          return (
            <button
              type="button"
              key={id}
              className={selected ? "active" : ""}
              aria-pressed={selected}
              onClick={() =>
                onWishesChange(selected ? wishes.filter((value) => value !== id) : [...wishes, id])
              }
            >
              <span aria-hidden="true">{icon}</span>
              {t(label)}
            </button>
          );
        })}
      </div>
      <textarea
        aria-label={t("Комментарий к ресторану")}
        placeholder={t("Комментарий к ресторану")}
        value={comment}
        maxLength={500}
        onChange={(event) => onCommentChange(event.target.value.slice(0, 500))}
      />
      <small className="comment-character-count">{comment.length}/500</small>
    </div>
  );
}
