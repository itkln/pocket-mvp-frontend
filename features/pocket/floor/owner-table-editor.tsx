"use client";

import { useState } from "react";
import { Download, Table2, Trash2 } from "lucide-react";
import { Button, Field } from "../ui";
import { FloorTable } from "./floor-model";

export function OwnerTableEditor({
  table,
  floorName,
  onSave,
  onDownload,
  onDelete,
}: {
  table: FloorTable;
  floorName: string;
  onSave: (id: string, seats: number) => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [tableId, setTableId] = useState(table.id);
  const [seats, setSeats] = useState(table.seats);
  const applyTableId = () => {
    if (tableId.trim() !== table.id) onSave(tableId, seats);
  };
  return (
    <aside className="panel table-detail technical-detail">
      <div className="detail-heading">
        <div>
          <small>{floorName.toUpperCase()} · СТОЛ</small>
          <h2>{table.id}</h2>
        </div>
        <Table2 size={22} />
      </div>
      <div className="table-editor-fields">
        <Field label="Номер стола">
          <input
            value={tableId}
            maxLength={12}
            onChange={(event) => setTableId(event.target.value)}
            onBlur={applyTableId}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </Field>
        <Field label="Количество мест">
          <select
            value={seats}
            onChange={(event) => {
              const nextSeats = Number(event.target.value);
              setSeats(nextSeats);
              onSave(tableId, nextSeats);
            }}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <p className="technical-position">
          Позиция: {Math.round(table.x)}% × {Math.round(table.y)}%
        </p>
      </div>
      <Button className="full" kind="secondary" icon={Download} onClick={onDownload}>
        Скачать QR-код
      </Button>
      <Button className="full" kind="danger" icon={Trash2} onClick={onDelete}>
        Удалить стол
      </Button>
    </aside>
  );
}
