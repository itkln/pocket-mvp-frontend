"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { Download, QrCode, RefreshCw, X } from "lucide-react";
import { issueTableQR, type TableQRCode } from "../../../lib/table-orders-api";
import { useI18n } from "../i18n";
import { Button, IconButton } from "../ui";
import { FloorTable } from "./floor-model";
import { localQRCode, downloadTableQr } from "./table-qr";

export function QrCodesDialog({
  venueID,
  venueName,
  tables: qrTables,
  onClose,
  notify,
}: {
  venueID?: string;
  venueName: string;
  tables: FloorTable[];
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const { t } = useI18n();
  const [codes, setCodes] = useState<Record<string, TableQRCode & { image: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const tableIDs = qrTables.map((table) => table.id).join("\n");
  useEffect(() => {
    let active = true;
    if (!venueID) return;
    Promise.all(
      tableIDs
        .split("\n")
        .filter(Boolean)
        .map(async (id) => {
          const qr = localQRCode(await issueTableQR(venueID, id));
          return [
            id,
            { ...qr, image: await QRCode.toDataURL(qr.url, { width: 256, margin: 1 }) },
          ] as const;
        }),
    )
      .then((entries) => {
        if (active) setCodes(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active)
          setError("Не удалось загрузить QR-коды. Сохраните план зала и попробуйте снова.");
      });
    return () => {
      active = false;
    };
  }, [venueID, tableIDs]);
  const regenerate = async (tableId: string) => {
    if (!venueID || busy) return;
    setBusy(tableId);
    setError("");
    try {
      const qr = localQRCode(await issueTableQR(venueID, tableId, true));
      const image = await QRCode.toDataURL(qr.url, { width: 256, margin: 1 });
      setCodes((current) => ({ ...current, [tableId]: { ...qr, image } }));
      notify(`QR-код стола ${tableId} перегенерирован`);
    } catch {
      setError("Не удалось загрузить QR-коды. Сохраните план зала и попробуйте снова.");
    } finally {
      setBusy(null);
    }
  };
  const download = (tableId: string) => {
    void downloadTableQr(venueName, tableId, venueID, codes[tableId])
      .then(() => notify(`QR-код стола ${tableId} скачан`))
      .catch(() => notify("Не удалось скачать QR-код"));
  };
  return (
    <div className="preview-backdrop" onMouseDown={onClose}>
      <section className="qr-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">{t("QR-КОДЫ СТОЛОВ")}</p>
            <h2>{venueName}</h2>
            <p>
              {t(
                "После сканирования гость увидит меню, а заказ и счет автоматически привяжутся к выбранному столу. Перегенерация отключает прежний код.",
              )}
            </p>
          </div>
          <IconButton icon={X} label={t("Закрыть QR-коды")} onClick={onClose} />
        </header>
        {error && (
          <p className="form-error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="qr-grid">
          {qrTables.map((table) => {
            const qr = codes[table.id];
            return (
              <article key={table.id}>
                <div className="qr-symbol">
                  {qr ? (
                    <Image
                      unoptimized
                      src={qr.image}
                      width={144}
                      height={144}
                      alt={t("QR-код стола {number}", { number: table.id })}
                    />
                  ) : (
                    <QrCode size={72} strokeWidth={1.4} />
                  )}
                </div>
                <div>
                  <strong>
                    {t("Стол")} {table.id}
                  </strong>
                  <span>
                    {table.seats} {t("места")}
                    {qr && ` · ${t("Версия {number}", { number: qr.version })}`}
                  </span>
                  {qr && (
                    <a href={qr.url} target="_blank" rel="noreferrer">
                      {t("Открыть меню стола")}
                    </a>
                  )}
                </div>
                <div className="qr-card-actions">
                  <button
                    type="button"
                    className="icon-button"
                    disabled={!qr || Boolean(busy)}
                    aria-label={`Перегенерировать QR-код стола ${table.id}`}
                    onClick={() => void regenerate(table.id)}
                  >
                    <RefreshCw size={19} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={!qr || Boolean(busy)}
                    aria-label={`Скачать QR-код стола ${table.id}`}
                    onClick={() => download(table.id)}
                  >
                    <Download size={19} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <footer>
          <p>{t("Напечатайте коды и разместите их на соответствующих столах.")}</p>
          <div>
            <Button kind="secondary" onClick={onClose}>
              {t("Закрыть")}
            </Button>
            <Button
              icon={Download}
              disabled={Boolean(busy) || Object.keys(codes).length !== qrTables.length}
              onClick={() => {
                void Promise.all(
                  qrTables.map((table) =>
                    downloadTableQr(venueName, table.id, venueID, codes[table.id]),
                  ),
                ).catch(() => notify(t("Не удалось скачать QR-коды")));
              }}
            >
              {t("Скачать все")}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}
