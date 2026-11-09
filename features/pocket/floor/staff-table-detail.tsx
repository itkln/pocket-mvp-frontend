"use client";

import { Ellipsis, UserRound } from "lucide-react";
import { Button, IconButton, StatusPill } from "../ui";
import { FloorTable } from "./floor-model";

export function StaffTableDetail({
  table,
  floorName,
  notify,
}: {
  table: FloorTable;
  floorName: string;
  notify: (message: string) => void;
}) {
  return (
    <aside className="panel table-detail">
      <div className="detail-heading">
        <div>
          <small>{floorName.toUpperCase()} · СТОЛ</small>
          <h2>{table.id}</h2>
        </div>
        <IconButton icon={Ellipsis} label="Действия" />
      </div>
      <StatusPill
        status={
          table.state === "busy" ? "Занят" : table.state === "reserved" ? "Бронь" : "Свободен"
        }
      />
      <dl>
        <div>
          <dt>Мест</dt>
          <dd>{table.seats}</dd>
        </div>
        <div>
          <dt>Официант</dt>
          <dd>София М.</dd>
        </div>
        <div>
          <dt>Текущий счет</dt>
          <dd>{table.state === "busy" ? "€76.50" : "—"}</dd>
        </div>
        <div>
          <dt>Открыт</dt>
          <dd>{table.state === "busy" ? "38 мин" : "—"}</dd>
        </div>
      </dl>
      {table.state === "busy" && (
        <div className="mini-order">
          <p>
            <span>Тальятелле</span>
            <b>2</b>
          </p>
          <p>
            <span>Буррата</span>
            <b>1</b>
          </p>
          <p>
            <span>Красный апельсин</span>
            <b>3</b>
          </p>
        </div>
      )}
      <Button
        className="full"
        kind="quiet"
        icon={UserRound}
        onClick={() => notify("Официант назначен")}
      >
        Назначить официанта
      </Button>
    </aside>
  );
}
