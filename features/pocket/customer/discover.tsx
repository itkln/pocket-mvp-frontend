"use client";

import { ArrowRight, CalendarDays, Heart, Search, Star } from "lucide-react";
import { Button, IconButton, PanelTitle } from "../ui";

export function DiscoverScreen({ onVenue }: { onVenue: () => void }) {
  return <><section className="discover-hero"><div className="discover-copy"><p className="eyebrow">Братислава · рядом с вами</p><h1>Куда пойдем сегодня?</h1><p>Откройте стол, закажите заранее или забронируйте вечер.</p><label className="discover-search"><Search size={20} /><input placeholder="Ресторан, кухня или район" /><Button>Найти</Button></label><div className="quick-filters"><button>Открыто сейчас</button><button>Стол сегодня</button><button>До 2 км</button></div></div><div className="hero-food" /></section><section className="discover-section"><PanelTitle title="Рядом с вами" subtitle="Подобрано по вашим предпочтениям" action={<Button kind="quiet">Смотреть все <ArrowRight size={16} /></Button>} /><div className="venue-grid"><VenueCard name="North & Vine" meta="Современная европейская · 0.8 км" rating="4.8" tag="Стол через 20 мин" position="0% 0%" onClick={onVenue} /><VenueCard name="Casa Forma" meta="Итальянская · 1.2 км" rating="4.7" tag="Заказ навынос" position="50% 0%" onClick={onVenue} /><VenueCard name="Mizu Table" meta="Японская · 1.7 км" rating="4.9" tag="Есть места" position="100% 0%" onClick={onVenue} /></div></section><section className="discover-section"><PanelTitle title="Сохраненные места" /><div className="saved-row"><div className="saved-image" /><div><strong>Ваш любимый стол в North & Vine</strong><p>Стол 08 · у окна · до 6 гостей</p></div><Button kind="secondary" icon={CalendarDays} onClick={onVenue}>Забронировать</Button></div></section></>;
}

export function VenueCard({ name, meta, rating, tag, position, onClick }: { name: string; meta: string; rating: string; tag: string; position: string; onClick: () => void }) {
  return <article className="venue-card"><div className="venue-card-image" style={{ backgroundPosition: position }}><span>{tag}</span><IconButton icon={Heart} label="В избранное" /></div><button className="venue-card-copy" onClick={onClick}><h3>{name}</h3><p>{meta}</p><b><Star size={14} fill="currentColor" />{rating}</b></button></article>;
}


