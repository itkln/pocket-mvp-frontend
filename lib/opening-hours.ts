// The venue's weekly opening hours, as Vendor saves them in settings.opening_hours and Dish reads
// them from the public venue: each day is { open, close } ("HH:MM", venue time) or null if closed.
// "24:00" closes at midnight.

export const openingDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type OpeningDay = (typeof openingDays)[number];
export type DayHours = { open: string; close: string };
export type OpeningHours = Record<OpeningDay, DayHours | null>;

export const openingDayNames: Record<OpeningDay, string> = {
  mon: "Понедельник",
  tue: "Вторник",
  wed: "Среда",
  thu: "Четверг",
  fri: "Пятница",
  sat: "Суббота",
  sun: "Воскресенье",
};

export const defaultDayHours: DayHours = { open: "09:00", close: "22:00" };

export const defaultOpeningHours = (): OpeningHours =>
  Object.fromEntries(openingDays.map((day) => [day, { ...defaultDayHours }])) as OpeningHours;

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

// validDayHours: both times are valid and the venue closes after it opens.
export const validDayHours = (hours: DayHours) =>
  timePattern.test(hours.open) &&
  timePattern.test(hours.close) &&
  hours.open !== "24:00" &&
  hours.open < hours.close;

export const validOpeningHours = (hours: OpeningHours) =>
  openingDays.every((day) => hours[day] === null || validDayHours(hours[day]));

// normalizeOpeningHours reads a stored value; anything unusable falls back to the default week.
export const normalizeOpeningHours = (value: unknown): OpeningHours => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultOpeningHours();
  const source = value as Record<string, unknown>;
  const week = {} as OpeningHours;
  for (const day of openingDays) {
    const entry = source[day];
    if (entry === null) {
      week[day] = null;
      continue;
    }
    const hours = entry as Partial<DayHours> | undefined;
    if (!hours || typeof hours.open !== "string" || typeof hours.close !== "string") {
      return defaultOpeningHours();
    }
    week[day] = { open: hours.open, close: hours.close };
  }
  return week;
};

// The <input type="time"> cannot show 24:00: midnight is edited as 00:00.
export const timeInputValue = (time: string) => (time === "24:00" ? "00:00" : time);
export const closeFromInput = (time: string) => (time === "00:00" ? "24:00" : time);
