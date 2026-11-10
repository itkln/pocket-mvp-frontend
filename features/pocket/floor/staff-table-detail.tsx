"use client";

import { StatusPill } from "../ui";
import { FloorTable } from "./floor-model";
import { useI18n } from "../i18n";

// Only what the saved floor plan knows about the table. The live bill, waiter and
// open time need a staff endpoint that the backend does not have yet.
export function StaffTableDetail({ table, floorName }: { table: FloorTable; floorName: string }) {
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
      </dl>
    </aside>
  );
}
