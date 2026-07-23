"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { resolveTableQR } from "../../../../lib/table-orders-api";
import { localeTags, useI18n } from "../../i18n";
import { TableHistoryList } from "./table-history-list";
import { TableOrderReceipt } from "./table-order-receipt";
import { useTableOrderHistory } from "./use-table-order-history";

const noImages = new Map<string, string>();

export function VenueOrderHistoryDialog({
  venueID,
  qrToken,
  onClose,
}: {
  venueID?: string;
  qrToken?: string;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [resolvedVenue, setResolvedVenue] = useState<string>();
  const [resolveError, setResolveError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const history = useTableOrderHistory(venueID ?? resolvedVenue, true, () => setSelectedID(null));
  const selected = history.orders.find((order) => order.id === selectedID);
  useEffect(() => {
    if (venueID || !qrToken) return;
    const controller = new AbortController();
    void resolveTableQR(qrToken, controller.signal)
      .then((table) => {
        if (!controller.signal.aborted) setResolvedVenue(table.venue_id);
      })
      .catch(() => {
        if (!controller.signal.aborted) setResolveError(true);
      });
    return () => controller.abort();
  }, [venueID, qrToken, retry]);
  useEffect(() => {
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    closeRef.current?.focus();
  }, [selectedID]);
  return (
    <dialog
      ref={dialogRef}
      className="venue-table-order-dialog venue-table-history-dialog"
      aria-labelledby="dish-account-order-history"
      onCancel={(event) => {
        event.preventDefault();
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
      <div className="venue-table-order-panel">
        <header>
          {selected && (
            <button
              type="button"
              aria-label={t("Назад к истории заказов")}
              onClick={() => setSelectedID(null)}
            >
              <ArrowLeft size={22} aria-hidden="true" />
            </button>
          )}
          <div>
            <h2 id="dish-account-order-history">{t("История заказов")}</h2>
          </div>
          <button ref={closeRef} type="button" aria-label={t("Закрыть")} onClick={onClose}>
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className="venue-table-cart-body">
          {selected ? (
            <TableOrderReceipt order={selected} />
          ) : (
            <TableHistoryList
              orders={history.orders}
              images={noImages}
              loading={history.loading || (!venueID && !resolvedVenue && !resolveError)}
              error={resolveError || history.error}
              cursor={history.cursor}
              money={(minor, currency = "EUR") =>
                new Intl.NumberFormat(localeTags[locale], { style: "currency", currency }).format(
                  minor / 100,
                )
              }
              onRetry={() => {
                if (resolveError) {
                  setResolveError(false);
                  setRetry((value) => value + 1);
                } else history.refresh();
              }}
              onOpen={setSelectedID}
              onLoadMore={history.loadMore}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}
