export type FloorTable = {
  id: string;
  seats: number;
  x: number;
  y: number;
  state: "free" | "busy" | "reserved";
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
