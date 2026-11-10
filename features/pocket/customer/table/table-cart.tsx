"use client";

import type { Ref } from "react";
import { Minus, Plus, ShoppingBag, Utensils, X } from "lucide-react";
import type { PublicMenuItem } from "../../../../lib/public-catalog-api";
import type { TableContext, TableOrder } from "../../../../lib/table-orders-api";
import type { TipDraft } from "../../../../lib/gratuity";
import { useI18n } from "../../i18n";
import { TipPicker } from "../tip-picker";
import { SlideToConfirm } from "../slide-to-confirm";
import { TableOrderReceipt } from "./table-order-receipt";
import type { Draft } from "./table-draft";

// Contents of the table cart, shown in the side panel and in the mobile cart dialog.
export function TableCart({
  table,
  order,
  draft,
  selected,
  unavailable,
  count,
  subtotal,
  tip,
  total,
  error,
  pending,
  draftLocked,
  mobile,
  cartOpen,
  receiptTitleRef,
  money,
  onClose,
  onQuantityChange,
  onNotesChange,
  onTipChange,
  onSend,
}: {
  table: TableContext;
  order: TableOrder | null;
  draft: Draft;
  selected: PublicMenuItem[];
  // Cart lines whose dishes are no longer on the menu.
  unavailable: string[];
  count: number;
  subtotal: number;
  // null while a custom tip is invalid.
  tip: number | null;
  total: number;
  error: string;
  pending: boolean;
  draftLocked: boolean;
  mobile: boolean;
  cartOpen: boolean;
  receiptTitleRef: Ref<HTMLHeadingElement>;
  money: (amount: number, currency?: string) => string;
  onClose: () => void;
  onQuantityChange: (id: string, delta: number) => void;
  onNotesChange: (notes: string) => void;
  onTipChange: (value: TipDraft) => void;
  onSend: () => void;
}) {
  const { t } = useI18n();
  const cartOptions = table.ordering_enabled && count > 0 && (
    <div className="venue-table-order-options">
      <label className="venue-table-order-notes">
        {t("Комментарий к заказу")}
        <textarea
          aria-label={t("Комментарий к заказу")}
          maxLength={500}
          value={draft.notes}
          disabled={draftLocked}
          onChange={(event) => onNotesChange(event.target.value.slice(0, 500))}
        />
        <small className="comment-character-count">{draft.notes.length}/500</small>
      </label>
      <TipPicker
        value={draft.tip}
        onChange={onTipChange}
        subtotal={subtotal}
        currency={table.currency}
        disabled={draftLocked}
      />
      {!pending && draft.submission && (
        <p role="status">
          {t("Подтверждение заказа ещё не получено. Повторите отправку — заказ не продублируется.")}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
  const cartFooter = table.ordering_enabled && count > 0 && (
    <footer className="venue-table-cart-footer">
      <div className="venue-table-checkout-total">
        <span>{t("Итого")}</span>
        <strong>{tip === null ? "—" : money(total)}</strong>
      </div>
      <SlideToConfirm
        key={JSON.stringify([draft.quantities, draft.tip, draft.notes, total])}
        amount={tip === null ? "—" : money(total)}
        disabled={!draft.submission && (unavailable.length > 0 || tip === null)}
        pending={pending}
        onConfirm={onSend}
      />
      <small>{t("Оплата в заведении")}</small>
    </footer>
  );
  return (
    <>
      <header>
        <div>
          <h2>{t("Ваш заказ")}</h2>
          <p className="venue-table-cart-table">
            <Utensils size={16} aria-hidden="true" />
            {t("Стол {number}", { number: table.table_identifier })}
          </p>
        </div>
        {cartOpen && (
          <button type="button" aria-label={t("Закрыть")} disabled={pending} onClick={onClose}>
            <X size={24} />
          </button>
        )}
      </header>
      <div className="venue-table-cart-body">
        {order && !count && <TableOrderReceipt order={order} titleRef={receiptTitleRef} />}
        {!table.ordering_enabled ? (
          <p role="status">{t("Заказ сейчас недоступен. Обратитесь к сотруднику заведения.")}</p>
        ) : (
          <>
            {selected.length ? (
              <div className="venue-table-cart-items">
                {selected.map((item) => (
                  <article key={item.id}>
                    <div
                      className="venue-table-cart-image"
                      style={
                        item.image_url
                          ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` }
                          : undefined
                      }
                    >
                      {!item.image_url && <Utensils size={20} />}
                    </div>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {money(
                          (draft.submission?.items.find((line) => line.menu_item_id === item.id)
                            ?.expected_price_minor ?? item.price_minor) * draft.quantities[item.id],
                        )}
                      </small>
                    </div>
                    <div className="venue-preorder-cart-quantity">
                      <button
                        type="button"
                        aria-label={`${t("Убрать")} ${item.name}`}
                        disabled={draftLocked}
                        onClick={() => onQuantityChange(item.id, -1)}
                      >
                        <Minus size={16} />
                      </button>
                      <b>{draft.quantities[item.id]}</b>
                      <button
                        type="button"
                        aria-label={`${t("Добавить")} ${item.name}`}
                        disabled={draftLocked || draft.quantities[item.id] >= 30}
                        onClick={() => onQuantityChange(item.id, 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              !order && (
                <div className="venue-table-cart-empty">
                  <ShoppingBag size={36} />
                  <p>{t("Добавьте блюда из меню")}</p>
                </div>
              )
            )}
            {unavailable.map((id) => (
              <p key={id}>
                {t("Блюдо недоступно")}
                <button
                  type="button"
                  disabled={draftLocked}
                  onClick={() => onQuantityChange(id, -30)}
                >
                  {t("Убрать")}
                </button>
              </p>
            ))}
            {!count && error && (
              <p className="form-error" role="alert">
                {t(error)}
              </p>
            )}
          </>
        )}
        {mobile && (
          <>
            {cartOptions}
            {cartFooter}
          </>
        )}
      </div>
      {!mobile && (
        <>
          {cartOptions}
          {cartFooter}
        </>
      )}
    </>
  );
}
