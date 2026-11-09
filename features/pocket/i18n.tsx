"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Locale } from "./locales";
import type { TranslationRow } from "./translations/types";
import { commonTranslations } from "./translations/common";
import { dishTranslations } from "./translations/dish";
import { vendorTranslations } from "./translations/vendor";
import { unreferencedTranslations } from "./translations/unreferenced";
type Params = Record<string, string | number>;

export const localeStorageKey = "pocket:locale";
export const localeTags: Record<Locale, string> = {
  ru: "ru-RU",
  en: "en-GB",
  ua: "uk-UA",
  sk: "sk-SK",
};
export const localeOptions: { value: Locale; short: string; label: string }[] = [
  { value: "ru", short: "RU", label: "Русский" },
  { value: "en", short: "EN", label: "English" },
  { value: "ua", short: "UA", label: "Українська" },
  { value: "sk", short: "SK", label: "Slovenčina" },
];

const rows: TranslationRow[] = [
  ...commonTranslations,
  ...dishTranslations,
  ...vendorTranslations,
  ...unreferencedTranslations,
];

const localeIndex: Record<Locale, number> = { ru: 0, en: 1, ua: 2, sk: 3 };
const dictionaries = Object.fromEntries(
  (Object.keys(localeIndex) as Locale[]).map((locale) => [
    locale,
    new Map(rows.map((row) => [row[0], row[localeIndex[locale]]])),
  ]),
) as Record<Locale, Map<string, string>>;

const interpolate = (value: string, params?: Params) =>
  params
    ? value.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`))
    : value;

const dynamicTranslation = (source: string, locale: Locale) => {
  const localized = (en: string, ua: string, sk: string) =>
    locale === "en" ? en : locale === "ua" ? ua : locale === "sk" ? sk : source;
  const floorName = (value: string) => {
    const match = value.match(/^(\d+) этаж$/);
    return match
      ? localized(`Floor ${match[1]}`, `${match[1]} поверх`, `${match[1]}. poschodie`)
      : value;
  };
  const fixtureName = (value: string) => {
    const names: Record<string, [string, string, string]> = {
      Окно: ["Window", "Вікно", "Okno"],
      Бар: ["Bar", "Бар", "Bar"],
      Вход: ["Entrance", "Вхід", "Vchod"],
    };
    const translations = names[value];
    return translations ? localized(...translations) : value;
  };
  let match: RegExpMatchArray | null;
  if ((match = source.match(/^Выбрано заведение (.+)$/)))
    return localized(
      `Selected venue ${match[1]}`,
      `Вибрано заклад ${match[1]}`,
      `Vybraná prevádzka ${match[1]}`,
    );
  if ((match = source.match(/^(.+) добавлено$/)))
    return localized(`${match[1]} added`, `${match[1]} додано`, `${match[1]} pridané`);
  if ((match = source.match(/^Заказ #(.+) принят$/)))
    return localized(
      `Order #${match[1]} accepted`,
      `Замовлення #${match[1]} прийнято`,
      `Objednávka #${match[1]} bola prijatá`,
    );
  if ((match = source.match(/^(#\d+) готов к выдаче$/)))
    return localized(
      `${match[1]} is ready for pickup`,
      `${match[1]} готове до видачі`,
      `${match[1]} je pripravená na výdaj`,
    );
  if ((match = source.match(/^(\d+) этаж (добавлен|удален)$/)))
    return match[2] === "добавлен"
      ? localized(
          `Floor ${match[1]} added`,
          `${match[1]} поверх додано`,
          `${match[1]}. poschodie pridané`,
        )
      : localized(
          `Floor ${match[1]} deleted`,
          `${match[1]} поверх видалено`,
          `${match[1]}. poschodie odstránené`,
        );
  if ((match = source.match(/^Стол (.+) добавлен на (.+)$/)))
    return localized(
      `Table ${match[1]} added to ${floorName(match[2])}`,
      `Стіл ${match[1]} додано на ${floorName(match[2])}`,
      `Stôl ${match[1]} pridaný na ${floorName(match[2])}`,
    );
  if ((match = source.match(/^(Окно|Бар|Вход) (?:добавлено|добавлен) на (.+)$/)))
    return localized(
      `${fixtureName(match[1])} added to ${floorName(match[2])}`,
      `${fixtureName(match[1])} додано на ${floorName(match[2])}`,
      `${fixtureName(match[1])} pridaný na ${floorName(match[2])}`,
    );
  if ((match = source.match(/^(Окно|Бар|Вход) (?:удалено|удален) с плана$/)))
    return localized(
      `${fixtureName(match[1])} removed from the plan`,
      `${fixtureName(match[1])} видалено з плану`,
      `${fixtureName(match[1])} odstránený z plánu`,
    );
  if ((match = source.match(/^Стол (.+) сохранен$/)))
    return localized(
      `Table ${match[1]} saved`,
      `Стіл ${match[1]} збережено`,
      `Stôl ${match[1]} bol uložený`,
    );
  if ((match = source.match(/^Стол (.+) удален с плана$/)))
    return localized(
      `Table ${match[1]} removed from the plan`,
      `Стіл ${match[1]} видалено з плану`,
      `Stôl ${match[1]} bol odstránený z plánu`,
    );
  if ((match = source.match(/^QR-код стола (.+) (скачан|перегенерирован)$/)))
    return match[2] === "скачан"
      ? localized(
          `Table ${match[1]} QR code downloaded`,
          `QR-код столу ${match[1]} завантажено`,
          `QR kód stola ${match[1]} bol stiahnutý`,
        )
      : localized(
          `Table ${match[1]} QR code regenerated`,
          `QR-код столу ${match[1]} перегенеровано`,
          `QR kód stola ${match[1]} bol vygenerovaný znova`,
        );
  if ((match = source.match(/^Стол (.+) забронирован на (.+)$/)))
    return localized(
      `Table ${match[1]} reserved for ${match[2]}`,
      `Стіл ${match[1]} заброньовано на ${match[2]}`,
      `Stôl ${match[1]} rezervovaný na ${match[2]}`,
    );
  const templates: [RegExp, string, string, string][] = [
    [/^Показать \((\d+)\)$/, "Show ($1)", "Показати ($1)", "Zobraziť ($1)"],
    [/^Открыть (.+)$/, "Open $1", "Відкрити $1", "Otvoriť $1"],
    [
      /^Стол (.+) уже существует$/,
      "Table $1 already exists",
      "Стіл $1 уже існує",
      "Stôl $1 už existuje",
    ],
    [/^(\d+) этаж$/, "$1 floor", "$1 поверх", "$1. poschodie"],
    [/^(\d+) (?:стол|стола|столов)$/, "$1 tables", "$1 столів", "$1 stolov"],
    [/^(\d+) (?:позиция|позиции|позиций)$/, "$1 items", "$1 позицій", "$1 položiek"],
    [/^(\d+) (?:гость|гостя|гостей)$/, "$1 guests", "$1 гостей", "$1 hostí"],
    [/^(\d+) (?:место|места|мест)$/, "$1 seats", "$1 місць", "$1 miest"],
    [/^(\d+) мин$/, "$1 min", "$1 хв", "$1 min"],
    [/^(\d+) новых$/, "$1 new", "$1 нових", "$1 nových"],
    [/^(\d+) из (\d+)$/, "$1 of $2", "$1 з $2", "$1 z $2"],
    [/^Завершено: (\d+)$/, "Completed: $1", "Завершено: $1", "Dokončené: $1"],
    [/^Активных столов: (\d+)$/, "Active tables: $1", "Активних столів: $1", "Aktívne stoly: $1"],
    [/^Отзывов: (\d+)$/, "Reviews: $1", "Відгуків: $1", "Recenzie: $1"],
    [/^(\d+) (?:отзыв|отзыва|отзывов)$/, "$1 reviews", "$1 відгуків", "$1 recenzií"],
    [/^до (\d+) гостей$/, "up to $1 guests", "до $1 гостей", "do $1 hostí"],
    [/^(\d+) июля$/, "$1 July", "$1 липня", "$1. júla"],
    [/^(\d+) июня$/, "$1 June", "$1 червня", "$1. júna"],
    [/^(\d+(?:[.,]\d+)?) км$/, "$1 km", "$1 км", "$1 km"],
    [/^(\d+) ЭТАЖ$/, "FLOOR $1", "$1 ПОВЕРХ", "$1. POSCHODIE"],
    [/^Удалить (\d+) этаж$/, "Delete floor $1", "Видалити поверх $1", "Odstrániť $1. poschodie"],
    [/^Удалить (.+)$/, "Delete $1", "Видалити $1", "Odstrániť $1"],
    [/^Добрый день, (.+)$/, "Good afternoon, $1", "Добрий день, $1", "Dobrý deň, $1"],
    [/^Стол (.+)$/, "Table $1", "Стіл $1", "Stôl $1"],
    [/^Заказ #(.+)$/, "Order #$1", "Замовлення #$1", "Objednávka #$1"],
    [/^До (\d+) заведений$/, "Up to $1 venues", "До $1 закладів", "Do $1 prevádzok"],
    [
      /^Доступных позиций: (\d+)$/,
      "$1 available items",
      "Доступних позицій: $1",
      "Dostupné položky: $1",
    ],
    [
      /^Успешных платежей: (\d+)$/,
      "Successful payments: $1",
      "Успішних платежів: $1",
      "Úspešné platby: $1",
    ],
    [/^Чаевые \((\d+)%\)$/, "Tip ($1%)", "Чайові ($1%)", "Prepitné ($1%)"],
    [
      /^Пробный период до (.+)$/,
      "Trial until $1",
      "Пробний період до $1",
      "Skúšobné obdobie do $1",
    ],
  ];
  for (const template of templates) {
    if (!template[0].test(source)) continue;
    const replacement =
      locale === "en"
        ? template[1]
        : locale === "ua"
          ? template[2]
          : locale === "sk"
            ? template[3]
            : source;
    return source.replace(template[0], replacement);
  }
  return source;
};

export const translate = (source: string, locale: Locale, params?: Params): string => {
  if (locale === "ru") return interpolate(source, params);
  const exact = dictionaries[locale].get(source);
  if (exact) return interpolate(exact, params);
  for (const separator of [" · ", " — ", " / "]) {
    if (!source.includes(separator)) continue;
    const parts = source.split(separator);
    const translated = parts.map((part) => translate(part, locale));
    if (translated.some((part, index) => part !== parts[index])) return translated.join(separator);
  }
  const dynamic = dynamicTranslation(source, locale);
  if (dynamic !== source) return interpolate(dynamic, params);
  return interpolate(source, params);
};

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, params?: Params) => string;
};
const I18nContext = createContext<I18nValue>({
  locale: "ru",
  setLocale: () => undefined,
  t: (source, params) => interpolate(source, params),
});

const sourceText = new WeakMap<Text, string>();
const renderedText = new WeakMap<Text, string>();
const sourceAttributes = new WeakMap<Element, Map<string, string>>();
const renderedAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ["placeholder", "title", "aria-label", "alt"];

const translateTextNode = (node: Text, locale: Locale) => {
  const previousRendered = renderedText.get(node);
  if (!sourceText.has(node) || (previousRendered !== undefined && node.data !== previousRendered))
    sourceText.set(node, node.data);
  const source = sourceText.get(node) ?? node.data;
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  const core = source.trim();
  const next = core ? `${leading}${translate(core, locale)}${trailing}` : source;
  renderedText.set(node, next);
  if (node.data !== next) node.data = next;
};

const translateElement = (element: Element, locale: Locale) => {
  const sourceMap = sourceAttributes.get(element) ?? new Map<string, string>();
  const renderedMap = renderedAttributes.get(element) ?? new Map<string, string>();
  for (const attribute of translatedAttributes) {
    const current = element.getAttribute(attribute);
    if (current === null) continue;
    if (
      !sourceMap.has(attribute) ||
      (renderedMap.has(attribute) && current !== renderedMap.get(attribute))
    )
      sourceMap.set(attribute, current);
    const next = translate(sourceMap.get(attribute) ?? current, locale);
    renderedMap.set(attribute, next);
    if (current !== next) element.setAttribute(attribute, next);
  }
  sourceAttributes.set(element, sourceMap);
  renderedAttributes.set(element, renderedMap);
};

const translateTree = (root: Node, locale: Locale) => {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, locale);
    return;
  }
  if (
    !(root instanceof Element) &&
    !(root instanceof DocumentFragment) &&
    !(root instanceof Document)
  )
    return;
  if (root instanceof Element) {
    if (["SCRIPT", "STYLE", "CODE"].includes(root.tagName)) return;
    translateElement(root, locale);
  }
  root.childNodes.forEach((child) => translateTree(child, locale));
};

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? "ru");
  useEffect(() => {
    if (initialLocale) {
      window.localStorage.setItem(localeStorageKey, initialLocale);
      const syncLocale = window.setTimeout(() => setLocaleState(initialLocale), 0);
      return () => window.clearTimeout(syncLocale);
    }
    const stored = window.localStorage.getItem(localeStorageKey);
    const restored = stored === "uk" ? "ua" : stored;
    if (restored !== "ru" && restored !== "en" && restored !== "ua" && restored !== "sk") return;

    const restoreLocale = window.setTimeout(() => setLocaleState(restored), 0);
    return () => window.clearTimeout(restoreLocale);
  }, [initialLocale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    translateTree(document.body, locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTree(mutation.target, locale);
        else if (mutation.type === "attributes") translateTree(mutation.target, locale);
        else mutation.addedNodes.forEach((node) => translateTree(node, locale));
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes,
    });
    return () => observer.disconnect();
  }, [locale]);
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: (next) => {
        window.localStorage.setItem(localeStorageKey, next);
        setLocaleState(next);
      },
      t: (source, params) => translate(source, locale, params),
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
