"use client";

import { Ellipsis, UserRound } from "lucide-react";
import { Button, IconButton, StatusPill } from "../ui";
import { FloorTable } from "./floor-model";
import { useI18n } from "../i18n";

export function StaffTableDetail({
  table,
  floorName,
  notify,
}: {
  table: FloorTable;
  floorName: string;
  notify: (message: string) => void;
}) {
  const { t } = useI18n();
  return (
    <aside className="panel table-detail">
      <div className="detail-heading">
        <div>
          <small>
            {floorName.toUpperCase()} {t("· СТОЛ")}
          </small>
          <h2>{table.id}</h2>
        </div>
        <IconButton icon={Ellipsis} label={t("Действия")} />
      </div>
      <StatusPill
        status={
          table.state === "busy" ? "Занят" : table.state === "reserved" ? "Бронь" : "Свободен"
        }
      />
      <dl>
        <div>
          <dt>{t("Мест")}</dt>
          <dd>{table.seats}</dd>
        </div>
        <div>
          <dt>{t("Официант")}</dt>
          <dd>{t("София М.")}</dd>
        </div>
        <div>
          <dt>{t("Текущий счет")}</dt>
          <dd>{table.state === "busy" ? "€76.50" : "—"}</dd>
        </div>
        <div>
          <dt>{t("Открыт")}</dt>
          <dd>{table.state === "busy" ? t("38 мин") : "—"}</dd>
        </div>
      </dl>
      {table.state === "busy" && (
        <div className="mini-order">
          <p>
            <span>{t("Тальятелле")}</span>
            <b>2</b>
          </p>
          <p>
            <span>{t("Буррата")}</span>
            <b>1</b>
          </p>
          <p>
            <span>{t("Красный апельсин")}</span>
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
        {t("Назначить официанта")}
      </Button>
    </aside>
  );
}
