"use client";

import { useState } from "react";
import { ChevronDown, Clock3, Download, Ellipsis, MessageSquareText, ReceiptText, Search, Send, Star, Table2 } from "lucide-react";
import { Button, IconButton, EmptyIllustration, PageHeader } from "../ui";

export const venueReviews = [
  { id: 1, guest: "Анна Ковач", initials: "АК", rating: 5, table: "08", order: "#1048", date: "Сегодня, 15:12", text: "Очень внимательный сервис и отличная паста. Отдельное спасибо Софии за рекомендацию вина.", items: "Тальятелле, буррата, красный апельсин" },
  { id: 2, guest: "Мартин Горак", initials: "МГ", rating: 4, table: "03", order: "#1046", date: "Сегодня, 14:08", text: "Все было вкусно, но основное блюдо пришлось ждать немного дольше, чем ожидали.", items: "Сибас на гриле, тирамису" },
  { id: 3, guest: "Елена Новак", initials: "ЕН", rating: 2, table: "12", order: "#1039", date: "Вчера, 21:44", text: "В зале было шумно, а счет принесли только после повторной просьбы. Еда хорошая, сервис стоит улучшить.", items: "Куриный шницель, напитки" },
  { id: 4, guest: "Лукаш Белик", initials: "ЛБ", rating: 5, table: "08", order: "#1037", date: "Вчера, 20:16", text: "Любимый стол у окна и стабильно прекрасный ужин. Вернемся снова.", items: "Буррата, сибас, тирамису" },
  { id: 5, guest: "Сара Миклова", initials: "СМ", rating: 3, table: "02", order: "#1031", date: "18 июля, 19:32", text: "Красивое место и приятная команда. Хотелось бы больше безлактозных десертов.", items: "Паста, красный апельсин" },
  { id: 6, guest: "Петер Варга", initials: "ПВ", rating: 5, table: "06", order: "#1028", date: "18 июля, 18:45", text: "Быстро заказали по QR-коду, разделили счет и оставили чаевые без ожидания официанта.", items: "Шницель, буррата, напитки" },
];

export function ReviewsScreen({ notify }: { notify: (message: string) => void }) {
  const [tableFilter, setTableFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [replying, setReplying] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replies, setReplies] = useState<Record<number, string>>({ 4: "Спасибо, Лукаш! Будем рады видеть вас снова за столом 08." });
  const tables = [...new Set(venueReviews.map((review) => review.table))].sort();
  const filteredReviews = venueReviews.filter((review) => {
    const matchesTable = tableFilter === "all" || review.table === tableFilter;
    const matchesRating = ratingFilter === "all" || (ratingFilter === "low" ? review.rating <= 3 : review.rating === Number(ratingFilter));
    const searchable = `${review.guest} ${review.order} ${review.text}`.toLowerCase();
    return matchesTable && matchesRating && searchable.includes(query.trim().toLowerCase());
  });
  const startReply = (reviewId: number) => {
    setReplying(reviewId);
    setReplyDraft(replies[reviewId] ?? "");
  };
  const publishReply = (reviewId: number) => {
    if (!replyDraft.trim()) return;
    setReplies((current) => ({ ...current, [reviewId]: replyDraft.trim() }));
    setReplying(null);
    setReplyDraft("");
    notify("Ответ на отзыв опубликован");
  };
  return <><PageHeader title="Отзывы" subtitle="Обратная связь гостей по залу, столам и заказам." actions={<Button kind="secondary" icon={Download}>Экспорт отзывов</Button>} /><section className="reviews-overview"><div className="panel review-score"><span>Средняя оценка</span><strong>4.8</strong><div className="review-stars">{[1,2,3,4,5].map((star) => <Star key={star} size={16} fill="currentColor" />)}</div><small>128 отзывов за 30 дней</small></div><div className="panel review-stat"><span><MessageSquareText size={19} /></span><div><small>Новых отзывов</small><strong>18</strong><p>+12% к прошлому месяцу</p></div></div><div className="panel review-stat"><span><Clock3 size={19} /></span><div><small>Среднее время ответа</small><strong>2 ч 14 мин</strong><p>Ответ опубликован на 92%</p></div></div></section><section className="reviews-toolbar"><label className="review-rating-select"><Star size={17} fill="currentColor" /><select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} aria-label="Фильтр по оценке"><option value="all">Все оценки</option><option value="5">5 звезд</option><option value="4">4 звезды</option><option value="low">3 и ниже</option></select><ChevronDown size={15} /></label><div className="reviews-toolbar-actions"><label className="review-table-filter"><Table2 size={17} /><select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)} aria-label="Фильтр по столу"><option value="all">Все столы</option>{tables.map((table) => <option value={table} key={table}>Стол {table}</option>)}</select><ChevronDown size={15} /></label><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Гость, заказ или текст" /></label></div></section><div className="reviews-list"><div className="reviews-list-heading"><p><strong>{filteredReviews.length}</strong> отзывов</p><span>Сначала новые <ChevronDown size={14} /></span></div>{filteredReviews.map((review) => <article className="panel review-card" key={review.id}><header><span className="review-avatar">{review.initials}</span><div><strong>{review.guest}</strong><small>{review.date} · Заказ {review.order}</small></div><div className="review-stars" aria-label={`${review.rating} из 5`}>{[1,2,3,4,5].map((star) => <Star key={star} size={15} fill={star <= review.rating ? "currentColor" : "none"} />)}</div><span className="review-table"><Table2 size={14} />Стол {review.table}</span><IconButton icon={Ellipsis} label="Действия с отзывом" /></header><p className="review-text">{review.text}</p><div className="review-order"><ReceiptText size={15} /><span>{review.items}</span><button onClick={() => notify(`Заказ ${review.order} открыт`)}>Открыть заказ</button></div>{replies[review.id] && replying !== review.id && <div className="owner-review-reply"><span>DI</span><div><strong>Ответ заведения</strong><p>{replies[review.id]}</p></div></div>}{replying === review.id ? <div className="review-reply-editor"><textarea autoFocus value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder="Напишите ответ гостю" /><div><Button kind="secondary" onClick={() => { setReplying(null); setReplyDraft(""); }}>Отмена</Button><Button icon={Send} disabled={!replyDraft.trim()} onClick={() => publishReply(review.id)}>Опубликовать</Button></div></div> : <footer><Button kind="quiet" icon={MessageSquareText} onClick={() => startReply(review.id)}>{replies[review.id] ? "Изменить ответ" : "Ответить"}</Button></footer>}</article>)}{filteredReviews.length === 0 && <div className="panel"><EmptyIllustration icon={MessageSquareText} title="Отзывы не найдены" text="Измените фильтр по столу, оценке или поисковый запрос." /></div>}</div></>;
}


