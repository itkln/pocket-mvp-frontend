"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Building2,
  ChevronDown,
  Circle,
  DoorOpen,
  Magnet,
  Minus,
  PanelsTopLeft,
  Plus,
  QrCode,
  Redo2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Square,
  Trash2,
  Undo2,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react";
import { getFloorPlan, saveFloorPlan } from "../../lib/owner-api";
import {
  releaseTable,
  seatReservation,
  seatWalkIn,
  type LiveBooking,
  type LiveFloor,
} from "../../lib/floor-api";
import { useConfirm } from "./confirm-dialog";
import { localeTags, useI18n } from "./i18n";
import { useLocalizedError } from "./error-message";
import { IconButton, PageHeader } from "./ui";
import {
  FloorTable,
  FloorFixture,
  VenueFloor,
  FloorSelection,
  FloorDragState,
  initialFloors,
  tableGeometry,
  normalizeFloorPlan,
  fixtureLabel,
  tableCountLabel,
} from "./floor/floor-model";
import { downloadTableQr } from "./floor/table-qr";
import { OwnerTableEditor } from "./floor/owner-table-editor";
import { QrCodesDialog } from "./floor/qr-codes-dialog";
import { TableShape, tableStyle } from "./floor/table-shape";
import { useLiveFloor } from "./floor/use-live-floor";
import {
  BookingList,
  LiveTableCard,
  durationLabel,
  minutesBetween,
  stateLabel,
} from "./floor/live-side";

const fixtureIcons: Record<FloorFixture["type"], LucideIcon> = {
  bar: Wine,
  window: PanelsTopLeft,
  entrance: DoorOpen,
};
type PaletteItem = {
  kind: "table" | "round" | FloorFixture["type"];
  label: string;
  icon: LucideIcon;
};
const palette: PaletteItem[] = [
  { kind: "table", label: "Стол", icon: Square },
  { kind: "round", label: "Круглый стол", icon: Circle },
  { kind: "bar", label: "Бар", icon: Wine },
  { kind: "window", label: "Окно", icon: PanelsTopLeft },
  { kind: "entrance", label: "Вход", icon: DoorOpen },
];
const historyLimit = 50;
// Ids of floors and fixtures the user adds; only called from event handlers.
const newId = (prefix: string) => `${prefix}-${Date.now()}`;

type FloorView = "live" | "edit";

// The venue floor. "Зал" is the working view: who sits where, today's bookings, seating guests.
// "Редактор" arranges tables, fixtures and floors and gives every table its QR code; it saves by
// itself and keeps an undo history for the session.
export function FloorPlan({
  venueID,
  venueName,
  notify,
  initialView = "live",
}: {
  venueID?: string;
  venueName: string;
  notify: (message: string) => void;
  initialView?: FloorView;
}) {
  const { confirm } = useConfirm();
  const { t, locale } = useI18n();
  const errorMessage = useLocalizedError();
  const [view, setView] = useState<FloorView>(initialView);
  const [floors, setFloors] = useState<VenueFloor[]>(initialFloors);
  const [activeFloorId, setActiveFloorId] = useState(initialFloors[0].id);
  const [selected, setSelected] = useState<FloorSelection>(null);
  const [dragging, setDragging] = useState<FloorSelection>(null);
  const [zoom, setZoom] = useState(100);
  const [snap, setSnap] = useState(true);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [showQrCodes, setShowQrCodes] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(Boolean(venueID));
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [seating, setSeating] = useState(false);
  const draggingRef = useRef<FloorDragState | null>(null);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const saveRequestRef = useRef(0);
  const historyRef = useRef<{ past: VenueFloor[][]; future: VenueFloor[][] }>({
    past: [],
    future: [],
  });
  const activeFloor = floors.find((floor) => floor.id === activeFloorId) ?? floors[0];
  const selectedTable =
    selected?.kind === "table"
      ? activeFloor.tables.find((table) => table.id === selected.id)
      : undefined;
  const selectedFixture =
    selected?.kind === "fixture"
      ? activeFloor.fixtures.find((fixture) => fixture.id === selected.id)
      : undefined;
  // The side column always shows a table: the chosen one, or the first of the floor.
  const shownTable = selectedTable ?? (selectedFixture ? undefined : activeFloor.tables[0]);

  const reportLiveError = useCallback(
    (error: unknown) => notify(errorMessage(error, "Не удалось загрузить состояние зала")),
    [errorMessage, notify],
  );
  const live = useLiveFloor(venueID, view === "live", reportLiveError);
  const liveTables = useMemo(
    () => new Map((live.floor?.tables ?? []).map((table) => [table.identifier, table])),
    [live.floor],
  );
  const bookings = useMemo(
    () => new Map((live.floor?.bookings ?? []).map((booking) => [booking.id, booking])),
    [live.floor],
  );
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTags[locale], {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: live.floor?.timezone,
      }),
    [live.floor?.timezone, locale],
  );
  const formatTime = useCallback(
    (value: string) => timeFormat.format(new Date(value)),
    [timeFormat],
  );

  useEffect(() => {
    if (!venueID) return;
    let active = true;
    dirtyRef.current = false;
    revisionRef.current = 0;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setDirty(false);
      void getFloorPlan<unknown>(venueID)
        .then((stored) => {
          if (!active || dirtyRef.current) return;
          const restoredFloors = normalizeFloorPlan(stored);
          setFloors(restoredFloors);
          setActiveFloorId(restoredFloors[0].id);
          setSelected(null);
        })
        .catch((error) => {
          if (active) notify(errorMessage(error, "Не удалось загрузить план зала"));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [errorMessage, venueID, notify]);

  const markChanged = () => {
    dirtyRef.current = true;
    revisionRef.current += 1;
    setDirty(true);
  };
  // record=false continues the change already in the history (the rest of a drag).
  const updateFloors = (update: (floors: VenueFloor[]) => VenueFloor[], record = true) => {
    if (record) {
      const steps = historyRef.current;
      steps.past = [...steps.past.slice(1 - historyLimit), floors];
      steps.future = [];
      setHistory({ undo: steps.past.length, redo: 0 });
    }
    markChanged();
    setFloors(update);
  };
  const travel = (direction: "undo" | "redo") => {
    const steps = historyRef.current;
    const [from, to] =
      direction === "undo" ? [steps.past, steps.future] : [steps.future, steps.past];
    const next = from.pop();
    if (!next) return;
    to.push(floors);
    setHistory({ undo: steps.past.length, redo: steps.future.length });
    markChanged();
    setFloors(next);
    if (!next.some((floor) => floor.id === activeFloorId)) setActiveFloorId(next[0].id);
  };
  const persistFloorPlan = useCallback(
    async (plan: VenueFloor[], revision: number) => {
      if (!venueID || loading) return;
      const request = ++saveRequestRef.current;
      setSaving(true);
      try {
        await saveFloorPlan(venueID, plan);
        if (revisionRef.current === revision) {
          dirtyRef.current = false;
          setDirty(false);
        }
      } catch (error) {
        if (request === saveRequestRef.current) {
          notify(errorMessage(error, "Не удалось сохранить план зала"));
        }
      } finally {
        if (request === saveRequestRef.current) setSaving(false);
      }
    },
    [errorMessage, loading, notify, venueID],
  );

  useEffect(() => {
    if (!venueID || loading || !dirty || dragging) return;
    const plan = floors;
    const revision = revisionRef.current;
    const timeout = window.setTimeout(() => void persistFloorPlan(plan, revision), 900);
    return () => window.clearTimeout(timeout);
  }, [dirty, dragging, floors, loading, persistFloorPlan, venueID]);

  const updateActiveFloor = (update: (floor: VenueFloor) => VenueFloor, record = true) => {
    updateFloors(
      (current) => current.map((floor) => (floor.id === activeFloorId ? update(floor) : floor)),
      record,
    );
  };

  const switchFloor = (floor: VenueFloor) => {
    setActiveFloorId(floor.id);
    setSelected(
      floor.tables[0]
        ? { kind: "table", id: floor.tables[0].id }
        : floor.fixtures[0]
          ? { kind: "fixture", id: floor.fixtures[0].id }
          : null,
    );
  };

  const addFloor = () => {
    const nextFloor: VenueFloor = {
      id: newId("floor"),
      name: `${floors.length + 1} этаж`,
      tables: [],
      fixtures: [],
    };
    updateFloors((current) => [...current, nextFloor]);
    setActiveFloorId(nextFloor.id);
    setSelected(null);
    notify(`${nextFloor.name} добавлен`);
  };

  const removeFloor = async () => {
    if (floors.length <= 1) {
      notify("В заведении должен остаться хотя бы один этаж");
      return;
    }
    if (
      !(await confirm({
        title: t("Удалить этаж"),
        description: t("Удалить этаж «{name}» вместе со всеми элементами плана?", {
          name: activeFloor.name,
        }),
      }))
    )
      return;
    const activeIndex = floors.findIndex((floor) => floor.id === activeFloor.id);
    const remainingFloors = floors.filter((floor) => floor.id !== activeFloor.id);
    const nextFloor =
      remainingFloors[Math.min(Math.max(activeIndex, 0), remainingFloors.length - 1)];
    updateFloors(() => remainingFloors);
    setActiveFloorId(nextFloor.id);
    setSelected(
      nextFloor.tables[0]
        ? { kind: "table", id: nextFloor.tables[0].id }
        : nextFloor.fixtures[0]
          ? { kind: "fixture", id: nextFloor.fixtures[0].id }
          : null,
    );
    notify(`${activeFloor.name} удален`);
  };

  const nextTableId = () =>
    String(
      floors
        .flatMap((floor) => floor.tables)
        .reduce((highest, table) => Math.max(highest, Number(table.id) || 0), 0) + 1,
    ).padStart(2, "0");
  const duplicateTable = (source: FloorTable) => {
    const table: FloorTable = {
      ...source,
      id: nextTableId(),
      x: Math.min(89, source.x + 4),
      y: Math.min(87, source.y + 6),
    };
    updateActiveFloor((floor) => ({ ...floor, tables: [...floor.tables, table] }));
    setSelected({ kind: "table", id: table.id });
  };
  const addTable = (shape?: FloorTable["shape"]) => {
    const position = activeFloor.tables.length;
    const table: FloorTable = {
      id: nextTableId(),
      seats: 4,
      x: 10 + (position % 3) * 28,
      y: 12 + (Math.floor(position / 3) % 3) * 30,
      state: "free",
      ...(shape ? { shape } : {}),
    };
    updateActiveFloor((floor) => ({ ...floor, tables: [...floor.tables, table] }));
    setSelected({ kind: "table", id: table.id });
    notify(`Стол ${table.id} добавлен на ${activeFloor.name.toLowerCase()}`);
  };

  const addFixture = (type: FloorFixture["type"]) => {
    const fixturesOfType = activeFloor.fixtures.filter((fixture) => fixture.type === type);
    const fixture: FloorFixture = {
      id: newId(type),
      type,
      x:
        type === "bar"
          ? 16 + (fixturesOfType.length % 2) * 44
          : 8 + (fixturesOfType.length % 4) * 22,
      y: type === "bar" ? 86 - fixturesOfType.length * 10 : type === "window" ? 5 : 12,
      rotation: 0,
      size: 100,
    };
    updateActiveFloor((floor) => ({ ...floor, fixtures: [...floor.fixtures, fixture] }));
    setSelected({ kind: "fixture", id: fixture.id });
    notify(
      `${fixtureLabel(type)} ${type === "window" ? "добавлено" : "добавлен"} на ${activeFloor.name.toLowerCase()}`,
    );
  };

  const removeFixture = async (fixture: FloorFixture) => {
    if (
      !(await confirm({
        description: t("Удалить {type} с плана?", {
          type: t(fixtureLabel(fixture.type)).toLocaleLowerCase(),
        }),
      }))
    )
      return;
    const remainingFixtures = activeFloor.fixtures.filter((item) => item.id !== fixture.id);
    updateActiveFloor((floor) => ({ ...floor, fixtures: remainingFixtures }));
    setSelected(
      activeFloor.tables[0]
        ? { kind: "table", id: activeFloor.tables[0].id }
        : remainingFixtures[0]
          ? { kind: "fixture", id: remainingFixtures[0].id }
          : null,
    );
    notify(
      `${fixtureLabel(fixture.type)} ${fixture.type === "window" ? "удалено" : "удален"} с плана`,
    );
  };

  const updateFixture = (
    fixtureId: string,
    changes: Partial<Pick<FloorFixture, "rotation" | "size">>,
  ) => {
    updateActiveFloor((floor) => ({
      ...floor,
      fixtures: floor.fixtures.map((fixture) =>
        fixture.id === fixtureId ? { ...fixture, ...changes } : fixture,
      ),
    }));
  };

  const saveTableInfo = (
    table: FloorTable,
    nextId: string,
    seats: number,
    shape: FloorTable["shape"],
  ) => {
    const normalizedId = nextId.trim();
    if (!normalizedId) {
      notify("Укажите номер стола");
      return;
    }
    const duplicate = floors.some((floor) =>
      floor.tables.some((item) => item.id === normalizedId && item.id !== table.id),
    );
    if (duplicate) {
      notify(`Стол ${normalizedId} уже существует`);
      return;
    }
    updateActiveFloor((floor) => ({
      ...floor,
      tables: floor.tables.map((item) =>
        item.id === table.id ? { ...item, id: normalizedId, seats, shape } : item,
      ),
    }));
    setSelected({ kind: "table", id: normalizedId });
  };

  const removeTable = async (table: FloorTable) => {
    if (!(await confirm({ description: t("Удалить стол {id} с плана?", { id: table.id }) })))
      return;
    const remainingTables = activeFloor.tables.filter((item) => item.id !== table.id);
    updateActiveFloor((floor) => ({ ...floor, tables: remainingTables }));
    setSelected(
      remainingTables[0]
        ? { kind: "table", id: remainingTables[0].id }
        : activeFloor.fixtures[0]
          ? { kind: "fixture", id: activeFloor.fixtures[0].id }
          : null,
    );
    notify(`Стол ${table.id} удален с плана`);
  };

  const startDragging = (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: Exclude<FloorSelection, null>,
    position: { x: number; y: number },
  ) => {
    if (view !== "edit") return;
    const canvas = event.currentTarget.closest<HTMLElement>(".floor-canvas");
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = {
      target,
      offsetX: pointerX - position.x,
      offsetY: pointerY - position.y,
    };
    setDragging(target);
    setSelected(target);
  };

  const moveDraggedObject = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag) return;
    const { target } = drag;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const rawX = ((event.clientX - bounds.left) / bounds.width) * 100 - drag.offsetX;
    const rawY = ((event.clientY - bounds.top) / bounds.height) * 100 - drag.offsetY;
    const selectedFixtureType =
      target.kind === "fixture"
        ? activeFloor.fixtures.find((fixture) => fixture.id === target.id)?.type
        : undefined;
    const maxX =
      target.kind === "table"
        ? 89
        : selectedFixtureType === "bar"
          ? 63
          : selectedFixtureType === "window"
            ? 98
            : 90;
    const maxY =
      target.kind === "table"
        ? 87
        : selectedFixtureType === "bar"
          ? 91
          : selectedFixtureType === "window"
            ? 42
            : 90;
    const step = snap ? 1 : 0.1;
    const place = (value: number) => Math.round(Math.round(value / step) * step * 10) / 10;
    const x = place(Math.max(1, Math.min(maxX, rawX)));
    const y = place(Math.max(2, Math.min(maxY, rawY)));
    const position = target.kind === "table" ? selectedTable : selectedFixture;
    if (position?.x === x && position.y === y) return;
    // The whole drag is one step of the history.
    const firstMove = !drag.moved;
    drag.moved = true;
    updateActiveFloor(
      (floor) =>
        target.kind === "table"
          ? {
              ...floor,
              tables: floor.tables.map((table) =>
                table.id === target.id ? { ...table, x, y } : table,
              ),
            }
          : {
              ...floor,
              fixtures: floor.fixtures.map((fixture) =>
                fixture.id === target.id ? { ...fixture, x, y } : fixture,
              ),
            },
      firstMove,
    );
  };

  const stopDragging = () => {
    draggingRef.current = null;
    setDragging(null);
  };

  const changeZoom = (step: number) =>
    setZoom((current) => Math.max(60, Math.min(160, current + step)));
  const downloadQr = (tableId: string) => {
    void downloadTableQr(venueName, tableId, venueID)
      .then(() => notify(`QR-код стола ${tableId} скачан`))
      .catch(() => notify("Не удалось скачать QR-код"));
  };

  const allTables = floors.flatMap((floor) => floor.tables);
  const switchView = (next: FloorView) => {
    setView(next);
    if (selected?.kind === "fixture") setSelected(null);
    setPicked(null);
  };

  // Live floor: seating and freeing tables. Every action answers with the new floor.
  const runSeating = async (action: Promise<LiveFloor>, done: string) => {
    setSeating(true);
    try {
      live.apply(await action);
      setPicked(null);
      notify(done);
    } catch (error) {
      notify(errorMessage(error, "Не удалось выполнить действие"));
    } finally {
      setSeating(false);
    }
  };
  const seatBooking = (booking: LiveBooking, tableID = "") => {
    if (!venueID || seating) return;
    void runSeating(
      seatReservation(venueID, booking.id, tableID),
      t("{name}: стол {table}", {
        name: booking.guest_name,
        table: tableID || booking.table_identifier,
      }),
    );
  };
  const seatGuests = (table: FloorTable, guests: number, guestName: string) => {
    if (!venueID || seating) return;
    void runSeating(
      seatWalkIn(venueID, { table_identifier: table.id, guests, guest_name: guestName }),
      t("Гости посажены за стол {table}", { table: table.id }),
    );
  };
  const freeTable = async (table: FloorTable) => {
    if (!venueID || seating) return;
    if (
      !(await confirm({
        title: t("Освободить стол"),
        description: t("Гости за столом {id} ушли?", { id: table.id }),
        confirmLabel: t("Освободить"),
      }))
    )
      return;
    void runSeating(
      releaseTable(venueID, table.id),
      t("Стол {table} свободен", { table: table.id }),
    );
  };
  const pickedBooking = picked ? bookings.get(picked) : undefined;
  const tableState = (table: FloorTable) => liveTables.get(table.id)?.state ?? "free";
  const openTable = (table: FloorTable) => {
    if (pickedBooking) seatBooking(pickedBooking, table.id);
    else setSelected({ kind: "table", id: table.id });
  };
  const tableCaption = (table: FloorTable) => {
    const state = liveTables.get(table.id);
    if (view === "live" && state?.party) {
      const minutes = minutesBetween(Date.parse(state.party.seated_at), live.now);
      const time =
        minutes < 60
          ? durationLabel(t, minutes)
          : t("{count} ч", { count: Math.floor(minutes / 60) });
      return time;
    }
    if (view === "live" && state?.bill) return t("Счёт");
    const next = state?.next_reservation_id ? bookings.get(state.next_reservation_id) : undefined;
    if (view === "live" && state?.state === "reserved" && next) return formatTime(next.starts_at);
    return `${table.seats} ${t("места")}`;
  };

  const seatsOf = (tables: FloorTable[]) => tables.reduce((sum, table) => sum + table.seats, 0);
  const totalSeats = seatsOf(allTables);
  const guestsIn = allTables.reduce(
    (sum, table) => sum + (liveTables.get(table.id)?.party?.guest_count ?? 0),
    0,
  );
  const occupancy = totalSeats ? Math.min(100, Math.round((guestsIn / totalSeats) * 100)) : 0;
  const freeTables = allTables.filter((table) => tableState(table) === "free");
  const nextBooking = live.floor?.bookings[0];
  const floorCount = (state: "free" | "occupied" | "reserved") =>
    activeFloor.tables.filter((table) => tableState(table) === state).length;
  const saveState = saving
    ? t("Сохраняем...")
    : dirty
      ? t("Есть несохранённые изменения")
      : t("Изменения сохранены");
  const guide = view === "edit" && selectedTable ? tableGeometry(selectedTable) : null;
  const stageStyle = { "--floor-scale": zoom / 100 } as CSSProperties;
  const addToPlan = (item: PaletteItem["kind"]) => {
    if (item === "table") addTable();
    else if (item === "round") addTable("round");
    else addFixture(item);
  };

  return (
    <div className={`floor-page view-${view}`}>
      <PageHeader
        title={t("План зала")}
        subtitle={venueName}
        actions={
          <>
            {view === "edit" && (
              <>
                <span className={`floor-save-state ${dirty || saving ? "pending" : ""}`}>
                  {saveState}
                </span>
                <div className="floor-history">
                  <button
                    type="button"
                    className="floor-icon-btn"
                    aria-label={t("Отменить")}
                    title={t("Отменить")}
                    disabled={!history.undo}
                    onClick={() => travel("undo")}
                  >
                    <Undo2 size={19} />
                  </button>
                  <button
                    type="button"
                    className="floor-icon-btn"
                    aria-label={t("Повторить")}
                    title={t("Повторить")}
                    disabled={!history.redo}
                    onClick={() => travel("redo")}
                  >
                    <Redo2 size={19} />
                  </button>
                </div>
              </>
            )}
            <button
              type="button"
              className="floor-btn white"
              disabled={loading}
              onClick={() => setShowQrCodes(true)}
            >
              <QrCode size={19} />
              {t("QR-коды")}
            </button>
            <div className="floor-view-switch" role="group" aria-label={t("Режим плана зала")}>
              <button
                type="button"
                aria-pressed={view === "live"}
                onClick={() => switchView("live")}
              >
                {t("Зал")}
              </button>
              <button
                type="button"
                aria-pressed={view === "edit"}
                onClick={() => switchView("edit")}
              >
                {t("Редактор")}
              </button>
            </div>
          </>
        }
      />
      <div className="floor-grid">
        <section className="floor-board">
          {view === "live" && (
            <div className="floor-stats">
              <div>
                <span>{t("Занято мест")}</span>
                <div className="floor-stat-value">
                  <strong>{occupancy}%</strong>
                  <span className="floor-stat-track">
                    <i style={{ width: `${occupancy}%` }} />
                  </span>
                </div>
                <small>{t("Гостей в зале: {count}", { count: guestsIn })}</small>
              </div>
              <div>
                <span>{t("Свободные столы")}</span>
                <strong>{freeTables.length}</strong>
                <small>{t("Мест: {count}", { count: seatsOf(freeTables) })}</small>
              </div>
              <div>
                <span>{t("Ближайшие брони")}</span>
                <strong>{live.floor?.bookings.length ?? 0}</strong>
                <small>
                  {nextBooking
                    ? t("Следующая в {time} · {name}", {
                        time: formatTime(nextBooking.starts_at),
                        name: nextBooking.guest_name,
                      })
                    : t("На сегодня броней больше нет")}
                </small>
              </div>
            </div>
          )}
          <div className="floor-view" style={stageStyle}>
            <div className="floor-overlay top-left">
              <div className="floor-tabs" role="tablist" aria-label={t("Этажи заведения")}>
                {floors.map((floor) => (
                  <button
                    role="tab"
                    aria-selected={floor.id === activeFloorId}
                    key={floor.id}
                    onClick={() => switchFloor(floor)}
                    disabled={loading}
                  >
                    {floor.name}
                  </button>
                ))}
                {view === "edit" && !loading && (
                  <button
                    type="button"
                    className="floor-tab-add"
                    aria-label={t("Добавить этаж")}
                    title={t("Добавить этаж")}
                    onClick={addFloor}
                  >
                    <Plus size={19} />
                  </button>
                )}
              </div>
              <label className="floor-tabs-select">
                <select
                  aria-label={t("Выбрать этаж")}
                  value={activeFloorId}
                  disabled={loading}
                  onChange={(event) => {
                    const floor = floors.find((item) => item.id === event.target.value);
                    if (floor) switchFloor(floor);
                  }}
                >
                  {floors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name} · {tableCountLabel(floor.tables.length)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} aria-hidden="true" />
              </label>
            </div>
            <div className="floor-overlay top-right floor-zoom">
              <button
                type="button"
                aria-label={t("Уменьшить масштаб")}
                onClick={() => changeZoom(-20)}
              >
                <Minus size={19} />
              </button>
              <button
                type="button"
                className="floor-zoom-value"
                aria-label={t("Сбросить масштаб")}
                onClick={() => setZoom(100)}
              >
                {zoom}%
              </button>
              <button
                type="button"
                aria-label={t("Увеличить масштаб")}
                onClick={() => changeZoom(20)}
              >
                <Plus size={19} />
              </button>
            </div>
            {pickedBooking && (
              <p className="floor-overlay floor-pick-hint" role="status">
                <span>
                  {t("Выберите свободный стол для брони {name}", {
                    name: pickedBooking.guest_name,
                  })}
                </span>
                <button type="button" aria-label={t("Отмена")} onClick={() => setPicked(null)}>
                  <X size={18} />
                </button>
              </p>
            )}
            {view === "edit" && !loading && (
              <div
                className="floor-overlay bottom-right floor-palette"
                role="group"
                aria-label={t("Элементы зала")}
              >
                <span>{t("Добавить")}</span>
                {palette.map(({ kind, label, icon: Icon }) => (
                  <button type="button" key={kind} onClick={() => addToPlan(kind)}>
                    <Icon size={19} />
                    {t(label)}
                  </button>
                ))}
              </div>
            )}
            <div className="floor-overlay bottom-left floor-key">
              {view === "live" ? (
                <>
                  <span>
                    <i className="free" />
                    {t("Свободен")} · {floorCount("free")}
                  </span>
                  <span>
                    <i className="occupied" />
                    {t("Занят")} · {floorCount("occupied")}
                  </span>
                  <span>
                    <i className="reserved" />
                    {t("Бронь")} · {floorCount("reserved")}
                  </span>
                </>
              ) : (
                <button
                  type="button"
                  className="floor-snap"
                  aria-pressed={snap}
                  onClick={() => setSnap((value) => !value)}
                >
                  <Magnet size={17} />
                  {t("Привязка к сетке")}
                </button>
              )}
            </div>
            <div className="floor-stage">
              <div
                className={`floor-canvas ${dragging ? "is-dragging" : ""} ${pickedBooking ? "is-picking" : ""}`}
                onPointerMove={moveDraggedObject}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
              >
                {guide && selectedTable && (
                  <>
                    <i
                      className="floor-guide horizontal"
                      style={{ top: `calc(${selectedTable.y}% + ${guide.height / 2}px)` }}
                    />
                    <i
                      className="floor-guide vertical"
                      style={{ left: `calc(${selectedTable.x}% + ${guide.width / 2}px)` }}
                    />
                  </>
                )}
                {!loading &&
                  activeFloor.fixtures.map((fixture) => {
                    const target = { kind: "fixture" as const, id: fixture.id };
                    const size = fixture.size ?? 100;
                    const Icon = fixtureIcons[fixture.type];
                    const fixtureStyle: CSSProperties = {
                      left: `${fixture.x}%`,
                      top: `${fixture.y}%`,
                      transform: `${fixture.type === "window" ? "translateX(-100%) " : ""}rotate(${fixture.rotation ?? 0}deg)`,
                      ...(fixture.type === "bar"
                        ? { width: `${(36 * size) / 100}%` }
                        : fixture.type === "window"
                          ? { height: `${(58 * size) / 100}%` }
                          : { width: `${(84 * size) / 100}px` }),
                    };
                    const label = (
                      <>
                        <Icon size={16} />
                        {t(fixtureLabel(fixture.type))}
                      </>
                    );
                    return view === "live" ? (
                      <div
                        key={fixture.id}
                        className={`floor-fixture ${fixture.type}`}
                        style={fixtureStyle}
                      >
                        {label}
                      </div>
                    ) : (
                      <button
                        key={fixture.id}
                        className={`floor-fixture ${fixture.type} ${selectedFixture?.id === fixture.id ? "selected" : ""} ${dragging?.kind === "fixture" && dragging.id === fixture.id ? "dragging" : ""}`}
                        style={fixtureStyle}
                        onPointerDown={(event) => startDragging(event, target, fixture)}
                        onClick={() => setSelected(target)}
                      >
                        {label}
                      </button>
                    );
                  })}
                {!loading &&
                  activeFloor.tables.map((table) => {
                    const target = { kind: "table" as const, id: table.id };
                    const isSelected = shownTable?.id === table.id;
                    const state = tableState(table);
                    const party = liveTables.get(table.id)?.party;
                    return view === "live" ? (
                      <button
                        key={table.id}
                        className={`floor-table state-${state} ${isSelected ? "selected" : ""}`}
                        style={tableStyle(table)}
                        aria-label={`${t("Стол {number}", { number: table.id })}, ${t(stateLabel(state)).toLocaleLowerCase()}`}
                        aria-pressed={isSelected}
                        disabled={seating}
                        onClick={() => openTable(table)}
                        onDragOver={(event) => {
                          if (state !== "occupied") event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const booking = bookings.get(event.dataTransfer.getData("text/plain"));
                          if (booking) seatBooking(booking, table.id);
                        }}
                      >
                        <TableShape
                          table={table}
                          taken={state === "occupied" ? (party?.guest_count ?? table.seats) : 0}
                        >
                          <strong>{table.id}</strong>
                          <span>{tableCaption(table)}</span>
                        </TableShape>
                      </button>
                    ) : (
                      <button
                        key={table.id}
                        className={`floor-table editing ${isSelected ? "selected" : ""} ${dragging?.kind === "table" && dragging.id === table.id ? "dragging" : ""}`}
                        style={tableStyle(table)}
                        onPointerDown={(event) => startDragging(event, target, table)}
                        onClick={() => setSelected(target)}
                      >
                        <TableShape table={table}>
                          <strong>{table.id}</strong>
                          <span>{tableCaption(table)}</span>
                        </TableShape>
                      </button>
                    );
                  })}
                {loading ? (
                  <div className="floor-empty loading">
                    <RefreshCw size={26} />
                    <strong>{t("Загружаем план")}</strong>
                    <span>{t("Получаем сохраненную расстановку")}</span>
                  </div>
                ) : (
                  activeFloor.tables.length === 0 &&
                  activeFloor.fixtures.length === 0 && (
                    <div className="floor-empty">
                      <Building2 size={28} />
                      <strong>{activeFloor.name}</strong>
                      <span>{t("План пока пуст")}</span>
                      {view === "live" && (
                        <button
                          type="button"
                          className="floor-btn white"
                          onClick={() => switchView("edit")}
                        >
                          {t("Открыть редактор")}
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
        <aside className="floor-side">
          {view === "live" ? (
            <>
              {shownTable && (
                <LiveTableCard
                  key={shownTable.id}
                  table={shownTable}
                  floorName={activeFloor.name}
                  live={liveTables.get(shownTable.id)}
                  booking={bookings.get(liveTables.get(shownTable.id)?.next_reservation_id ?? "")}
                  now={live.now}
                  currency={live.floor?.currency ?? "EUR"}
                  busy={seating}
                  formatTime={formatTime}
                  onSeatBooking={(booking) => seatBooking(booking, shownTable.id)}
                  onSeatWalkIn={(guests, name) => seatGuests(shownTable, guests, name)}
                  onRelease={() => void freeTable(shownTable)}
                />
              )}
              <BookingList
                floor={live.floor}
                now={live.now}
                picked={picked}
                busy={seating}
                formatTime={formatTime}
                onSeat={(booking) => seatBooking(booking)}
                onPick={setPicked}
              />
            </>
          ) : loading ? (
            <section className="floor-card floor-card-note">
              <RefreshCw size={24} className="floor-spin" />
              <h2>{t("Загружаем")}</h2>
              <p>{t("Получаем сохраненную расстановку.")}</p>
            </section>
          ) : (
            <>
              {shownTable && (
                <OwnerTableEditor
                  key={`${activeFloor.id}-${shownTable.id}`}
                  table={shownTable}
                  floorName={activeFloor.name}
                  onSave={(id, seats, shape) => saveTableInfo(shownTable, id, seats, shape)}
                  onDuplicate={() => duplicateTable(shownTable)}
                  onDownload={() => downloadQr(shownTable.id)}
                  onDelete={() => void removeTable(shownTable)}
                />
              )}
              {selectedFixture && (
                <section className="floor-card">
                  <header>
                    <div>
                      <h2>{t(fixtureLabel(selectedFixture.type))}</h2>
                      <p>
                        {activeFloor.name} · {t("позиция")} {Math.round(selectedFixture.x)}% ×{" "}
                        {Math.round(selectedFixture.y)}%
                      </p>
                    </div>
                  </header>
                  <div className="floor-fields">
                    <div className="floor-field">
                      <span>{t("Поворот")}</span>
                      <div className="floor-stepper-box">
                        <button
                          type="button"
                          aria-label={t("Повернуть влево на 45 градусов")}
                          onClick={() =>
                            updateFixture(selectedFixture.id, {
                              rotation: (selectedFixture.rotation - 45 + 360) % 360,
                            })
                          }
                        >
                          <RotateCcw size={19} />
                        </button>
                        <output>{selectedFixture.rotation}°</output>
                        <button
                          type="button"
                          aria-label={t("Повернуть вправо на 45 градусов")}
                          onClick={() =>
                            updateFixture(selectedFixture.id, {
                              rotation: (selectedFixture.rotation + 45) % 360,
                            })
                          }
                        >
                          <RotateCw size={19} />
                        </button>
                      </div>
                    </div>
                    <div className="floor-field">
                      <span>{t("Размер")}</span>
                      <div className="floor-stepper-box">
                        <button
                          type="button"
                          aria-label={t("Уменьшить размер на 10 процентов")}
                          onClick={() =>
                            updateFixture(selectedFixture.id, {
                              size: Math.max(50, selectedFixture.size - 10),
                            })
                          }
                        >
                          <Minus size={19} />
                        </button>
                        <output>{selectedFixture.size}%</output>
                        <button
                          type="button"
                          aria-label={t("Увеличить размер на 10 процентов")}
                          onClick={() =>
                            updateFixture(selectedFixture.id, {
                              size: Math.min(160, selectedFixture.size + 10),
                            })
                          }
                        >
                          <Plus size={19} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="floor-card-actions">
                    <button
                      type="button"
                      className="floor-btn danger"
                      onClick={() => void removeFixture(selectedFixture)}
                    >
                      <Trash2 size={19} />
                      {t("Удалить с плана")}
                    </button>
                  </div>
                </section>
              )}
              <section className="floor-card">
                <header>
                  <div>
                    <h2>{activeFloor.name}</h2>
                    <p>
                      {tableCountLabel(activeFloor.tables.length)} ·{" "}
                      {t("элементов: {count}", { count: activeFloor.fixtures.length })}
                    </p>
                  </div>
                  <IconButton
                    icon={Trash2}
                    label={`Удалить ${activeFloor.name}`}
                    onClick={() => void removeFloor()}
                    className="floor-icon-btn soft"
                  />
                </header>
                {activeFloor.tables.length + activeFloor.fixtures.length === 0 ? (
                  <p className="floor-side-note">
                    {t("Добавьте первый стол с панели «Добавить» на плане.")}
                  </p>
                ) : (
                  <div className="floor-layers">
                    {activeFloor.tables.map((table) => (
                      <button
                        type="button"
                        key={table.id}
                        aria-pressed={shownTable?.id === table.id}
                        onClick={() => setSelected({ kind: "table", id: table.id })}
                      >
                        {table.shape === "round" ? <Circle size={17} /> : <Square size={17} />}
                        <b>{t("Стол {number}", { number: table.id })}</b>
                        <span>
                          {table.seats} {t("места")}
                        </span>
                      </button>
                    ))}
                    {activeFloor.fixtures.map((fixture) => {
                      const Icon = fixtureIcons[fixture.type];
                      return (
                        <button
                          type="button"
                          key={fixture.id}
                          aria-pressed={selectedFixture?.id === fixture.id}
                          onClick={() => setSelected({ kind: "fixture", id: fixture.id })}
                        >
                          <Icon size={17} />
                          <b>{t(fixtureLabel(fixture.type))}</b>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </aside>
      </div>
      {showQrCodes && (
        <QrCodesDialog
          venueID={venueID}
          venueName={venueName}
          tables={allTables}
          onClose={() => setShowQrCodes(false)}
          notify={notify}
        />
      )}
    </div>
  );
}
