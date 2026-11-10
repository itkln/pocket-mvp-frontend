"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Building2,
  Check,
  ChevronDown,
  DoorOpen,
  Minus,
  PanelsTopLeft,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Table2,
  Trash2,
  Wine,
} from "lucide-react";
import { getFloorPlan, saveFloorPlan } from "../../lib/owner-api";
import { useConfirm } from "./confirm-dialog";
import { useI18n } from "./i18n";
import { useLocalizedError } from "./error-message";
import { Button, IconButton, PageHeader } from "./ui";
import {
  FloorTable,
  FloorFixture,
  VenueFloor,
  FloorSelection,
  FloorDragState,
  initialFloors,
  normalizeFloorPlan,
  fixtureLabel,
  tableCountLabel,
} from "./floor/floor-model";
import { downloadTableQr } from "./floor/table-qr";
import { OwnerTableEditor } from "./floor/owner-table-editor";
import { StaffTableDetail } from "./floor/staff-table-detail";
import { QrCodesDialog } from "./floor/qr-codes-dialog";

export function FloorPlan({
  mode,
  venueID,
  venueName,
  notify,
  embedded = false,
}: {
  mode: "owner" | "staff";
  venueID?: string;
  venueName: string;
  notify: (message: string) => void;
  embedded?: boolean;
}) {
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const errorMessage = useLocalizedError();
  const [floors, setFloors] = useState<VenueFloor[]>(initialFloors);
  const [activeFloorId, setActiveFloorId] = useState(initialFloors[0].id);
  const [selected, setSelected] = useState<FloorSelection>(null);
  const [dragging, setDragging] = useState<FloorSelection>(null);
  const [zoom, setZoom] = useState(100);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showQrCodes, setShowQrCodes] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(mode === "owner" && Boolean(venueID));
  const [saving, setSaving] = useState(false);
  const draggingRef = useRef<FloorDragState | null>(null);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const saveRequestRef = useRef(0);
  const activeFloor = floors.find((floor) => floor.id === activeFloorId) ?? floors[0];
  const selectedTable =
    selected?.kind === "table"
      ? activeFloor.tables.find((table) => table.id === selected.id)
      : undefined;
  const selectedFixture =
    selected?.kind === "fixture"
      ? activeFloor.fixtures.find((fixture) => fixture.id === selected.id)
      : undefined;

  useEffect(() => {
    if (mode !== "owner" || !venueID) return;
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
          const restoredFloor = restoredFloors[0];
          setFloors(restoredFloors);
          setActiveFloorId(restoredFloor.id);
          setSelected(
            restoredFloor.tables[0]
              ? { kind: "table", id: restoredFloor.tables[0].id }
              : restoredFloor.fixtures[0]
                ? { kind: "fixture", id: restoredFloor.fixtures[0].id }
                : null,
          );
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
  }, [errorMessage, mode, venueID, notify]);

  const updateFloors = (update: (floors: VenueFloor[]) => VenueFloor[]) => {
    dirtyRef.current = true;
    revisionRef.current += 1;
    setDirty(true);
    setFloors(update);
  };

  const persistFloorPlan = useCallback(
    async (plan: VenueFloor[], revision: number, announce: boolean) => {
      if (!venueID || loading) return;
      const request = ++saveRequestRef.current;
      setSaving(true);
      try {
        await saveFloorPlan(venueID, plan);
        if (revisionRef.current === revision) {
          dirtyRef.current = false;
          setDirty(false);
        }
        if (announce) notify("План зала сохранен");
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
    if (mode !== "owner" || !venueID || loading || !dirty || dragging) return;
    const plan = floors;
    const revision = revisionRef.current;
    const timeout = window.setTimeout(() => void persistFloorPlan(plan, revision, false), 900);
    return () => window.clearTimeout(timeout);
  }, [dirty, dragging, floors, loading, mode, persistFloorPlan, venueID]);

  const updateActiveFloor = (update: (floor: VenueFloor) => VenueFloor) => {
    updateFloors((current) =>
      current.map((floor) => (floor.id === activeFloorId ? update(floor) : floor)),
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
      id: `floor-${Date.now()}`,
      name: `${floors.length + 1} этаж`,
      tables: [],
      fixtures: [],
    };
    updateFloors((current) => [...current, nextFloor]);
    setActiveFloorId(nextFloor.id);
    setSelected(null);
    setAddMenuOpen(false);
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

  const addTable = () => {
    const nextNumber =
      floors
        .flatMap((floor) => floor.tables)
        .reduce((highest, table) => Math.max(highest, Number(table.id) || 0), 0) + 1;
    const position = activeFloor.tables.length;
    const table: FloorTable = {
      id: String(nextNumber).padStart(2, "0"),
      seats: 4,
      x: 10 + (position % 3) * 28,
      y: 12 + (Math.floor(position / 3) % 3) * 30,
      state: "free",
    };
    updateActiveFloor((floor) => ({ ...floor, tables: [...floor.tables, table] }));
    setSelected({ kind: "table", id: table.id });
    setAddMenuOpen(false);
    notify(`Стол ${table.id} добавлен на ${activeFloor.name.toLowerCase()}`);
  };

  const addFixture = (type: FloorFixture["type"]) => {
    const fixturesOfType = activeFloor.fixtures.filter((fixture) => fixture.type === type);
    const fixture: FloorFixture = {
      id: `${type}-${Date.now()}`,
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
    setAddMenuOpen(false);
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

  const saveTableInfo = (table: FloorTable, nextId: string, seats: number) => {
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
        item.id === table.id ? { ...item, id: normalizedId, seats } : item,
      ),
    }));
    setSelected({ kind: "table", id: normalizedId });
    notify(`Стол ${normalizedId} сохранен`);
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
    if (mode !== "owner") return;
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
    const x = Math.round(Math.max(1, Math.min(maxX, rawX)) * 10) / 10;
    const y = Math.round(Math.max(2, Math.min(maxY, rawY)) * 10) / 10;
    updateActiveFloor((floor) =>
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
  const ownerActions = (
    <>
      <Button
        kind="secondary"
        icon={Check}
        disabled={!dirty || saving || loading}
        onClick={() => void persistFloorPlan(floors, revisionRef.current, true)}
      >
        {saving ? t("Сохраняем...") : t("Сохранить план")}
      </Button>
      <Button
        kind="secondary"
        icon={QrCode}
        disabled={loading}
        onClick={() => setShowQrCodes(true)}
      >
        {t("QR-коды")}
      </Button>
      <div className="floor-add-menu">
        <Button icon={Plus} disabled={loading} onClick={() => setAddMenuOpen((open) => !open)}>
          {t("Добавить")} <ChevronDown size={15} />
        </Button>
        {addMenuOpen && (
          <div className="floor-add-popover">
            <button onClick={addTable}>
              <Table2 size={19} />
              <span>
                <strong>{t("Стол")}</strong>
                <small>{t("4 места")}</small>
              </span>
            </button>
            <button onClick={() => addFixture("bar")}>
              <Wine size={19} />
              <span>
                <strong>{t("Бар")}</strong>
                <small>{t("Барная стойка")}</small>
              </span>
            </button>
            <button onClick={() => addFixture("window")}>
              <PanelsTopLeft size={19} />
              <span>
                <strong>{t("Окно")}</strong>
                <small>{t("Граница зала")}</small>
              </span>
            </button>
            <button onClick={() => addFixture("entrance")}>
              <DoorOpen size={19} />
              <span>
                <strong>{t("Вход")}</strong>
                <small>{t("Дверь или проход")}</small>
              </span>
            </button>
            <button onClick={addFloor}>
              <Building2 size={19} />
              <span>
                <strong>{t("Этаж")}</strong>
                <small>{t("Новый план")}</small>
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  const editorHeading = embedded ? (
    <div className="floor-editor-heading">
      <div>
        <h2>{t("План зала")}</h2>
        <p>{t("Перетаскивайте элементы и настройте каждый этаж отдельно.")}</p>
      </div>
      <div>{ownerActions}</div>
    </div>
  ) : (
    <PageHeader
      title={mode === "owner" ? t("План зала") : t("Столы")}
      subtitle={mode === "owner" ? undefined : t("Состояние зала и ваши назначенные столы.")}
      actions={mode === "owner" ? ownerActions : <Button icon={Plus}>{t("Открыть счет")}</Button>}
    />
  );
  const stageStyle = { "--floor-scale": zoom / 100 } as CSSProperties;

  return (
    <>
      {editorHeading}
      <div className="floor-levels">
        <div className="floor-level-list" role="tablist" aria-label={t("Этажи заведения")}>
          {floors.map((floor, index) => (
            <button
              role="tab"
              aria-selected={floor.id === activeFloorId}
              className={floor.id === activeFloorId ? "active" : ""}
              key={floor.id}
              onClick={() => switchFloor(floor)}
              disabled={loading}
            >
              <span>{index + 1}</span>
              <strong>{floor.name}</strong>
              <small>{tableCountLabel(floor.tables.length)}</small>
            </button>
          ))}
        </div>
        <label className="floor-level-select">
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
        {mode === "owner" && !loading && (
          <div className="floor-level-actions">
            <IconButton
              icon={Trash2}
              label={`Удалить ${activeFloor.name}`}
              onClick={() => void removeFloor()}
              className="delete-floor-button"
            />
            <IconButton
              icon={Plus}
              label={t("Добавить этаж")}
              onClick={addFloor}
              className="add-floor-button"
            />
          </div>
        )}
      </div>
      <div className="floor-layout">
        <section className="panel floor-panel">
          <div className={`floor-toolbar ${mode === "owner" ? "technical" : ""}`}>
            {mode === "staff" && (
              <div className="floor-legend">
                <span>
                  <i className="free" />
                  {t("Свободен")}
                </span>
                <span>
                  <i className="busy" />
                  {t("Занят")}
                </span>
                <span>
                  <i className="reserved" />
                  {t("Бронь")}
                </span>
              </div>
            )}
            <div className="zoom-control">
              <IconButton
                icon={Minus}
                label={t("Уменьшить масштаб")}
                onClick={() => changeZoom(-20)}
              />
              <button
                className="zoom-label"
                onClick={() => setZoom(100)}
                aria-label={t("Сбросить масштаб")}
              >
                {zoom}%
              </button>
              <IconButton
                icon={Plus}
                label={t("Увеличить масштаб")}
                onClick={() => changeZoom(20)}
              />
            </div>
          </div>
          <div className="floor-canvas-viewport" style={stageStyle}>
            <div className="floor-stage-shell">
              <div
                className={`floor-canvas ${dragging ? "is-dragging" : ""}`}
                onPointerMove={moveDraggedObject}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
              >
                {!loading &&
                  activeFloor.fixtures.map((fixture) => {
                    const target = { kind: "fixture" as const, id: fixture.id };
                    const size = fixture.size ?? 100;
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
                    return (
                      <button
                        key={fixture.id}
                        className={`floor-fixture ${fixture.type} ${selected?.kind === "fixture" && selected.id === fixture.id ? "selected" : ""} ${dragging?.kind === "fixture" && dragging.id === fixture.id ? "dragging" : ""}`}
                        style={fixtureStyle}
                        onPointerDown={(event) => startDragging(event, target, fixture)}
                        onClick={() => setSelected(target)}
                      >
                        {fixture.type === "bar" ? (
                          <>
                            <Wine size={16} />
                            {t("Бар")}
                          </>
                        ) : fixture.type === "window" ? (
                          <>
                            <PanelsTopLeft size={16} />
                            {t("Окно")}
                          </>
                        ) : (
                          <>
                            <DoorOpen size={16} />
                            {t("Вход")}
                          </>
                        )}
                      </button>
                    );
                  })}
                {!loading &&
                  activeFloor.tables.map((table) => {
                    const target = { kind: "table" as const, id: table.id };
                    return (
                      <button
                        key={table.id}
                        className={`floor-table ${mode === "staff" ? table.state : "technical"} ${selected?.kind === "table" && selected.id === table.id ? "selected" : ""} ${dragging?.kind === "table" && dragging.id === table.id ? "dragging" : ""} ${table.seats >= 6 ? "wide" : ""}`}
                        style={{ left: `${table.x}%`, top: `${table.y}%` }}
                        onPointerDown={(event) => startDragging(event, target, table)}
                        onClick={() => setSelected(target)}
                      >
                        <strong>{table.id}</strong>
                        <span>
                          {table.seats} {t("места")}
                        </span>
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
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
        {loading ? (
          <aside className="panel table-detail floor-summary loading">
            <RefreshCw size={24} />
            <h2>{t("Загружаем")}</h2>
            <p>{t("Получаем сохраненную расстановку.")}</p>
          </aside>
        ) : selectedTable ? (
          mode === "owner" ? (
            <OwnerTableEditor
              key={`${activeFloor.id}-${selectedTable.id}`}
              table={selectedTable}
              floorName={activeFloor.name}
              onSave={(id, seats) => saveTableInfo(selectedTable, id, seats)}
              onDownload={() => downloadQr(selectedTable.id)}
              onDelete={() => void removeTable(selectedTable)}
            />
          ) : (
            <StaffTableDetail table={selectedTable} floorName={activeFloor.name} />
          )
        ) : selectedFixture ? (
          <aside className="panel table-detail fixture-detail technical-detail">
            <div className="detail-heading">
              <div>
                <small>
                  {activeFloor.name.toUpperCase()} {t("· ЭЛЕМЕНТ")}
                </small>
                <h2>{fixtureLabel(selectedFixture.type)}</h2>
              </div>
              {selectedFixture.type === "bar" ? (
                <Wine size={22} />
              ) : selectedFixture.type === "window" ? (
                <PanelsTopLeft size={22} />
              ) : (
                <DoorOpen size={22} />
              )}
            </div>
            <div className="fixture-controls">
              <label>
                <span>{t("Поворот")}</span>
                <div className="rotation-control">
                  <IconButton
                    icon={RotateCcw}
                    label={t("Повернуть влево на 45 градусов")}
                    onClick={() =>
                      updateFixture(selectedFixture.id, {
                        rotation: (selectedFixture.rotation - 45 + 360) % 360,
                      })
                    }
                  />
                  <strong>{selectedFixture.rotation}°</strong>
                  <IconButton
                    icon={RotateCw}
                    label={t("Повернуть вправо на 45 градусов")}
                    onClick={() =>
                      updateFixture(selectedFixture.id, {
                        rotation: (selectedFixture.rotation + 45) % 360,
                      })
                    }
                  />
                </div>
              </label>
              <label>
                <span>
                  {t("Размер")} <b>{selectedFixture.size}%</b>
                </span>
                <div className="fixture-size-control">
                  <IconButton
                    icon={Minus}
                    label={t("Уменьшить размер на 10 процентов")}
                    onClick={() =>
                      updateFixture(selectedFixture.id, {
                        size: Math.max(50, selectedFixture.size - 10),
                      })
                    }
                  />
                  <input
                    type="range"
                    min="50"
                    max="160"
                    step="10"
                    value={selectedFixture.size}
                    onChange={(event) =>
                      updateFixture(selectedFixture.id, { size: Number(event.target.value) })
                    }
                  />
                  <IconButton
                    icon={Plus}
                    label={t("Увеличить размер на 10 процентов")}
                    onClick={() =>
                      updateFixture(selectedFixture.id, {
                        size: Math.min(160, selectedFixture.size + 10),
                      })
                    }
                  />
                </div>
              </label>
            </div>
            {mode === "owner" && (
              <Button
                className="full"
                kind="danger"
                icon={Trash2}
                onClick={() => void removeFixture(selectedFixture)}
              >
                {t("Удалить с плана")}
              </Button>
            )}
          </aside>
        ) : (
          <aside className="panel table-detail floor-summary">
            <Building2 size={24} />
            <h2>{activeFloor.name}</h2>
            <p>
              {tableCountLabel(activeFloor.tables.length)} · {activeFloor.fixtures.length}{" "}
              {t("элементов")}
            </p>
            {mode === "owner" && (
              <Button className="full" icon={Plus} onClick={addTable}>
                {activeFloor.tables.length ? t("Добавить стол") : t("Добавить первый стол")}
              </Button>
            )}
          </aside>
        )}
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
    </>
  );
}
