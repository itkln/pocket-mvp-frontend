export type FloorTable = {
  // The table number staff and guests see; the backend keys venue tables by it.
  id: string;
  // The venue table's ID in bookings, bills and Spots, set by the backend on load.
  table_id?: string;
  seats: number;
  x: number;
  y: number;
  state: "free" | "busy" | "reserved";
  // Square unless set; tables for five or more guests are drawn long.
  shape?: "square" | "round";
};
export type FloorFixture = {
  id: string;
  type: "bar" | "window" | "entrance";
  x: number;
  y: number;
  rotation: number;
  size: number;
};
export type VenueFloor = {
  id: string;
  name: string;
  tables: FloorTable[];
  fixtures: FloorFixture[];
};
export type FloorSelection = { kind: "table" | "fixture"; id: string } | null;
export type FloorDragState = {
  target: Exclude<FloorSelection, null>;
  offsetX: number;
  offsetY: number;
  moved?: boolean;
};

export const initialFloors: VenueFloor[] = [
  {
    id: "floor-1",
    name: "1 этаж",
    tables: [],
    fixtures: [],
  },
];

export const normalizeFloorPlan = (value: unknown): VenueFloor[] => {
  if (!Array.isArray(value) || value.length === 0) return initialFloors;
  const floors = value.flatMap((entry, floorIndex) => {
    if (!entry || typeof entry !== "object") return [];
    const floor = entry as Partial<VenueFloor>;
    const normalized: VenueFloor = {
      id: typeof floor.id === "string" && floor.id ? floor.id : `floor-${floorIndex + 1}`,
      name: typeof floor.name === "string" && floor.name ? floor.name : `${floorIndex + 1} этаж`,
      tables: Array.isArray(floor.tables)
        ? floor.tables.filter((table): table is FloorTable =>
            Boolean(
              table &&
              typeof table.id === "string" &&
              typeof table.seats === "number" &&
              typeof table.x === "number" &&
              typeof table.y === "number",
            ),
          )
        : [],
      fixtures: Array.isArray(floor.fixtures)
        ? floor.fixtures
            .filter((fixture): fixture is FloorFixture =>
              Boolean(
                fixture &&
                typeof fixture.id === "string" &&
                ["bar", "window", "entrance"].includes(fixture.type) &&
                typeof fixture.x === "number" &&
                typeof fixture.y === "number",
              ),
            )
            .map((fixture) => ({
              ...fixture,
              rotation: Number.isFinite(fixture.rotation) ? fixture.rotation : 0,
              size: Number.isFinite(fixture.size) ? fixture.size : 100,
            }))
        : [],
    };
    return [normalized];
  });
  return floors.length ? floors : initialFloors;
};

export const fixtureLabel = (type: FloorFixture["type"]) =>
  type === "bar" ? "Бар" : type === "window" ? "Окно" : "Вход";
export const tableCountLabel = (count: number) => {
  const lastTwo = count % 100;
  const last = count % 10;
  const noun =
    last === 1 && lastTwo !== 11
      ? "стол"
      : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
        ? "стола"
        : "столов";
  return `${count} ${noun}`;
};

// How a table is drawn: its size in pixels and the centre of every chair around it, measured
// from the table's top-left corner. Positions on the plan stay the table's top-left corner.
const chairGap = 15;
export const tableGeometry = (table: Pick<FloorTable, "seats" | "shape">) => {
  const seats = Math.max(1, Math.min(12, table.seats));
  if (table.shape === "round") {
    const size = seats <= 2 ? 64 : seats <= 4 ? 76 : seats <= 8 ? 96 : 116;
    const radius = size / 2 + chairGap;
    return {
      width: size,
      height: size,
      round: true,
      chairs: Array.from({ length: seats }, (_, index) => {
        const angle = Math.PI + (index * 2 * Math.PI) / seats;
        return { x: size / 2 + radius * Math.cos(angle), y: size / 2 + radius * Math.sin(angle) };
      }),
    };
  }
  const ends = seats === 1 ? 1 : seats <= 4 || seats >= 8 ? 2 : 0;
  const along = seats <= 2 ? 0 : seats - ends;
  const top = Math.ceil(along / 2);
  const bottom = along - top;
  const width = seats <= 2 ? 64 : top <= 1 ? 76 : 48 + 24 * top;
  const height = seats <= 2 ? 64 : 76;
  const row = (count: number, y: number) =>
    Array.from({ length: count }, (_, index) => ({ x: (width * (index + 1)) / (count + 1), y }));
  return {
    width,
    height,
    round: false,
    chairs: [
      ...(ends >= 1 ? [{ x: -chairGap, y: height / 2 }] : []),
      ...(ends >= 2 ? [{ x: width + chairGap, y: height / 2 }] : []),
      ...row(top, -chairGap),
      ...row(bottom, height + chairGap),
    ],
  };
};
