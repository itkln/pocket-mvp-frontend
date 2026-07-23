import type { Locale } from "../../locales";

// Calendar arithmetic on ISO days ("2026-11-09"). Noon UTC avoids DST edge cases.
export const asDay = (value: string) => new Date(`${value}T12:00:00Z`);
export const isoDay = (value: Date) => value.toISOString().slice(0, 10);
export const addDays = (value: string, count: number) => {
  const result = asDay(value);
  result.setUTCDate(result.getUTCDate() + count);
  return isoDay(result);
};
export const monthStart = (value: string) => `${value.slice(0, 7)}-01`;
export const moveMonth = (value: string, count: number) => {
  const result = asDay(value);
  result.setUTCMonth(result.getUTCMonth() + count, 1);
  return isoDay(result);
};
// Six Monday-first weeks covering the month.
export const calendarDays = (month: string) => {
  const offset = (asDay(month).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => addDays(month, index - offset));
};
// Today in the venue's time zone; bookings open up to 30 days ahead.
export const venueToday = (timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};
export const bookingWindowDays = 30;

export type TimePeriod = "day" | "evening";
export const periodForTime = (time: string): TimePeriod => (time < "18:00" ? "day" : "evening");

export function guestsLabel(
  t: (source: string, params: { count: number }) => string,
  count: number,
  locale: Locale,
) {
  const category = new Intl.PluralRules(locale === "ua" ? "uk" : locale).select(count);
  const source =
    category === "one" ? "{count} гость" : category === "few" ? "{count} гостя" : "{count} гостей";
  return t(source, { count });
}
