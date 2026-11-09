"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { apiRequest } from "../../../lib/api-client";
import { type OwnerVenue } from "../../../lib/owner-api";
import { useI18n } from "../i18n";
import { Button, PanelTitle } from "../ui";

export function PublicPageSettings({
  venue,
  notify,
}: {
  venue: OwnerVenue;
  notify: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const [page, setPage] = useState<{ url: string; published: boolean } | null>(null),
    [image, setImage] = useState(""),
    [error, setError] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ url: string; published: boolean }>(
      `/owner/venues/${venue.id}/public-page?locale=${locale}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (result) => {
        const url = new URL(result.url);
        if (
          ["localhost", "127.0.0.1"].includes(url.hostname) &&
          !["localhost", "127.0.0.1"].includes(window.location.hostname)
        )
          url.hostname = window.location.hostname;
        const qr = await QRCode.toDataURL(url.toString(), { width: 256, margin: 2 });
        if (!controller.signal.aborted) {
          setPage({ ...result, url: url.toString() });
          setImage(qr);
          setError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [venue.id, venue.status, locale, revision]);
  const copy = async () => {
    if (!page) return;
    try {
      await navigator.clipboard.writeText(page.url);
      notify(t("Ссылка скопирована"));
    } catch {
      notify(t("Не удалось скопировать ссылку"));
    }
  };
  const download = async () => {
    if (!page) return;
    try {
      const svg = await QRCode.toString(page.url, {
        type: "svg",
        width: 768,
        margin: 2,
        errorCorrectionLevel: "H",
      });
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${venue.slug}-dish-qr.svg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      notify(t("Не удалось скачать QR-код"));
    }
  };
  return (
    <section className="venue-public-page-settings">
      <PanelTitle
        title="Страница и QR"
        subtitle="Публичная страница ресторана в Pocket Dish: меню и бронирование."
      />
      {error ? (
        <div role="alert">
          <p>{t("Не удалось загрузить ссылку")}</p>
          <Button onClick={() => setRevision((value) => value + 1)}>Повторить</Button>
        </div>
      ) : !page ? (
        <p role="status">{t("Загрузка...")}</p>
      ) : (
        <>
          <p>
            {t(
              page.published
                ? "Страница опубликована. Изменения меню и настроек бронирования появятся у гостей."
                : "Страница скрыта. Для публикации выберите статус «Открыто» в основных настройках.",
            )}
          </p>
          <div className="dish-public-link">
            <input aria-label={t("Публичная ссылка")} readOnly value={page.url} />
            <Button kind="secondary" icon={Copy} onClick={() => void copy()}>
              Копировать ссылку
            </Button>
          </div>
          <div className="dish-public-qr">
            {image ? (
              <Image
                unoptimized
                src={image}
                width={180}
                height={180}
                alt={t("QR-код страницы ресторана")}
              />
            ) : (
              <QrCode size={100} />
            )}
            <div>
              <strong>{venue.name}</strong>
              <p>{t("Этот QR открывает меню и бронирование без привязки к столу.")}</p>
              <Button icon={Download} onClick={() => void download()}>
                Скачать QR
              </Button>
            </div>
          </div>
          <a className="button secondary" href={page.url} target="_blank" rel="noreferrer">
            <ExternalLink size={18} />
            {t("Открыть Pocket Dish")}
          </a>
          <p>{t("QR-коды столов находятся в разделе «План зала».")}</p>
        </>
      )}
    </section>
  );
}
