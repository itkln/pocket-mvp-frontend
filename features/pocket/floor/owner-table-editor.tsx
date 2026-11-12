"use client";

import { useState } from "react";
import { Circle, Copy, Download, Minus, Plus, Square, Trash2 } from "lucide-react";
import { FloorTable } from "./floor-model";
import { useI18n } from "../i18n";

// The selected table in the editor: its number, seats and shape, its QR code, and removing it.
// Every change applies at once; the plan saves by itself.
export function OwnerTableEditor({
  table,
  floorName,
  onSave,
  onDuplicate,
  onDownload,
  onDelete,
}: {
  table: FloorTable;
  floorName: string;
  onSave: (id: string, seats: number, shape: FloorTable["shape"]) => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [tableId, setTableId] = useState(table.id);
  const shape = table.shape ?? "square";
  const applyTableId = () => {
    if (tableId.trim() !== table.id) onSave(tableId, table.seats, shape);
  };
  const setSeats = (seats: number) => onSave(table.id, Math.max(1, Math.min(12, seats)), shape);
  return (
    <section className="floor-card">
      <header>
        <div>
          <h2>{t("Стол {number}", { number: table.id })}</h2>
          <p>
            {floorName} · {t("позиция")} {Math.round(table.x)}% × {Math.round(table.y)}%
          </p>
        </div>
        <button
          type="button"
          className="floor-icon-btn soft"
          aria-label={t("Дублировать")}
          title={t("Дублировать")}
          onClick={onDuplicate}
        >
          <Copy size={19} />
        </button>
      </header>
      <div className="floor-fields">
        <label className="floor-field">
          <span>{t("Номер стола")}</span>
          <input
            value={tableId}
            maxLength={12}
            onChange={(event) => setTableId(event.target.value)}
            onBlur={applyTableId}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>
        <div className="floor-field">
          <span id="floor-seats-label">{t("Количество мест")}</span>
          <div className="floor-stepper-box" role="group" aria-labelledby="floor-seats-label">
            <button
              type="button"
              aria-label={t("Меньше мест")}
              disabled={table.seats <= 1}
              onClick={() => setSeats(table.seats - 1)}
            >
              <Minus size={19} />
            </button>
            <output aria-live="polite">{table.seats}</output>
            <button
              type="button"
              aria-label={t("Больше мест")}
              disabled={table.seats >= 12}
              onClick={() => setSeats(table.seats + 1)}
            >
              <Plus size={19} />
            </button>
          </div>
        </div>
        <div className="floor-field">
          <span id="floor-shape-label">{t("Форма стола")}</span>
          <div className="floor-segment" role="group" aria-labelledby="floor-shape-label">
            <button
              type="button"
              aria-pressed={shape === "square"}
              onClick={() => onSave(table.id, table.seats, "square")}
            >
              <Square size={17} />
              {t("Прямоугольный")}
            </button>
            <button
              type="button"
              aria-pressed={shape === "round"}
              onClick={() => onSave(table.id, table.seats, "round")}
            >
              <Circle size={17} />
              {t("Круглый")}
            </button>
          </div>
        </div>
      </div>
      <div className="floor-card-actions">
        <button type="button" className="floor-btn soft" onClick={onDownload}>
          <Download size={19} />
          {t("Скачать QR-код")}
        </button>
        <button type="button" className="floor-btn danger" onClick={onDelete}>
          <Trash2 size={19} />
          {t("Удалить стол")}
        </button>
      </div>
    </section>
  );
}
