"use client";

import { useMemo, useState } from "react";
import { Download, MessageSquareText, Search, Send, Star, Table2 } from "lucide-react";
import { Button, EmptyIllustration, PageHeader } from "../ui";
import { localeTags, useI18n } from "../i18n";
import { useOwnerWorkspace } from "./context";

export function ReviewsScreen({ notify }: { notify: (message: string) => void }) {
  const { reviews, answerReview } = useOwnerWorkspace();
  const { locale } = useI18n();
  const [tableFilter, setTableFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [replying, setReplying] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const tables = [...new Set(reviews.map((review) => review.table).filter(Boolean))].sort();
  const filtered = useMemo(() => reviews.filter((review) => {
    const tableMatches = tableFilter === "all" || review.table === tableFilter;
    const ratingMatches = ratingFilter === "all" || (ratingFilter === "low" ? review.rating <= 3 : review.rating === Number(ratingFilter));
    return tableMatches && ratingMatches && (review.guest_name + " " + (review.order ?? "") + " " + (review.body ?? "")).toLowerCase().includes(query.toLowerCase());
  }), [reviews, tableFilter, ratingFilter, query]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const publish = async (id: string) => { await answerReview(id, reply); setReplying(null); setReply(""); notify("Ответ опубликован"); };
  return <><PageHeader title="Отзывы" subtitle="Реальные отзывы выбранного заведения." actions={<Button kind="secondary" icon={Download} onClick={() => window.print()}>Экспорт</Button>} /><section className="reviews-overview"><div className="panel review-score"><span>Средняя оценка</span><strong>{average ? average.toFixed(1) : "—"}</strong><div className="review-stars"><Star size={16} fill="currentColor" /></div><small>{reviews.length} отзывов</small></div><div className="panel review-stat"><span><MessageSquareText size={19} /></span><div><small>Без ответа</small><strong>{reviews.filter((review) => !review.owner_reply).length}</strong><p>Требуют внимания</p></div></div></section><section className="reviews-toolbar"><label className="review-rating-select"><Star size={17} /><select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}><option value="all">Все оценки</option><option value="5">5 звезд</option><option value="4">4 звезды</option><option value="low">3 и ниже</option></select></label><div className="reviews-toolbar-actions"><label className="review-table-filter"><Table2 size={17} /><select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)}><option value="all">Все столы</option>{tables.map((table) => <option key={table} value={table}>Стол {table}</option>)}</select></label><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Гость, заказ или текст" /></label></div></section><div className="reviews-list">{filtered.length ? filtered.map((review) => <article className="panel review-card" key={review.id}><header><span className="review-avatar">{review.guest_name.split(/\s+/).map((part) => part.at(0)).slice(0, 2).join("").toUpperCase()}</span><div><strong>{review.guest_name}</strong><small>{new Date(review.created_at).toLocaleString(localeTags[locale])} {review.order ? "· Заказ " + review.order : ""}</small></div><div className="review-stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} fill={star <= review.rating ? "currentColor" : "none"} />)}</div>{review.table && <span className="review-table"><Table2 size={14} />Стол {review.table}</span>}</header><p className="review-text">{review.body || "Без текста"}</p>{review.owner_reply && replying !== review.id && <div className="owner-review-reply"><span>P</span><div><strong>Ответ заведения</strong><p>{review.owner_reply}</p></div></div>}{replying === review.id ? <div className="review-reply-editor"><textarea autoFocus value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Напишите ответ гостю" /><div><Button kind="secondary" onClick={() => { setReplying(null); setReply(""); }}>Отмена</Button><Button icon={Send} disabled={!reply.trim()} onClick={() => void publish(review.id)}>Опубликовать</Button></div></div> : <footer><Button kind="quiet" icon={MessageSquareText} onClick={() => { setReplying(review.id); setReply(review.owner_reply ?? ""); }}>{review.owner_reply ? "Изменить ответ" : "Ответить"}</Button></footer>}</article>) : <div className="panel"><EmptyIllustration icon={MessageSquareText} title={reviews.length ? "Отзывы не найдены" : "Отзывов пока нет"} text={reviews.length ? "Измените фильтры или поисковый запрос." : "Отзывы гостей появятся после завершенных заказов."} /></div>}</div></>;
}
