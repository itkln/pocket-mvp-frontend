"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Utensils, X } from "lucide-react";
import type { PublicMenuItem } from "../../../lib/public-catalog-api";
import { useI18n } from "../i18n";

export function PublicMenuItemDialog({ item, onClose, onAddToPreorder }: {
  item: PublicMenuItem;
  onClose: () => void;
  onAddToPreorder?: (quantity: number) => void;
}) {
  const { locale, t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); trigger?.focus(); };
  }, []);

  return <dialog ref={dialogRef} className="venue-preorder-product-dialog" aria-label={item.name} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <button type="button" className="venue-preorder-product-close" aria-label={t("Закрыть")} onClick={onClose}><X size={23} /></button>
    <div className="venue-preorder-product-main">
      <div className="venue-preorder-product-image" role={item.image_url ? "img" : undefined} aria-label={item.image_url ? item.name : undefined} style={item.image_url ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` } : undefined}>{!item.image_url && <Utensils size={50} aria-hidden="true" />}</div>
      <div className="venue-preorder-product-info"><h2>{item.name}</h2><strong>{new Intl.NumberFormat(locale, { style: "currency", currency: item.currency }).format(item.price_minor / 100)}</strong>
        {onAddToPreorder && <div className="venue-preorder-product-action"><div className="venue-preorder-cart-quantity"><button type="button" aria-label={t("Уменьшить количество")} disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)}><Minus size={18} /></button><b>{quantity}</b><button type="button" aria-label={t("Увеличить количество")} disabled={quantity >= 30} onClick={() => setQuantity((value) => value + 1)}><Plus size={18} /></button></div><button type="button" onClick={() => { onAddToPreorder(quantity); onClose(); }}>{t("Добавить")}</button></div>}
      </div>
    </div>
    {item.description && <p>{item.description}</p>}
  </dialog>;
}
