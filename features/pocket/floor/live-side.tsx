"use client";

import { useState } from "react";
import { Armchair, CalendarClock, Minus, Plus, ReceiptText, ShoppingBag } from "lucide-react";
import type { LiveBooking, LiveFloor, LiveTable } from "../../../lib/floor-api";
import { useI18n } from "../i18n";
import { money } from "../ui";
import type { FloorTable } from "./floor-model";

type Translate = ReturnType<typeof useI18n>["t"];

export const minutesBetween = (from: number, to: number) =>
  Math.max(0, Math.floor((to - from) / 60_000));

export const durationLabel = (t: Translate, minutes: number) =>
  minutes < 60
    ? t("{count} мин", { count: minutes })
    : t("{hours} ч {minutes} мин", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });

export const stateLabel = (state: LiveTable["state"]) =>
  state === "occupied" ? "Занят" : state === "reserved" ? "Бронь" : "Свободен";

// Today's bookings that have not arrived yet. A booking is seated at its own table with the
// button, or picked (click or drag) and dropped on another free table of the plan.
export function BookingList({
  floor,
  now,
  picked,
  busy,
  formatTime,
  onSeat,
  onPick,
}: {
  floor: LiveFloor | null;
  now: number;
  picked: string | null;
  busy: boolean;
  formatTime: (value: string) => string;
  onSeat: (booking: LiveBooking) => void;
  onPick: (bookingID: string | null) => void;
}) {
  const { t } = useI18n();
  const bookings = floor?.bookings ?? [];
  return (
    <section className="floor-card floor-bookings" aria-label={t("Ближайшие брони")}>
      <header>
        <div>
          <h2>{t("Ближайшие брони")}</h2>
          <p>
            {bookings.length
              ? t("Перетащите бронь на стол или нажмите «Посадить»")
              : t("На сегодня броней больше нет")}
          </p>
        </div>
        {bookings.length > 0 && <b className="floor-count">{bookings.length}</b>}
      </header>
      {!floor ? (
        <p className="floor-side-note">{t("Загружаем")}</p>
      ) : (
        <ul>
          {bookings.map((booking) => {
            const starts = Date.parse(booking.starts_at);
            const late = minutesBetween(starts, now);
            const ahead = minutesBetween(now, starts);
            return (
              <li
                key={booking.id}
                className={picked === booking.id ? "picked" : ""}
                draggable={!busy}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", booking.id);
                  event.dataTransfer.effectAllowed = "move";
                  onPick(booking.id);
                }}
                onDragEnd={() => onPick(null)}
              >
                <button
                  type="button"
                  className="floor-booking-main"
                  aria-pressed={picked === booking.id}
                  title={t("Выбрать другой стол")}
                  onClick={() => onPick(picked === booking.id ? null : booking.id)}
                >
                  <time dateTime={booking.starts_at}>{formatTime(booking.starts_at)}</time>
                  <span>
                    <strong>{booking.guest_name}</strong>
                    <small>
                      {t("Гостей: {count}", { count: booking.guest_count })} ·{" "}
                      {t("Стол {number}", { number: booking.table_identifier })}
                      {booking.notes ? ` · ${booking.notes}` : ""}
                    </small>
                    {(starts <= now || ahead <= 30 || booking.has_preorder) && (
                      <span className="floor-booking-tags">
                        {starts <= now ? (
                          <em className="late">
                            {t("Опаздывает на {time}", { time: durationLabel(t, late) })}
                          </em>
                        ) : (
                          ahead <= 30 && (
                            <em>{t("Через {time}", { time: durationLabel(t, ahead) })}</em>
                          )
                        )}
                        {booking.has_preorder && (
                          <em>
                            <ShoppingBag size={13} />
                            {t("Предзаказ")}
                          </em>
                        )}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className="floor-btn white small"
                  disabled={busy}
                  onClick={() => onSeat(booking)}
                >
                  {t("Посадить")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// What happens at the selected table, and what the staff can do with it right now.
export function LiveTableCard({
  table,
  floorName,
  live,
  booking,
  now,
  currency,
  busy,
  formatTime,
  onSeatBooking,
  onSeatWalkIn,
  onRelease,
}: {
  table: FloorTable;
  floorName: string;
  live?: LiveTable;
  booking?: LiveBooking;
  now: number;
  currency: string;
  busy: boolean;
  formatTime: (value: string) => string;
  onSeatBooking: (booking: LiveBooking) => void;
  onSeatWalkIn: (guests: number, guestName: string) => void;
  onRelease: () => void;
}) {
  const { t } = useI18n();
  const [guests, setGuests] = useState(Math.min(2, table.seats));
  const [guestName, setGuestName] = useState("");
  const state = live?.state ?? "free";
  const party = live?.party;
  const bill = live?.bill;
  return (
    <section className={`floor-card floor-table-card state-${state}`}>
      <header>
        <div>
          <h2>{t("Стол {number}", { number: table.id })}</h2>
          <p>
            {t(floorName)} · {t("Мест: {count}", { count: table.seats })}
          </p>
        </div>
        <span className={`floor-state state-${state}`}>{t(stateLabel(state))}</span>
      </header>

      {party && (
        <dl>
          <div>
            <dt>{t("Гости")}</dt>
            <dd>
              {party.guest_name || t("Без брони")} · {party.guest_count}
            </dd>
          </div>
          <div>
            <dt>{t("За столом")}</dt>
            <dd>{durationLabel(t, minutesBetween(Date.parse(party.seated_at), now))}</dd>
          </div>
          {!party.walk_in && (
            <div>
              <dt>{t("Бронь")}</dt>
              <dd>{party.code}</dd>
            </div>
          )}
        </dl>
      )}
      {bill && (
        <p className="floor-bill">
          <ReceiptText size={18} />
          <span>
            {t("Счёт открыт в {time}", { time: formatTime(bill.opened_at) })}
            <strong>{money(bill.total_minor / 100, currency)}</strong>
          </span>
        </p>
      )}
      {!party && bill && (
        <p className="floor-side-note">
          {t("Гости заказали по QR-коду. Стол освободится, когда счёт будет оплачен.")}
        </p>
      )}
      {party && (
        <button type="button" className="floor-btn soft" disabled={busy} onClick={onRelease}>
          {t("Освободить стол")}
        </button>
      )}

      {state !== "occupied" && booking && (
        <div className="floor-next-booking">
          <CalendarClock size={18} />
          <span>
            <strong>
              {formatTime(booking.starts_at)} · {booking.guest_name}
            </strong>
            <small>{t("Гостей: {count}", { count: booking.guest_count })}</small>
          </span>
          <button
            type="button"
            className="floor-btn white small"
            disabled={busy}
            onClick={() => onSeatBooking(booking)}
          >
            {t("Посадить")}
          </button>
        </div>
      )}
      {state !== "occupied" && (
        <form
          className="floor-walk-in"
          onSubmit={(event) => {
            event.preventDefault();
            onSeatWalkIn(guests, guestName);
          }}
        >
          <h3>{t("Гости без брони")}</h3>
          <div className="floor-stepper">
            <span>{t("Количество гостей")}</span>
            <button
              type="button"
              className="floor-icon-btn soft"
              aria-label={t("Меньше гостей")}
              onClick={() => setGuests((value) => Math.max(1, value - 1))}
            >
              <Minus size={19} />
            </button>
            <output aria-live="polite">{guests}</output>
            <button
              type="button"
              className="floor-icon-btn soft"
              aria-label={t("Больше гостей")}
              onClick={() => setGuests((value) => Math.min(20, value + 1))}
            >
              <Plus size={19} />
            </button>
          </div>
          <input
            value={guestName}
            maxLength={120}
            placeholder={t("Имя гостя (необязательно)")}
            aria-label={t("Имя гостя (необязательно)")}
            onChange={(event) => setGuestName(event.target.value)}
          />
          <button type="submit" className="floor-btn dark" disabled={busy}>
            <Armchair size={19} />
            {t("Посадить гостей")}
          </button>
        </form>
      )}
    </section>
  );
}
