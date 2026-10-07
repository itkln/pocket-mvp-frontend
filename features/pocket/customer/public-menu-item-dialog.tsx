"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Minus, Plus, Utensils, X } from "lucide-react";
import type { PublicMenuItem } from "../../../lib/public-catalog-api";
import { localeTags, useI18n } from "../i18n";

export function PublicMenuItemDialog({ item, onClose, onAddToPreorder }: {
  item: PublicMenuItem;
  onClose: () => void;
  onAddToPreorder?: (quantity: number) => void;
}) {
  const { locale, t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragStart = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const number = new Intl.NumberFormat(localeTags[locale], { maximumFractionDigits: 2 });
  const nutrients = [
    { value: item.energy_kcal, label: "ккал", unit: "" },
    { value: item.protein_g, label: "белки", unit: t("г") },
    { value: item.fat_g, label: "жиры", unit: t("г") },
    { value: item.carbs_g, label: "углеводы", unit: t("г") },
  ];
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); trigger?.focus(); };
  }, []);

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const distance = event.clientY - dragStart.current;
    dragStart.current = null;
    setDragOffset(0);
    if (distance >= 70) onClose();
  };

  return <dialog ref={dialogRef} className="venue-preorder-product-dialog" aria-label={item.name}
    style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, animation: "none" } : undefined}
    onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <div className="venue-preorder-product-scroll">
      <div className="venue-preorder-product-main">
        <div className="venue-preorder-product-image" role={item.image_url ? "img" : undefined} aria-label={item.image_url ? item.name : undefined} style={item.image_url ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` } : undefined}>{!item.image_url && <Utensils size={50} aria-hidden="true" />}</div>
        <div className="venue-preorder-product-info">
          {item.description && <p>{item.description}</p>}
          <section className="venue-product-nutrition" aria-label={t("Пищевая ценность")}>
            <p>{t("На 100 г")}</p>
            <dl>{nutrients.map(({ value, label, unit }) => <div key={label}><dt>{t(label)}</dt><dd>{value == null ? "—" : number.format(value) + unit}</dd></div>)}</dl>
            {nutrients.every(({ value }) => value == null) && <small>{t("Заведение пока не указало КБЖУ")}</small>}
          </section>
        </div>
      </div>
    </div>
    <div className="venue-preorder-product-handle" aria-hidden="true" title={t("Потяните вниз, чтобы закрыть")}
      onPointerDown={(event) => { dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { if (dragStart.current !== null) setDragOffset(Math.max(0, event.clientY - dragStart.current)); }}
      onPointerUp={endDrag} onPointerCancel={() => { dragStart.current = null; setDragOffset(0); }}><span /></div>
    <button type="button" autoFocus className="venue-preorder-product-close" aria-label={t("Закрыть")} onClick={onClose}><X size={25} /></button>
    <footer className="venue-preorder-product-footer">
      <div className="venue-preorder-product-heading"><h2>{item.name}</h2>{item.portion_weight_g != null && <span>{number.format(item.portion_weight_g)} {t("г")}</span>}<strong>{new Intl.NumberFormat(localeTags[locale], { style: "currency", currency: item.currency }).format(item.price_minor / 100)}</strong></div>
      {onAddToPreorder && <div className="venue-preorder-product-action">
        <div className="venue-preorder-cart-quantity"><button type="button" aria-label={t("Уменьшить количество")} disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)}><Minus size={20} /></button><b>{quantity}</b><button type="button" aria-label={t("Увеличить количество")} disabled={quantity >= 30} onClick={() => setQuantity((value) => value + 1)}><Plus size={20} /></button></div>
        <button type="button" onClick={() => { onAddToPreorder(quantity); onClose(); }}>{t("Добавить")}</button>
      </div>}
    </footer>
  </dialog>;
}
