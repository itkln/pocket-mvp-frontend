"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { apiRequest } from "../../../lib/api-client";
import { useI18n } from "../i18n";
import { BookingPicker, type BookingService } from "./booking-picker";
type Service = BookingService & { description: string };
export function ServiceBooking({ venueID, venueName, query = "" }: { venueID: string; venueName?: string; query?: string }) {
  const { locale, t } = useI18n();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState("");
  const selected = services.find(item => item.id === selectedID);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{services: Service[]}>(`/public/venues/${venueID}/services`, {signal: controller.signal, cache: "no-store"}).then(result => { setServices(result.services); setError(false); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [venueID, revision]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  const categories = [...new Set(services.map(item => item.category_name || t("Услуги")))];
  const close = () => { setOpen(false); setRevision(value => value + 1); };
  return <section className="service-booking service-catalog" aria-label={t("Услуги")}>
    <div className="venue-public-category-sticky-shell"><nav className="venue-section-nav venue-public-category-nav" aria-label={t("Категории меню")}>
      {categories.map((category, index) => <button type="button" key={category} className={(active || categories[0]) === category ? "active" : ""} onClick={() => { setActive(category); document.getElementById(`service-category-${index}`)?.scrollIntoView({behavior: "smooth", block: "start"}); }}>{category}</button>)}
    </nav></div>
    <div className="venue-public-menu-content">{categories.map((category, index) => <section id={`service-category-${index}`} className="venue-public-menu-category" key={category}><h2>{category}</h2><div className="venue-public-menu-grid venue-public-menu-list service-menu-list">{services.filter(item => (item.category_name || t("Услуги")) === category && `${item.name} ${item.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(item => <button type="button" key={item.id} aria-pressed={selectedID === item.id} className={`venue-public-menu-card ${selectedID === item.id ? "selected" : ""}`} onClick={() => setSelectedID(selectedID === item.id ? "" : item.id)}><span className="venue-public-menu-copy"><h3>{item.name}</h3><p>{item.description}</p><small>{item.duration_minutes} {t("мин")}</small><strong>{new Intl.NumberFormat(locale, {style: "currency", currency: item.currency}).format(item.price_minor / 100)}</strong></span></button>)}</div></section>)}</div>
    {error && <div role="alert"><p>{t("Не удалось загрузить услуги")}</p><button type="button" onClick={() => setRevision(value => value + 1)}>{t("Повторить")}</button></div>}
    {selected && <div className={`venue-mobile-booking-cta service-booking-cta ${open ? "booking-open" : ""}`}><button type="button" className="venue-mobile-booking-primary" onClick={() => setOpen(true)}>{t("Забронировать онлайн")}</button></div>}
    {open && selected && <dialog ref={dialog} className="service-booking-dialog venue-public-booking-shell open" onCancel={close}><button type="button" className="venue-mobile-booking-close" aria-label={t("Закрыть")} onClick={close}><X size={24}/></button><BookingPicker venueID={venueID} venueName={venueName} service={selected} onClose={close}/></dialog>}
  </section>;
}
