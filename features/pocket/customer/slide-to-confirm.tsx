"use client";

import { useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useI18n } from "../i18n";
import { useMobileViewport } from "../use-mobile-viewport";

const inset = 8;
const handleSize = 56;
const completionThreshold = 0.92;
export function SlideToConfirm({
  amount,
  label = "Отправить заказ",
  pendingLabel = "Отправляем заказ...",
  disabled = false,
  pending = false,
  onConfirm,
}: {
  amount?: string;
  label?: string;
  pendingLabel?: string;
  disabled?: boolean;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const mobile = useMobileViewport();
  const hintID = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ pointerID: number; startX: number; distance: number } | null>(null);
  const position = useRef(0);
  const locked = useRef(false);
  const [offset, setOffset] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const busy = pending || confirming;
  const blocked = disabled || busy;

  const reset = () => {
    drag.current = null;
    position.current = 0;
    setDragging(false);
    setOffset(0);
    setProgress(0);
  };
  const confirm = async () => {
    if (blocked || locked.current) return;
    locked.current = true;
    setConfirming(true);
    setOffset(
      Math.max(0, (buttonRef.current?.getBoundingClientRect().width ?? 0) - handleSize - inset * 2),
    );
    setProgress(1);
    try {
      await onConfirm();
    } finally {
      locked.current = false;
      setConfirming(false);
      reset();
    }
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerID !== event.pointerId) return;
    position.current = Math.max(0, Math.min(active.distance, event.clientX - active.startX));
    setOffset(position.current);
    setProgress(position.current / active.distance);
  };

  if (!mobile)
    return (
      <button
        type="button"
        className="button primary dish-click-confirm"
        disabled={blocked}
        aria-label={`${t(busy ? pendingLabel : label)}${amount ? ` · ${amount}` : ""}`}
        aria-busy={busy}
        onClick={() => void confirm()}
      >
        {busy && <LoaderCircle size={22} className="slide-confirm-spinner" aria-hidden="true" />}
        {t(busy ? pendingLabel : label)}
      </button>
    );

  return (
    <button
      ref={buttonRef}
      type="button"
      className="slide-confirm"
      disabled={blocked}
      aria-label={`${t(busy ? pendingLabel : label)}${amount ? ` · ${amount}` : ""}`}
      aria-describedby={hintID}
      aria-busy={busy}
      data-dragging={dragging}
      style={{ "--slide-offset": `${offset}px`, "--slide-progress": progress } as CSSProperties}
      onPointerDown={(event) => {
        if (blocked || locked.current || drag.current || !event.isPrimary || event.button !== 0)
          return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        if (x < inset || x > inset + handleSize || bounds.width <= handleSize + inset * 2) return;
        drag.current = {
          pointerID: event.pointerId,
          startX: event.clientX,
          distance: bounds.width - handleSize - inset * 2,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        const active = drag.current;
        if (!active || active.pointerID !== event.pointerId) return;
        move(event);
        const complete = position.current >= active.distance * completionThreshold;
        drag.current = null;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        if (complete && !blocked) {
          setOffset(active.distance);
          setProgress(1);
          void confirm();
        } else reset();
      }}
      onPointerCancel={reset}
      onLostPointerCapture={() => {
        if (drag.current) reset();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          reset();
        }
      }}
      onClick={(event) => {
        // Native keyboard and assistive-technology activation remain available.
        // Pointer clicks cannot submit; pointer users must complete the drag.
        if (event.detail === 0 && !drag.current) void confirm();
      }}
    >
      <span className="slide-confirm-fill" aria-hidden="true" />
      <span className="slide-confirm-copy" data-busy={busy} aria-hidden="true">
        <strong>{t(busy ? pendingLabel : label)}</strong>
        <span>{t("Сдвиньте для подтверждения")}</span>
      </span>
      <span className="slide-confirm-handle" aria-hidden="true">
        {busy ? (
          <LoaderCircle size={25} className="slide-confirm-spinner" />
        ) : (
          <ArrowRight size={27} />
        )}
      </span>
      <span className="slide-confirm-a11y" id={hintID}>
        {t("Перетащите стрелку вправо. С клавиатуры нажмите Enter или пробел.")}
      </span>
    </button>
  );
}
