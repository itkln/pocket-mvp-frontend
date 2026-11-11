"use client";

import { useMemo, useState } from "react";
import { Download, MessageSquareText, Search, Send, Star } from "lucide-react";
import { type OwnerReview } from "../../../lib/owner-api";
import { Button, EmptyIllustration, PageHeader, StatCard } from "../ui";
import { localeTags, useI18n } from "../i18n";
import { useOwnerWorkspace } from "./context";

type ReviewFilter = "all" | "unanswered" | "5" | "4" | "low";

const reviewFilters: Array<{ id: ReviewFilter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "unanswered", label: "Без ответа" },
  { id: "5", label: "5 звезд" },
  { id: "4", label: "4 звезды" },
  { id: "low", label: "3 и ниже" },
];

const matchesFilter = (review: OwnerReview, filter: ReviewFilter) => {
  switch (filter) {
    case "all":
      return true;
    case "unanswered":
      return !review.owner_reply;
    case "low":
      return review.rating <= 3;
    default:
      return review.rating === Number(filter);
  }
};

const weekMs = 7 * 24 * 60 * 60 * 1000;

export function ReviewsScreen({
  venueName,
  notify,
}: {
  venueName: string;
  notify: (message: string) => void;
}) {
  const { reviews, answerReview } = useOwnerWorkspace();
  const { t } = useI18n();
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [table, setTable] = useState("all");
  const [query, setQuery] = useState("");
  const [editingID, setEditingID] = useState<string | null>(null);
  // The moment the screen opened: a stable reference for the 7-day window.
  const [openedAt] = useState(() => Date.now());

  const tables = useMemo(
    () => [...new Set(reviews.map((review) => review.table).filter(Boolean))].sort() as string[],
    [reviews],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reviews.filter(
      (review) =>
        matchesFilter(review, filter) &&
        (table === "all" || review.table === table) &&
        `${review.guest_name} ${review.order ?? ""} ${review.body ?? ""}`
          .toLowerCase()
          .includes(needle),
    );
  }, [reviews, filter, table, query]);

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const unanswered = reviews.filter((review) => !review.owner_reply).length;
  const lastWeek = reviews.filter(
    (review) => new Date(review.created_at).getTime() >= openedAt - weekMs,
  ).length;

  const publish = async (id: string, reply: string) => {
    await answerReview(id, reply);
    setEditingID(null);
    notify("Ответ опубликован");
  };

  return (
    <div className="owner-reviews">
      <PageHeader
        title={t("Отзывы")}
        subtitle={venueName}
        actions={
          <Button kind="secondary" icon={Download} onClick={() => window.print()}>
            {t("Экспорт")}
          </Button>
        }
      />
      <section className="vendor-stat-grid">
        <StatCard
          title={t("Средняя оценка")}
          value={
            <span className="reviews-average">
              {average ? average.toFixed(1) : "—"}
              <Star size={22} fill="currentColor" />
            </span>
          }
          caption={t("{count} отзывов", { count: reviews.length })}
        />
        <StatCard
          title={t("Без ответа")}
          value={unanswered}
          caption={unanswered ? t("Требуют внимания") : t("На все отзывы есть ответ")}
          tone={unanswered ? "warning" : undefined}
          onClick={unanswered ? () => setFilter("unanswered") : undefined}
          active={filter === "unanswered"}
        />
        <StatCard title={t("За последние 7 дней")} value={lastWeek} caption={t("Новых отзывов")} />
      </section>
      <section className="vendor-block reviews-block">
        <header className="reviews-toolbar">
          <div className="vendor-segmented" role="tablist" aria-label={t("Оценка")}>
            {reviewFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? "active" : ""}
                onClick={() => setFilter(item.id)}
              >
                {t(item.label)}
                <span>{reviews.filter((review) => matchesFilter(review, item.id)).length}</span>
              </button>
            ))}
          </div>
          <div className="reviews-toolbar-end">
            {tables.length > 0 && (
              <select
                className="vendor-select"
                aria-label={t("Стол")}
                value={table}
                onChange={(event) => setTable(event.target.value)}
              >
                <option value="all">{t("Все столы")}</option>
                {tables.map((item) => (
                  <option key={item} value={item}>
                    {t("Стол")} {item}
                  </option>
                ))}
              </select>
            )}
            <label className="vendor-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Гость, заказ или текст")}
                aria-label={t("Поиск по отзывам")}
              />
            </label>
          </div>
        </header>
        {visible.length ? (
          <ul className="reviews-feed">
            {visible.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                editing={editingID === review.id}
                onEdit={() => setEditingID(review.id)}
                onCancel={() => setEditingID(null)}
                onPublish={(reply) => publish(review.id, reply)}
              />
            ))}
          </ul>
        ) : (
          <EmptyIllustration
            icon={MessageSquareText}
            title={reviews.length ? t("Отзывы не найдены") : t("Отзывов пока нет")}
            text={
              reviews.length
                ? t("Измените фильтры или поисковый запрос.")
                : t("Отзывы гостей появятся после завершенных заказов.")
            }
          />
        )}
      </section>
    </div>
  );
}

function ReviewItem({
  review,
  editing,
  onEdit,
  onCancel,
  onPublish,
}: {
  review: OwnerReview;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onPublish: (reply: string) => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const meta = [
    new Date(review.created_at).toLocaleString(localeTags[locale], {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }),
    review.order && `${t("Заказ")} ${review.order}`,
    review.table && `${t("Стол")} ${review.table}`,
  ].filter(Boolean);

  return (
    <li className="review-item">
      <header>
        <span className="review-avatar" aria-hidden="true">
          {initials(review.guest_name)}
        </span>
        <div className="review-author">
          <strong>{review.guest_name}</strong>
          <small>{meta.join(" · ")}</small>
        </div>
        <RatingStars value={review.rating} />
      </header>
      <p className="review-body">{review.body || t("Без текста")}</p>
      {editing ? (
        <ReplyEditor initial={review.owner_reply ?? ""} onCancel={onCancel} onPublish={onPublish} />
      ) : (
        <>
          {review.owner_reply && (
            <div className="review-reply">
              <strong>{t("Ответ заведения")}</strong>
              <p>{review.owner_reply}</p>
            </div>
          )}
          <div className="review-actions">
            <Button kind="secondary" icon={MessageSquareText} onClick={onEdit}>
              {review.owner_reply ? t("Изменить ответ") : t("Ответить")}
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

function ReplyEditor({
  initial,
  onCancel,
  onPublish,
}: {
  initial: string;
  onCancel: () => void;
  onPublish: (reply: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [reply, setReply] = useState(initial);
  const [sending, setSending] = useState(false);
  const send = async () => {
    setSending(true);
    try {
      await onPublish(reply.trim());
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="review-editor">
      <textarea
        autoFocus
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        placeholder={t("Напишите ответ гостю")}
        aria-label={t("Ответ гостю")}
      />
      <div>
        <Button kind="secondary" onClick={onCancel}>
          {t("Отмена")}
        </Button>
        <Button icon={Send} disabled={!reply.trim() || sending} onClick={() => void send()}>
          {t("Опубликовать")}
        </Button>
      </div>
    </div>
  );
}

function RatingStars({ value }: { value: number }) {
  const { t } = useI18n();
  return (
    <span className="rating-stars" role="img" aria-label={t("Оценка: {value} из 5", { value })}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={16} fill={star <= value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part.at(0) ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
