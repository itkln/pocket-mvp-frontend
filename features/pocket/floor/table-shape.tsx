import type { CSSProperties, ReactNode } from "react";
import { tableGeometry, type FloorTable } from "./floor-model";

// The drawing of one table: its top with a label, and a chair for every seat. The parent is the
// positioned button; `taken` chairs are filled to show how many guests sit at the table.
export function TableShape({
  table,
  taken = 0,
  children,
}: {
  table: Pick<FloorTable, "seats" | "shape">;
  taken?: number;
  children: ReactNode;
}) {
  const { chairs, round } = tableGeometry(table);
  return (
    <>
      {chairs.map((chair, index) => (
        <i
          key={index}
          className={`floor-chair ${index < taken ? "taken" : ""}`}
          style={{ left: chair.x, top: chair.y }}
          aria-hidden="true"
        />
      ))}
      <span className={`floor-table-top ${round ? "round" : ""}`}>{children}</span>
    </>
  );
}

export const tableStyle = (table: FloorTable): CSSProperties => {
  const { width, height } = tableGeometry(table);
  return { left: `${table.x}%`, top: `${table.y}%`, width, height };
};
