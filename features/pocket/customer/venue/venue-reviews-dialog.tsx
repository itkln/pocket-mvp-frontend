"use client";

import { useEffect, useRef } from "react";
import { Star, X } from "lucide-react";
import type { PublicVenue } from "../../../../lib/public-catalog-api";
import { useI18n } from "../../i18n";
import type { ReviewsState } from "./use-public-venue";

export function VenueReviewsDialog({
  venue,
  reviews,
  onRetry,
  onClose,
}: {
  venue: PublicVenue;
  reviews: ReviewsState;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="venue-reviews-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="venue-reviews-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-reviews-dialog-title"
      >
        <header>
          <h2 id="venue-reviews-dialog-title">{t("Рейтинг и отзывы")}</h2>
          <button ref={closeRef} type="button" aria-label={t("Закрыть")} onClick={onClose}>
            <X size={21} />
          </button>
        </header>
        <div className="venue-reviews-score">
          <strong>{venue.review_count > 0 ? venue.rating.toFixed(1) : "—"}</strong>
          <span>{t("Оценок: {count}", { count: venue.review_count })}</span>
        </div>
        <div className="venue-reviews-list">
          <h3>{t("Отзывы")}</h3>
          {reviews.loading ? (
            <p role="status">{t("Загружаем отзывы...")}</p>
          ) : reviews.error ? (
            <div role="alert">
              <p>{t("Не удалось загрузить отзывы")}</p>
              <button type="button" onClick={onRetry}>
                {t("Повторить")}
              </button>
            </div>
          ) : reviews.items.length ? (
            reviews.items.map((review) => (
              <article key={review.id}>
                <div className="venue-review-meta">
                  <strong>{t("Гость")}</strong>
                  <span aria-label={t("Оценка: {rating} из 5", { rating: review.rating })}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={16}
                        fill={index < review.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </span>
                </div>
                <small>
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    new Date(review.created_at),
                  )}
                </small>
                {review.body && <p>{review.body}</p>}
                {review.owner_reply && (
                  <div className="venue-review-reply">
                    <strong>{t("Ответ заведения")}</strong>
                    <p>{review.owner_reply}</p>
                  </div>
                )}
              </article>
            ))
          ) : (
            <p>{t("Отзывов пока нет")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
