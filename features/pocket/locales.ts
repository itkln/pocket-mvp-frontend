export type Locale = "ru" | "en" | "ua" | "sk";

export const isLocale = (value: string | undefined): value is Locale => value === "ru" || value === "en" || value === "ua" || value === "sk";

export const localeFromPathname = (pathname: string) => {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment === "uk") return "ua";
  return isLocale(segment) ? segment : undefined;
};

export const replacePathLocale = (pathname: string, locale: Locale) => {
  const segments = pathname.split("/").filter(Boolean);
  if (isLocale(segments[0]) || segments[0] === "uk") segments[0] = locale;
  else segments.unshift(locale);
  return `/${segments.join("/")}`;
};
