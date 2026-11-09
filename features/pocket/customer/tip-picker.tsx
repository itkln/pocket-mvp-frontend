"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { X } from "lucide-react";
import { tipAmount, tipSelection, type TipDraft } from "../../../lib/gratuity";
import { localeTags, useI18n } from "../i18n";

const percentages = [0, 5, 10, 15];

export function TipPicker({
  value,
  onChange,
  subtotal,
  currency,
  disabled = false,
}: {
  value: TipDraft;
  onChange: (value: TipDraft) => void;
  subtotal: number;
  currency: string;
  disabled?: boolean;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const amount = tipAmount(subtotal, tipSelection(value));
  const money = new Intl.NumberFormat(localeTags[locale], { style: "currency", currency });

  return (
    <fieldset className="spots-tip-picker" disabled={disabled} aria-label={t("Чаевые")}>
      <legend className="spots-tip-input-label">{t("Чаевые")}</legend>
      <div className="spots-tip-heading">
        <div>
          <h3>{t("Оставить чаевые официанту?")}</h3>
          <p>{t("По желанию. Сумма добавится к заказу.")}</p>
        </div>
      </div>
      <div className="spots-tip-options">
        {percentages.map((percent) => (
          <button
            key={percent}
            type="button"
            aria-label={percent === 0 ? t("Нет") : `${percent}%`}
            aria-pressed={
              percent === 0
                ? value.mode === "none"
                : value.mode === "percent" && value.percent === percent
            }
            onClick={() =>
              onChange(percent === 0 ? { mode: "none" } : { mode: "percent", percent })
            }
          >
            <strong aria-hidden="true">{percent === 0 ? t("Нет") : `${percent}%`}</strong>
            {percent > 0 && (
              <span aria-hidden="true">
                {money.format((tipAmount(subtotal, { mode: "percent", percent }) ?? 0) / 100)}
              </span>
            )}
          </button>
        ))}
        <button
          ref={triggerRef}
          type="button"
          className="spots-tip-other"
          aria-label={t("Другая сумма")}
          aria-pressed={value.mode === "custom"}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <strong>{t("Другая сумма")}</strong>
          {value.mode === "custom" && amount !== null && <span>{money.format(amount / 100)}</span>}
        </button>
      </div>
      {open && (
        <TipForm
          triggerRef={triggerRef}
          value={value}
          subtotal={subtotal}
          currency={currency}
          onClose={() => setOpen(false)}
          onSave={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      )}
    </fieldset>
  );
}

function TipForm({
  triggerRef,
  value,
  subtotal,
  currency,
  onSave,
  onClose,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  value: TipDraft;
  subtotal: number;
  currency: string;
  onSave: (value: TipDraft) => void;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [customValue, setCustomValue] = useState(value.mode === "custom" ? value.value : "");
  const draft: TipDraft = { mode: "custom", value: customValue };
  const amount = tipAmount(subtotal, tipSelection(draft));
  const invalid = amount === null;
  const showError = invalid && customValue.length > 0;
  const money = new Intl.NumberFormat(localeTags[locale], { style: "currency", currency });
  const symbol = money.formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      trigger?.focus();
    };
  }, [triggerRef]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, []);

  const save = () => {
    if (!invalid) onSave(draft);
  };

  return (
    <dialog
      ref={dialogRef}
      className="spots-tip-dialog"
      aria-labelledby={`${id}-title`}
      onKeyDown={(event) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <div className="spots-tip-form-heading">
        <h2 id={`${id}-title`}>{t("Сумма чаевых")}</h2>
        <button
          type="button"
          className="spots-tip-close"
          aria-label={t("Закрыть")}
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <label className="spots-tip-custom" htmlFor={id}>
        <span className="spots-tip-input-label">
          {t("Сумма чаевых")} · {currency}
        </span>
        <span aria-hidden="true">{symbol}</span>
        <input
          ref={inputRef}
          autoFocus
          style={{ width: `${Math.max(4, Math.min(10, customValue.length))}ch` }}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          maxLength={32}
          placeholder="0,00"
          value={customValue}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
          onChange={(event) => setCustomValue(event.target.value)}
        />
      </label>
      {showError && (
        <p className="spots-tip-error" id={`${id}-error`} role="alert">
          {t("Введите корректную сумму чаевых, не более двух знаков после запятой")}
        </p>
      )}
      <button
        type="button"
        className="button primary spots-tip-save"
        disabled={invalid}
        onClick={save}
      >
        {t("Сохранить")}
      </button>
    </dialog>
  );
}

export function TipBreakdown({
  subtotal,
  tip,
  currency,
}: {
  subtotal: number;
  tip: number;
  currency: string;
}) {
  const { locale, t } = useI18n();
  const money = (minor: number) =>
    new Intl.NumberFormat(localeTags[locale], { style: "currency", currency }).format(minor / 100);
  if (!tip) return null;
  return (
    <div className="spots-tip-breakdown">
      <div>
        <span>{t("Блюда")}</span>
        <strong>{money(subtotal)}</strong>
      </div>
      <div>
        <span>{t("Чаевые")}</span>
        <strong>{money(tip)}</strong>
      </div>
    </div>
  );
}
