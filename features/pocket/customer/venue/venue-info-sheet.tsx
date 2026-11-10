"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type TouchEvent,
} from "react";
import Image from "next/image";
import { Check, MapPin, X } from "lucide-react";
import type { PublicVenue } from "../../../../lib/public-catalog-api";
import { useI18n } from "../../i18n";

// "About the venue": a popover on desktop, a bottom sheet that can be dragged down on mobile.
export function VenueInfoSheet({
  venue,
  photoStyle,
  illustration,
  anchorRef,
  onClose,
}: {
  venue: PublicVenue;
  photoStyle?: CSSProperties;
  illustration: string;
  // The desktop trigger: clicks on it toggle the sheet instead of closing it as "outside".
  anchorRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (window.innerWidth <= 760) closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        window.innerWidth > 760 &&
        !anchorRef.current?.contains(event.target as Node) &&
        !overlayRef.current?.contains(event.target as Node)
      )
        onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [anchorRef, onClose]);

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (window.innerWidth > 760 || event.currentTarget.scrollTop > 0) return;
    const touch = event.touches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchMove = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    const touch = event.touches[0];
    if (!start || !touch || event.currentTarget.scrollTop > 0) return;
    const distance = touch.clientY - start.y;
    if (distance <= 0 || Math.abs(touch.clientX - start.x) > distance) return;
    dragRef.current = Math.min(distance, 320);
    setDragging(true);
    setDrag(dragRef.current);
  };
  const onTouchEnd = () => {
    if (dragRef.current >= 80) onClose();
    touchStart.current = null;
    dragRef.current = 0;
    setDragging(false);
    setDrag(0);
  };

  return (
    <div
      ref={overlayRef}
      className="venue-info-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`venue-info-sheet ${dragging ? "dragging" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-info-title"
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="venue-info-controls">
          <div className="venue-info-handle" aria-hidden="true" />
          <button
            ref={closeRef}
            type="button"
            className="venue-info-close"
            aria-label={t("Закрыть")}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        <h2 id="venue-info-title">{t("Информация о заведении")}</h2>
        <h3>{venue.name}</h3>
        <div className="venue-info-group">
          <strong>{t("Контакты")}</strong>
          <p>
            <MapPin size={18} />
            {venue.address}, {venue.city}, {venue.country_code}
          </p>
        </div>
        <div className="venue-info-group">
          <strong>{t("О месте")}</strong>
          <p>{venue.description || t("Описание заведения пока не добавлено")}</p>
          <div
            className={`venue-about-photo ${venue.image_url ? "has-image" : ""}`}
            style={photoStyle}
            role="img"
            aria-label={t("Фото заведения: {name}", { name: venue.name })}
          >
            {!venue.image_url && (
              <Image
                src={`/assets/categories/${illustration}.png`}
                alt=""
                width={170}
                height={170}
              />
            )}
          </div>
          {venue.filters.length > 0 && (
            <div className="venue-feature-list">
              {venue.filters.map((filter) => (
                <span key={filter}>
                  <Check size={15} />
                  {t(filter)}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
