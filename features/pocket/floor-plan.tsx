"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import QRCode from "qrcode";
import { Building2, Check, ChevronDown, Download, DoorOpen, Ellipsis, Minus, PanelsTopLeft, Plus, QrCode, RefreshCw, RotateCcw, RotateCw, Table2, Trash2, UserRound, Wine, X } from "lucide-react";
import { makeVenueSlug } from "./model";
import { Button, IconButton, StatusPill, PageHeader, Field } from "./ui";

export type FloorTable = { id: string; seats: number; x: number; y: number; state: "free" | "busy" | "reserved" };
export type FloorFixture = { id: string; type: "bar" | "window" | "entrance"; x: number; y: number; rotation: number; size: number };
export type VenueFloor = { id: string; name: string; tables: FloorTable[]; fixtures: FloorFixture[] };
export type FloorSelection = { kind: "table" | "fixture"; id: string } | null;
export type FloorDragState = { target: Exclude<FloorSelection, null>; offsetX: number; offsetY: number };

export const tables: FloorTable[] = [
  { id: "01", seats: 2, x: 8, y: 12, state: "free" }, { id: "02", seats: 2, x: 33, y: 12, state: "busy" }, { id: "03", seats: 4, x: 61, y: 10, state: "busy" },
  { id: "04", seats: 4, x: 9, y: 42, state: "reserved" }, { id: "05", seats: 6, x: 37, y: 43, state: "free" }, { id: "06", seats: 2, x: 76, y: 45, state: "busy" },
  { id: "07", seats: 4, x: 11, y: 74, state: "free" }, { id: "08", seats: 6, x: 42, y: 72, state: "busy" }, { id: "09", seats: 2, x: 78, y: 76, state: "reserved" },
];

export const initialFloors: VenueFloor[] = [{
  id: "floor-1",
  name: "1 этаж",
  tables,
  fixtures: [
    { id: "bar-1", type: "bar", x: 18, y: 88, rotation: 0, size: 100 },
    { id: "window-1", type: "window", x: 94, y: 17, rotation: 0, size: 100 },
  ],
}];

export const floorPlanKey = (venueName: string) => `pocket:floor-plan:${makeVenueSlug(venueName)}`;

export const loadFloorPlan = (venueName: string) => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(floorPlanKey(venueName)) ?? "null") as unknown;
    if (!Array.isArray(stored) || stored.length === 0) return initialFloors;
    const floors = stored as VenueFloor[];
    if (!floors.every((floor) => typeof floor.id === "string" && typeof floor.name === "string" && Array.isArray(floor.tables) && Array.isArray(floor.fixtures))) return initialFloors;
    return floors.map((floor) => ({
      ...floor,
      fixtures: floor.fixtures.map((fixture) => ({ ...fixture, rotation: Number.isFinite(fixture.rotation) ? fixture.rotation : 0, size: Number.isFinite(fixture.size) ? fixture.size : 100 })),
    }));
  } catch {
    return initialFloors;
  }
};

export const fixtureLabel = (type: FloorFixture["type"]) => type === "bar" ? "Бар" : type === "window" ? "Окно" : "Вход";

export const downloadTableQr = async (venueName: string, tableId: string) => {
  const venueSlug = makeVenueSlug(venueName);
  const svg = await QRCode.toString(`https://pocket.app/${venueSlug}/t/${tableId}`, { type: "svg", errorCorrectionLevel: "H", margin: 2, width: 768 });
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${venueSlug}-table-${tableId}-qr.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export function FloorPlan({ mode, venueName, notify, embedded = false }: { mode: "owner" | "staff"; venueName: string; notify: (message: string) => void; embedded?: boolean }) {
  const [floors, setFloors] = useState<VenueFloor[]>(initialFloors);
  const [activeFloorId, setActiveFloorId] = useState(initialFloors[0].id);
  const [selected, setSelected] = useState<FloorSelection>({ kind: "table", id: "08" });
  const [dragging, setDragging] = useState<FloorSelection>(null);
  const [zoom, setZoom] = useState(100);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showQrCodes, setShowQrCodes] = useState(false);
  const draggingRef = useRef<FloorDragState | null>(null);
  const activeFloor = floors.find((floor) => floor.id === activeFloorId) ?? floors[0];
  const selectedTable = selected?.kind === "table" ? activeFloor.tables.find((table) => table.id === selected.id) : undefined;
  const selectedFixture = selected?.kind === "fixture" ? activeFloor.fixtures.find((fixture) => fixture.id === selected.id) : undefined;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const restoredFloors = loadFloorPlan(venueName);
      const restoredFloor = restoredFloors[0];
      setFloors(restoredFloors);
      setActiveFloorId(restoredFloor.id);
      setSelected(restoredFloor.tables[0] ? { kind: "table", id: restoredFloor.tables[0].id } : restoredFloor.fixtures[0] ? { kind: "fixture", id: restoredFloor.fixtures[0].id } : null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [venueName]);

  const updateFloors = (update: (floors: VenueFloor[]) => VenueFloor[]) => {
    setFloors((current) => {
      const next = update(current);
      window.localStorage.setItem(floorPlanKey(venueName), JSON.stringify(next));
      return next;
    });
  };

  const updateActiveFloor = (update: (floor: VenueFloor) => VenueFloor) => {
    updateFloors((current) => current.map((floor) => floor.id === activeFloorId ? update(floor) : floor));
  };

  const switchFloor = (floor: VenueFloor) => {
    setActiveFloorId(floor.id);
    setSelected(floor.tables[0] ? { kind: "table", id: floor.tables[0].id } : floor.fixtures[0] ? { kind: "fixture", id: floor.fixtures[0].id } : null);
  };

  const addFloor = () => {
    const nextFloor: VenueFloor = { id: `floor-${Date.now()}`, name: `${floors.length + 1} этаж`, tables: [], fixtures: [] };
    updateFloors((current) => [...current, nextFloor]);
    setActiveFloorId(nextFloor.id);
    setSelected(null);
    setAddMenuOpen(false);
    notify(`${nextFloor.name} добавлен`);
  };

  const addTable = () => {
    const nextNumber = floors.flatMap((floor) => floor.tables).reduce((highest, table) => Math.max(highest, Number(table.id) || 0), 0) + 1;
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
      x: type === "bar" ? 16 + (fixturesOfType.length % 2) * 44 : 8 + (fixturesOfType.length % 4) * 22,
      y: type === "bar" ? 86 - fixturesOfType.length * 10 : type === "window" ? 5 : 12,
      rotation: 0,
      size: 100,
    };
    updateActiveFloor((floor) => ({ ...floor, fixtures: [...floor.fixtures, fixture] }));
    setSelected({ kind: "fixture", id: fixture.id });
    setAddMenuOpen(false);
    notify(`${fixtureLabel(type)} ${type === "window" ? "добавлено" : "добавлен"} на ${activeFloor.name.toLowerCase()}`);
  };

  const removeFixture = (fixture: FloorFixture) => {
    updateActiveFloor((floor) => ({ ...floor, fixtures: floor.fixtures.filter((item) => item.id !== fixture.id) }));
    setSelected(null);
    notify(`${fixtureLabel(fixture.type)} ${fixture.type === "window" ? "удалено" : "удален"} с плана`);
  };

  const updateFixture = (fixtureId: string, changes: Partial<Pick<FloorFixture, "rotation" | "size">>) => {
    updateActiveFloor((floor) => ({ ...floor, fixtures: floor.fixtures.map((fixture) => fixture.id === fixtureId ? { ...fixture, ...changes } : fixture) }));
  };

  const saveTableInfo = (table: FloorTable, nextId: string, seats: number) => {
    const normalizedId = nextId.trim();
    if (!normalizedId) {
      notify("Укажите номер стола");
      return;
    }
    const duplicate = floors.some((floor) => floor.tables.some((item) => item.id === normalizedId && item.id !== table.id));
    if (duplicate) {
      notify(`Стол ${normalizedId} уже существует`);
      return;
    }
    updateActiveFloor((floor) => ({ ...floor, tables: floor.tables.map((item) => item.id === table.id ? { ...item, id: normalizedId, seats } : item) }));
    setSelected({ kind: "table", id: normalizedId });
    notify(`Стол ${normalizedId} сохранен`);
  };

  const removeTable = (table: FloorTable) => {
    updateActiveFloor((floor) => ({ ...floor, tables: floor.tables.filter((item) => item.id !== table.id) }));
    setSelected(null);
    notify(`Стол ${table.id} удален с плана`);
  };

  const startDragging = (event: ReactPointerEvent<HTMLButtonElement>, target: Exclude<FloorSelection, null>, position: { x: number; y: number }) => {
    if (mode !== "owner") return;
    const canvas = event.currentTarget.closest<HTMLElement>(".floor-canvas");
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = { target, offsetX: pointerX - position.x, offsetY: pointerY - position.y };
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
    const selectedFixtureType = target.kind === "fixture" ? activeFloor.fixtures.find((fixture) => fixture.id === target.id)?.type : undefined;
    const maxX = target.kind === "table" ? 89 : selectedFixtureType === "bar" ? 63 : selectedFixtureType === "window" ? 98 : 90;
    const maxY = target.kind === "table" ? 87 : selectedFixtureType === "bar" ? 91 : selectedFixtureType === "window" ? 42 : 90;
    const x = Math.round(Math.max(1, Math.min(maxX, rawX)) * 10) / 10;
    const y = Math.round(Math.max(2, Math.min(maxY, rawY)) * 10) / 10;
    updateActiveFloor((floor) => target.kind === "table"
      ? { ...floor, tables: floor.tables.map((table) => table.id === target.id ? { ...table, x, y } : table) }
      : { ...floor, fixtures: floor.fixtures.map((fixture) => fixture.id === target.id ? { ...fixture, x, y } : fixture) });
  };

  const stopDragging = () => {
    draggingRef.current = null;
    setDragging(null);
  };

  const changeZoom = (step: number) => setZoom((current) => Math.max(60, Math.min(160, current + step)));
  const downloadQr = (tableId: string) => {
    void downloadTableQr(venueName, tableId)
      .then(() => notify(`QR-код стола ${tableId} скачан`))
      .catch(() => notify("Не удалось скачать QR-код"));
  };

  const allTables = floors.flatMap((floor) => floor.tables);
  const ownerActions = <><Button kind="secondary" icon={QrCode} onClick={() => setShowQrCodes(true)}>QR-коды</Button><div className="floor-add-menu"><Button icon={Plus} onClick={() => setAddMenuOpen((open) => !open)}>Добавить <ChevronDown size={15} /></Button>{addMenuOpen && <div className="floor-add-popover"><button onClick={addTable}><Table2 size={19} /><span><strong>Стол</strong><small>4 места</small></span></button><button onClick={() => addFixture("bar")}><Wine size={19} /><span><strong>Бар</strong><small>Барная стойка</small></span></button><button onClick={() => addFixture("window")}><PanelsTopLeft size={19} /><span><strong>Окно</strong><small>Граница зала</small></span></button><button onClick={() => addFixture("entrance")}><DoorOpen size={19} /><span><strong>Вход</strong><small>Дверь или проход</small></span></button><button onClick={addFloor}><Building2 size={19} /><span><strong>Этаж</strong><small>Новый план</small></span></button></div>}</div></>;

  const editorHeading = embedded
    ? <div className="floor-editor-heading"><div><h2>План зала</h2><p>Перетаскивайте элементы и настройте каждый этаж отдельно.</p></div><div>{ownerActions}</div></div>
    : <PageHeader title={mode === "owner" ? "План зала" : "Столы"} subtitle={mode === "owner" ? "Настройте расположение столов и отслеживайте загрузку." : "Состояние зала и ваши назначенные столы."} actions={mode === "owner" ? ownerActions : <Button icon={Plus}>Открыть счет</Button>} />;
  const stageStyle = { "--floor-scale": zoom / 100 } as CSSProperties;

  return <>
    {editorHeading}
    <div className="floor-levels"><div className="floor-level-list" role="tablist" aria-label="Этажи заведения">{floors.map((floor, index) => <button role="tab" aria-selected={floor.id === activeFloorId} className={floor.id === activeFloorId ? "active" : ""} key={floor.id} onClick={() => switchFloor(floor)}><span>{index + 1}</span><strong>{floor.name}</strong><small>{floor.tables.length} столов</small></button>)}</div>{mode === "owner" && <IconButton icon={Plus} label="Добавить этаж" onClick={addFloor} className="add-floor-button" />}</div>
    <div className="floor-layout">
      <section className="panel floor-panel">
        <div className={`floor-toolbar ${mode === "owner" ? "technical" : ""}`}>{mode === "staff" && <div className="floor-legend"><span><i className="free" />Свободен</span><span><i className="busy" />Занят</span><span><i className="reserved" />Бронь</span></div>}<div className="zoom-control"><IconButton icon={Minus} label="Уменьшить масштаб" onClick={() => changeZoom(-20)} /><button className="zoom-label" onClick={() => setZoom(100)} aria-label="Сбросить масштаб">{zoom}%</button><IconButton icon={Plus} label="Увеличить масштаб" onClick={() => changeZoom(20)} /></div></div>
        <div className="floor-canvas-viewport" style={stageStyle}><div className="floor-stage-shell"><div className={`floor-canvas ${dragging ? "is-dragging" : ""}`} onPointerMove={moveDraggedObject} onPointerUp={stopDragging} onPointerCancel={stopDragging}>{activeFloor.fixtures.map((fixture) => {
          const target = { kind: "fixture" as const, id: fixture.id };
          const size = fixture.size ?? 100;
          const fixtureStyle: CSSProperties = {
            left: `${fixture.x}%`,
            top: `${fixture.y}%`,
            transform: `${fixture.type === "window" ? "translateX(-100%) " : ""}rotate(${fixture.rotation ?? 0}deg)`,
            ...(fixture.type === "bar" ? { width: `${36 * size / 100}%` } : fixture.type === "window" ? { height: `${58 * size / 100}%` } : { width: `${84 * size / 100}px` }),
          };
          return <button key={fixture.id} className={`floor-fixture ${fixture.type} ${selected?.kind === "fixture" && selected.id === fixture.id ? "selected" : ""} ${dragging?.kind === "fixture" && dragging.id === fixture.id ? "dragging" : ""}`} style={fixtureStyle} onPointerDown={(event) => startDragging(event, target, fixture)} onClick={() => setSelected(target)}>{fixture.type === "bar" ? <><Wine size={16} />Бар</> : fixture.type === "window" ? <><PanelsTopLeft size={16} />Окно</> : <><DoorOpen size={16} />Вход</>}</button>;
        })}{activeFloor.tables.map((table) => { const target = { kind: "table" as const, id: table.id }; return <button key={table.id} className={`floor-table ${mode === "staff" ? table.state : "technical"} ${selected?.kind === "table" && selected.id === table.id ? "selected" : ""} ${dragging?.kind === "table" && dragging.id === table.id ? "dragging" : ""} ${table.seats >= 6 ? "wide" : ""}`} style={{ left: `${table.x}%`, top: `${table.y}%` }} onPointerDown={(event) => startDragging(event, target, table)} onClick={() => setSelected(target)}><strong>{table.id}</strong><span>{table.seats} места</span></button>; })}{activeFloor.tables.length === 0 && activeFloor.fixtures.length === 0 && <div className="floor-empty"><Building2 size={28} /><strong>{activeFloor.name}</strong><span>План пока пуст</span></div>}</div></div></div>
      </section>
      {selectedTable ? mode === "owner" ? <OwnerTableEditor key={`${activeFloor.id}-${selectedTable.id}`} table={selectedTable} floorName={activeFloor.name} onSave={(id, seats) => saveTableInfo(selectedTable, id, seats)} onDownload={() => downloadQr(selectedTable.id)} onDelete={() => removeTable(selectedTable)} /> : <StaffTableDetail table={selectedTable} floorName={activeFloor.name} notify={notify} /> : selectedFixture ? <aside className="panel table-detail fixture-detail technical-detail"><div className="detail-heading"><div><small>{activeFloor.name.toUpperCase()} · ЭЛЕМЕНТ</small><h2>{fixtureLabel(selectedFixture.type)}</h2></div>{selectedFixture.type === "bar" ? <Wine size={22} /> : selectedFixture.type === "window" ? <PanelsTopLeft size={22} /> : <DoorOpen size={22} />}</div><div className="fixture-controls"><label><span>Поворот</span><div className="rotation-control"><IconButton icon={RotateCcw} label="Повернуть влево на 45 градусов" onClick={() => updateFixture(selectedFixture.id, { rotation: (selectedFixture.rotation - 45 + 360) % 360 })} /><strong>{selectedFixture.rotation}°</strong><IconButton icon={RotateCw} label="Повернуть вправо на 45 градусов" onClick={() => updateFixture(selectedFixture.id, { rotation: (selectedFixture.rotation + 45) % 360 })} /></div></label><label><span>Размер <b>{selectedFixture.size}%</b></span><div className="fixture-size-control"><IconButton icon={Minus} label="Уменьшить размер на 10 процентов" onClick={() => updateFixture(selectedFixture.id, { size: Math.max(50, selectedFixture.size - 10) })} /><input type="range" min="50" max="160" step="10" value={selectedFixture.size} onChange={(event) => updateFixture(selectedFixture.id, { size: Number(event.target.value) })} /><IconButton icon={Plus} label="Увеличить размер на 10 процентов" onClick={() => updateFixture(selectedFixture.id, { size: Math.min(160, selectedFixture.size + 10) })} /></div></label></div>{mode === "owner" && <Button className="full" kind="danger" icon={Trash2} onClick={() => removeFixture(selectedFixture)}>Удалить с плана</Button>}</aside> : <aside className="panel table-detail floor-summary"><Building2 size={24} /><h2>{activeFloor.name}</h2><p>{activeFloor.tables.length} столов · {activeFloor.fixtures.length} элементов</p>{mode === "owner" && <Button className="full" icon={Plus} onClick={addTable}>Добавить первый стол</Button>}</aside>}
    </div>
    {showQrCodes && <QrCodesDialog venueName={venueName} tables={allTables} onClose={() => setShowQrCodes(false)} notify={notify} />}
  </>;
}

export function OwnerTableEditor({ table, floorName, onSave, onDownload, onDelete }: { table: FloorTable; floorName: string; onSave: (id: string, seats: number) => void; onDownload: () => void; onDelete: () => void }) {
  const [tableId, setTableId] = useState(table.id);
  const [seats, setSeats] = useState(table.seats);
  return <aside className="panel table-detail technical-detail"><div className="detail-heading"><div><small>{floorName.toUpperCase()} · СТОЛ</small><h2>{table.id}</h2></div><Table2 size={22} /></div><form onSubmit={(event) => { event.preventDefault(); onSave(tableId, seats); }}><Field label="Номер стола"><input value={tableId} maxLength={12} onChange={(event) => setTableId(event.target.value)} /></Field><Field label="Количество мест"><select value={seats} onChange={(event) => setSeats(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option value={value} key={value}>{value}</option>)}</select></Field><p className="technical-position">Позиция: {Math.round(table.x)}% × {Math.round(table.y)}%</p><Button className="full" type="submit" icon={Check}>Сохранить</Button></form><Button className="full" kind="secondary" icon={Download} onClick={onDownload}>Скачать QR-код</Button><Button className="full" kind="danger" icon={Trash2} onClick={onDelete}>Удалить стол</Button></aside>;
}

export function StaffTableDetail({ table, floorName, notify }: { table: FloorTable; floorName: string; notify: (message: string) => void }) {
  return <aside className="panel table-detail"><div className="detail-heading"><div><small>{floorName.toUpperCase()} · СТОЛ</small><h2>{table.id}</h2></div><IconButton icon={Ellipsis} label="Действия" /></div><StatusPill status={table.state === "busy" ? "Занят" : table.state === "reserved" ? "Бронь" : "Свободен"} /><dl><div><dt>Мест</dt><dd>{table.seats}</dd></div><div><dt>Официант</dt><dd>София М.</dd></div><div><dt>Текущий счет</dt><dd>{table.state === "busy" ? "€76.50" : "—"}</dd></div><div><dt>Открыт</dt><dd>{table.state === "busy" ? "38 мин" : "—"}</dd></div></dl>{table.state === "busy" && <div className="mini-order"><p><span>Тальятелле</span><b>2</b></p><p><span>Буррата</span><b>1</b></p><p><span>Красный апельсин</span><b>3</b></p></div>}<Button className="full" kind="quiet" icon={UserRound} onClick={() => notify("Официант назначен")}>Назначить официанта</Button></aside>;
}

export function QrCodesDialog({ venueName, tables: qrTables, onClose, notify }: { venueName: string; tables: FloorTable[]; onClose: () => void; notify: (message: string) => void }) {
  const [versions, setVersions] = useState<Record<string, number>>({});
	const venueSlug = makeVenueSlug(venueName);
  const regenerate = (tableId: string) => {
    setVersions((current) => ({ ...current, [tableId]: (current[tableId] ?? 1) + 1 }));
    notify(`QR-код стола ${tableId} перегенерирован`);
  };
  const download = (tableId: string) => { void downloadTableQr(venueName, tableId).then(() => notify(`QR-код стола ${tableId} скачан`)).catch(() => notify("Не удалось скачать QR-код")); };
  return <div className="preview-backdrop" onMouseDown={onClose}><section className="qr-dialog" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">QR-КОДЫ СТОЛОВ</p><h2>{venueName}</h2><p>После сканирования гость увидит меню, а заказ и счет автоматически привяжутся к выбранному столу. Перегенерация отключает прежний код.</p></div><IconButton icon={X} label="Закрыть QR-коды" onClick={onClose} /></header><div className="qr-grid">{qrTables.map((table) => { const version = versions[table.id] ?? 1; return <article key={table.id}><div className="qr-symbol"><QrCode size={72} strokeWidth={1.4} /></div><div><strong>Стол {table.id}</strong><span>{table.seats} места · версия {version}</span><small>pocket.app/{venueSlug}/t/{table.id}?v={version}</small></div><div className="qr-card-actions"><IconButton icon={RefreshCw} label={`Перегенерировать QR-код стола ${table.id}`} onClick={() => regenerate(table.id)} /><IconButton icon={Download} label={`Скачать QR-код стола ${table.id}`} onClick={() => download(table.id)} /></div></article>; })}</div><footer><p>Напечатайте коды и разместите их на соответствующих столах.</p><div><Button kind="secondary" onClick={onClose}>Закрыть</Button><Button icon={Download} onClick={() => notify("Архив QR-кодов подготовлен")}>Скачать все</Button></div></footer></section></div>;
}

