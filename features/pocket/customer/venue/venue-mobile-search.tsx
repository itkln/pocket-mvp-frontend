"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CalendarDays, Search, X } from "lucide-react";
import { useI18n } from "../../i18n";
import type { MenuState } from "./use-public-venue";

// Full-screen menu search on mobile. `results` renders the matching dishes.
export function VenueMobileSearch({
  query,
  onQueryChange,
  onCancel,
  searching,
  menu,
  results,
  bookingUnavailable,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onCancel: () => void;
  // True once the trimmed query is not empty.
  searching: boolean;
  menu: MenuState;
  results: ReactNode | null;
  bookingUnavailable: boolean;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="venue-mobile-search" role="search" aria-label={t("Поиск по меню")}>
      <div className="venue-mobile-search-bar">
        <Search size={20} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("Поиск по меню")}
          aria-label={t("Поиск по меню")}
        />
        {query && (
          <button
            type="button"
            className="venue-search-clear"
            aria-label={t("Очистить поиск")}
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
          >
            <X size={18} />
          </button>
        )}
        <button type="button" className="venue-search-cancel" onClick={onCancel}>
          {t("Отменить")}
        </button>
      </div>
      <div className="venue-search-results" aria-live="polite">
        {!searching ? (
          <h2>{t("Что будем искать?")}</h2>
        ) : menu.loading ? (
          <p>{t("Загружаем меню...")}</p>
        ) : menu.error ? (
          <p>{t("Не удалось загрузить меню")}</p>
        ) : results ? (
          results
        ) : (
          <div className="venue-search-no-results">
            <Search size={28} />
            <h2>{t("Ничего не нашли")}</h2>
            <p>{t("Попробуйте другое название блюда")}</p>
          </div>
        )}
      </div>
      {bookingUnavailable && (
        <div className="venue-mobile-booking-status" role="status">
          <span>
            <CalendarDays size={16} />
            {t("Бронирование пока недоступно")}
          </span>
        </div>
      )}
    </div>
  );
}
