"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import {
  CalendarDays,
  ChevronRight,
  Globe,
  Info,
  MapPin,
  Menu,
  Search,
  Star,
  UserRound,
  Utensils,
} from "lucide-react";
import { APIError } from "../../../lib/api-client";
import {
  getPublicVenue,
  getPublicVenueMenu,
  type PublicVenue,
  type PublicMenuCategory,
} from "../../../lib/public-catalog-api";
import { localeOptions, useI18n } from "../i18n";

export function VenueHome({
  venueID,
  basePath,
  onSettings,
  onAccount,
}: {
  venueID: string;
  basePath: string;
  onSettings: (page: "menu" | "language") => void;
  onAccount: () => void;
}) {
  const { locale, t } = useI18n();
  const [venue, setVenue] = useState<PublicVenue>();
  const [categories, setCategories] = useState<PublicMenuCategory[]>([]);
  const [error, setError] = useState("");
  const [menuState, setMenuState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getPublicVenue(venueID, controller.signal)
      .then(setVenue)
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof APIError && error.status === 404
              ? "Заведение больше недоступно"
              : "Не удалось загрузить заведение",
          );
      });
    getPublicVenueMenu(venueID, controller.signal)
      .then((menu) => {
        setCategories(menu.filter((category) => category.items.length > 0));
        setMenuState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setMenuState("error");
      });
    return () => controller.abort();
  }, [venueID, retry]);
  const retryLoad = () => {
    setError("");
    setMenuState("loading");
    setRetry((value) => value + 1);
  };
  if (error)
    return (
      <section className="dish-catalog-status" role="alert">
        <strong>{t(error)}</strong>
        <button type="button" className="button secondary" onClick={retryLoad}>
          {t("Повторить")}
        </button>
      </section>
    );
  if (!venue)
    return (
      <section className="dish-catalog-status" role="status">
        {t("Загружаем заведение...")}
      </section>
    );
  const cover = venue.image_url
    ? ({ backgroundImage: `url(${JSON.stringify(venue.image_url)})` } as CSSProperties)
    : undefined;
  return (
    <article className="dish-venue-home" aria-labelledby="dish-venue-name">
      <div className="dish-home-cover" style={cover}>
        {!venue.image_url && <Utensils size={72} aria-hidden="true" />}
        <nav className="dish-home-toolbar" aria-label={t("Меню")}>
          <button
            type="button"
            aria-label={t("Настройки меню")}
            aria-haspopup="dialog"
            onClick={() => onSettings("menu")}
          >
            <Menu size={23} />
          </button>
          <div>
            <button
              type="button"
              className="dish-home-language"
              aria-label={t("Язык интерфейса")}
              aria-haspopup="dialog"
              onClick={() => onSettings("language")}
            >
              <Globe size={19} />
              <span>{localeOptions.find((option) => option.value === locale)?.short}</span>
            </button>
            <Link href={`${basePath}/menu?search=1`} aria-label={t("Поиск по меню")}>
              <Search size={23} />
            </Link>
            <button type="button" aria-label={t("Профиль")} onClick={onAccount}>
              <UserRound size={23} />
            </button>
          </div>
        </nav>
        {venue.logo_url && (
          <div
            className="dish-home-logo"
            style={{ backgroundImage: `url(${JSON.stringify(venue.logo_url)})` }}
            role="img"
            aria-label={venue.name}
          />
        )}
      </div>
      <div className="dish-home-content">
        <header className="dish-home-identity">
          <h1 id="dish-venue-name">{venue.name}</h1>
          <p>{[venue.address, venue.city].filter(Boolean).join(" · ")}</p>
          {venue.cuisine_type && <span>{t(venue.cuisine_type)}</span>}
          {venue.review_count > 0 && (
            <div className="dish-home-rating">
              <Star size={17} fill="currentColor" aria-hidden="true" />
              <strong>{venue.rating.toFixed(1)}</strong>
            </div>
          )}
        </header>
        <div className="dish-home-actions">
          <Link className="dish-home-reserve" href={`${basePath}/reservation`}>
            <CalendarDays size={25} aria-hidden="true" />
            <strong>{t("Забронировать онлайн")}</strong>
            <ChevronRight size={23} aria-hidden="true" />
          </Link>
          <details className="dish-home-info">
            <summary>
              <Info size={24} aria-hidden="true" />
              <strong>{t("Информация о заведении")}</strong>
              <ChevronRight size={23} aria-hidden="true" />
            </summary>
            <div>
              <h2>{t("О месте")}</h2>
              <p>{venue.description || t("Описание заведения пока не добавлено")}</p>
              <p className="dish-home-address">
                <MapPin size={19} aria-hidden="true" />
                {[venue.address, venue.city, venue.country_code].filter(Boolean).join(", ")}
              </p>
              {venue.filters.length > 0 && (
                <ul>
                  {venue.filters.map((filter) => (
                    <li key={filter}>{t(filter)}</li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>
        <section className="dish-home-menu" aria-labelledby="dish-home-menu-title">
          <div className="dish-home-menu-heading">
            <h2 id="dish-home-menu-title">{t("Меню")}</h2>
            <Link href={`${basePath}/menu`}>
              {t("Все")}
              <ChevronRight size={18} />
            </Link>
          </div>
          {menuState === "loading" ? (
            <p role="status">{t("Загружаем меню...")}</p>
          ) : menuState === "error" ? (
            <div role="alert">
              <p>{t("Не удалось загрузить меню")}</p>
              <button type="button" className="button secondary" onClick={retryLoad}>
                {t("Повторить")}
              </button>
            </div>
          ) : categories.length ? (
            <div className="dish-home-categories">
              {categories.map((category) => {
                const photo = category.items.find((item) => item.image_url)?.image_url;
                return (
                  <Link
                    className="dish-home-category"
                    href={`${basePath}/menu?category=${encodeURIComponent(category.id)}`}
                    key={category.id}
                  >
                    <span
                      className="dish-home-category-photo"
                      style={
                        photo ? { backgroundImage: `url(${JSON.stringify(photo)})` } : undefined
                      }
                    >
                      {!photo && <Utensils size={26} aria-hidden="true" />}
                    </span>
                    <strong>{category.name}</strong>
                    <ChevronRight size={24} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p>{t("Меню этого заведения пока недоступно")}</p>
          )}
        </section>
      </div>
    </article>
  );
}
