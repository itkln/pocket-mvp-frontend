"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, Copy, Ellipsis, Eye, GripVertical, LayoutGrid, List, Pencil, Plus, Search, Settings2, Star, Trash2, X } from "lucide-react";
import { type MenuItemInput, type OwnerCategory, type OwnerMenuItem } from "../../../lib/owner-api";
import { useConfirm } from "../confirm-dialog";
import { useI18n } from "../i18n";
import { Button, EmptyIllustration, IconButton, PageHeader, money } from "../ui";
import { useOwnerWorkspace } from "./context";

export function MenuManager({ venueName, onAdd, notify }: { venueName: string; onAdd: () => void; notify: (message: string) => void }) {
  const workspace = useOwnerWorkspace();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesMode, setCategoriesMode] = useState<"manage" | "create" | null>(null);
  const [actionItem, setActionItem] = useState<string | null>(null);
  const [editing, setEditing] = useState<OwnerMenuItem | null>(null);
  const [preview, setPreview] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const filtered = useMemo(() => workspace.items.filter((item) => (category === "all" || item.category_id === category) && (item.name + " " + (item.description ?? "")).toLowerCase().includes(query.toLowerCase())), [workspace.items, category, query]);
  const canReorderItems = category !== "all" && query.trim() === "";

  const reorderCategories = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = workspace.categories.map((item) => item.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    void workspace.reorderCategories(arrayMove(ids, oldIndex, newIndex)).then(() => notify("Порядок категорий сохранен")).catch(() => undefined);
  };

  const reorderItems = ({ active, over }: DragEndEvent) => {
    if (!canReorderItems || !over || active.id === over.id) return;
    const ids = workspace.items.filter((item) => item.category_id === category).map((item) => item.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    void workspace.reorderItems(category, arrayMove(ids, oldIndex, newIndex)).then(() => notify("Порядок позиций сохранен")).catch(() => undefined);
  };

  const duplicate = async (item: OwnerMenuItem) => {
    await workspace.addItem({ category_id: item.category_id, name: item.name + " — копия", description: item.description, price_minor: item.price_minor, currency: item.currency, is_available: false, is_popular: false, image_url: item.image_url });
    setActionItem(null); notify("Копия позиции создана");
  };
  const remove = async (item: OwnerMenuItem) => {
    if (!await confirm({ description: t("Удалить позицию «{name}»?", { name: item.name }) })) return;
    await workspace.removeItem(item.id); setActionItem(null); notify("Позиция удалена");
  };
  const removeCategory = async (item: OwnerCategory) => {
    if (item.item_count > 0) { notify("Сначала перенесите или удалите позиции категории"); return false; }
    if (!await confirm({ description: t("Удалить категорию «{name}»?", { name: item.name }) })) return false;
    await workspace.removeCategory(item.id);
    if (category === item.id) setCategory("all");
    notify("Категория удалена");
    return true;
  };

  return <><PageHeader title="Меню" subtitle="Категории, цены и доступность блюд." actions={<><Button kind="secondary" icon={Eye} onClick={() => setPreview(true)}>Предпросмотр</Button><div className="menu-create-menu"><Button icon={Plus} onClick={() => setCreateOpen((value) => !value)}>Добавить</Button>{createOpen && <CreateMenu onItem={() => { setCreateOpen(false); onAdd(); }} onCategory={() => { setCreateOpen(false); setCategoriesMode("create"); }} />}</div></>} />
    <div className={`mobile-create-fab ${createOpen ? "open" : ""}`}>{createOpen && <div className="mobile-create-popover"><CreateMenuContent onItem={() => { setCreateOpen(false); onAdd(); }} onCategory={() => { setCreateOpen(false); setCategoriesMode("create"); }} /></div>}<button className="mobile-create-trigger" aria-label={createOpen ? "Закрыть меню создания" : "Добавить в меню"} onClick={() => setCreateOpen((value) => !value)}>{createOpen ? <X size={25} /> : <Plus size={25} />}</button></div>
    <div className="menu-layout"><aside className="category-list"><div className="category-list-heading"><strong>Категории</strong><IconButton icon={Settings2} label="Управление категориями" onClick={() => setCategoriesMode("manage")} /></div><button className={`category-select category-all ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")}><span>Все позиции</span><b>{workspace.items.length}</b></button><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderCategories}><SortableContext items={workspace.categories.map((item) => item.id)} strategy={verticalListSortingStrategy}>{workspace.categories.map((item) => <SortableCategory key={item.id} item={item} active={category === item.id} onSelect={() => setCategory(item.id)} />)}</SortableContext></DndContext></aside><section><div className="list-toolbar menu-list-toolbar"><p>Позиций: <strong>{filtered.length}</strong></p><div className="menu-filter-row"><label className="mobile-category-select"><LayoutGrid size={16} /><select aria-label="Категория меню" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Все позиции</option>{workspace.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></label><IconButton icon={Settings2} className="mobile-category-manage" label="Управление категориями" onClick={() => setCategoriesMode("manage")} /><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти блюдо" /></label></div></div><div className="menu-view-row"><span>Вид меню</span><div className="view-toggle"><IconButton icon={LayoutGrid} label="Показать сеткой" active={view === "grid"} onClick={() => setView("grid")} /><IconButton icon={List} label="Показать списком" active={view === "list"} onClick={() => setView("list")} /></div></div>
      {filtered.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderItems}><SortableContext items={filtered.map((item) => item.id)} strategy={rectSortingStrategy}><div className={"menu-items " + view}>{filtered.map((item) => <SortableMenuCard key={item.id} item={item} reorderEnabled={canReorderItems} actionOpen={actionItem === item.id} onToggleActions={() => setActionItem(actionItem === item.id ? null : item.id)} onEdit={() => { setEditing(item); setActionItem(null); }} onToggleAvailable={() => void workspace.editItem(item.id, itemInput(item, { is_available: !item.is_available }))} onTogglePopular={() => void workspace.editItem(item.id, itemInput(item, { is_popular: !item.is_popular })).then(() => setActionItem(null))} onDuplicate={() => void duplicate(item)} onRemove={() => void remove(item)} />)}</div></SortableContext></DndContext> : <div className="panel"><EmptyIllustration icon={LayoutGrid} title={workspace.categories.length ? "Позиции не найдены" : "Меню пока пустое"} text={workspace.categories.length ? "Измените категорию или поисковый запрос." : "Сначала создайте категорию, затем добавьте первую позицию."} /></div>}</section></div>
    {categoriesMode && <CategoryManagerDialog categories={workspace.categories} initialCreate={categoriesMode === "create"} onClose={() => setCategoriesMode(null)} onRemove={removeCategory} onSave={async (categories, newCategories) => { await Promise.all([...categories.map((item) => workspace.editCategory(item.id, { name: item.name, sort_order: item.sort_order, is_active: item.is_active })), ...newCategories.map((item) => workspace.addCategory(item))]); setCategoriesMode(null); notify(newCategories.length ? "Категории добавлены" : "Категории сохранены"); }} />}
    {editing && <ItemEditDialog item={editing} onClose={() => setEditing(null)} onSave={async (input) => { await workspace.editItem(editing.id, input); setEditing(null); notify("Позиция обновлена"); }} />}
    {preview && <MenuPreview venueName={venueName} items={workspace.items.filter((item) => item.is_available)} onClose={() => setPreview(false)} />}
  </>;
}

function CreateMenu({ onItem, onCategory }: { onItem: () => void; onCategory: () => void }) {
  return <div className="menu-create-popover"><CreateMenuContent onItem={onItem} onCategory={onCategory} /></div>;
}

function CreateMenuContent({ onItem, onCategory }: { onItem: () => void; onCategory: () => void }) {
  return <><button onClick={onItem}><Plus size={18} /><span><strong>Позицию</strong><small>Блюдо или напиток</small></span></button><button onClick={onCategory}><LayoutGrid size={18} /><span><strong>Категорию</strong><small>Новый раздел меню</small></span></button></>;
}

function SortableCategory({ item, active, onSelect }: { item: OwnerCategory; active: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return <div ref={setNodeRef} style={style} className={`category-sortable-row ${isDragging ? "dragging" : ""}`}><button className={`category-select ${active ? "active" : ""}`} onClick={onSelect}><span>{item.name}</span><b>{item.item_count}</b></button><button type="button" className="category-drag-handle" aria-label={t("Переместить категорию {name}", { name: item.name })} {...attributes} {...listeners}><GripVertical size={16} /></button></div>;
}

function SortableMenuCard({ item, reorderEnabled, actionOpen, onToggleActions, onEdit, onToggleAvailable, onTogglePopular, onDuplicate, onRemove }: { item: OwnerMenuItem; reorderEnabled: boolean; actionOpen: boolean; onToggleActions: () => void; onEdit: () => void; onToggleAvailable: () => void; onTogglePopular: () => void; onDuplicate: () => void; onRemove: () => void }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !reorderEnabled });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return <article ref={setNodeRef} style={style} className={`menu-card ${isDragging ? "dragging" : ""}`}>{item.image_url ? <div className="food-image" style={{ backgroundImage: 'url("' + item.image_url + '")' }} role="img" aria-label={item.name} /> : <div className="food-image menu-image-placeholder"><span>{item.name.at(0)}</span></div>}<div className="menu-card-body">{item.is_popular && <span className="menu-status"><Star size={12} />Хит</span>}<small>{item.category}</small><h3>{item.name}</h3><p>{item.description || "Описание не добавлено"}</p><footer><strong>{money(item.price_minor / 100, item.currency)}</strong>{reorderEnabled && <button type="button" className="menu-drag-handle" aria-label={t("Переместить позицию {name}", { name: item.name })} {...attributes} {...listeners}><GripVertical size={17} /></button>}<label className="switch" title={item.is_available ? "Скрыть позицию" : "Опубликовать позицию"}><input type="checkbox" checked={item.is_available} onChange={onToggleAvailable} /><span /></label><IconButton icon={Pencil} label="Редактировать" onClick={onEdit} /><div className="row-actions"><IconButton icon={Ellipsis} label="Действия с позицией" onClick={onToggleActions} />{actionOpen && <div className="row-actions-menu"><button onClick={onEdit}><Pencil size={16} />Редактировать</button><button onClick={onTogglePopular}><Star size={16} />{item.is_popular ? "Убрать «Хит»" : "Отметить как «Хит»"}</button><button onClick={onDuplicate}><Copy size={16} />Создать копию</button><button className="danger" onClick={onRemove}><Trash2 size={16} />Удалить</button></div>}</div></footer></div></article>;
}

const itemInput = (item: OwnerMenuItem, patch: Partial<MenuItemInput> = {}): MenuItemInput => ({ category_id: item.category_id, name: item.name, description: item.description, price_minor: item.price_minor, currency: item.currency, is_available: item.is_available, is_popular: item.is_popular, image_url: item.image_url, ...patch });

type CategoryDraft = OwnerCategory & { isNew?: boolean };

const newCategoryDraft = (sortOrder: number): CategoryDraft => ({ id: `new-category-${Date.now()}-${sortOrder}`, name: "", sort_order: sortOrder, is_active: true, item_count: 0, isNew: true });

export function CategoryManagerDialog({ categories, initialCreate, onClose, onRemove, onSave }: { categories: OwnerCategory[]; initialCreate: boolean; onClose: () => void; onRemove: (category: OwnerCategory) => Promise<boolean>; onSave: (categories: OwnerCategory[], newCategories: { name: string; sort_order: number; is_active: boolean }[]) => Promise<void> }) {
  const [drafts, setDrafts] = useState<CategoryDraft[]>(() => [...categories.map((category) => ({ ...category })), ...(initialCreate ? [newCategoryDraft(categories.length)] : [])]);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const originals = new Map(categories.map((category) => [category.id, category]));
  const changed = drafts.filter((category) => {
    const original = originals.get(category.id);
    return original && (category.name.trim() !== original.name || category.is_active !== original.is_active || category.sort_order !== original.sort_order);
  });
  const created = drafts.filter((category) => category.isNew && category.name.trim());
  const invalid = drafts.some((category) => !category.name.trim());
  const hasChanges = changed.length > 0 || created.length > 0;
  const positionCount = (count: number) => count === 1 ? "1 позиция" : count >= 2 && count <= 4 ? `${count} позиции` : `${count} позиций`;
  const addDraft = () => setDrafts((current) => [...current, newCategoryDraft(Math.max(-1, ...current.map((category) => category.sort_order)) + 1)]);
  const reorderDrafts = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setDrafts((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex).map((item, index) => ({ ...item, sort_order: index }));
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges || invalid) return;
    setSaving(true);
    try {
      await onSave(changed.map((category) => ({ ...category, name: category.name.trim() })), created.map((category) => ({ name: category.name.trim(), sort_order: category.sort_order, is_active: category.is_active })));
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal category-manager-dialog" onMouseDown={(event) => event.stopPropagation()}><header><h2>Управление категориями</h2><IconButton icon={X} label="Закрыть" onClick={onClose} /></header><form onSubmit={submit}><div className="modal-body">{drafts.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderDrafts}><SortableContext items={drafts.map((item) => item.id)} strategy={verticalListSortingStrategy}><div className="category-manager-list">{drafts.map((category, index) => <SortableCategoryDraft key={category.id} category={category} autoFocus={Boolean(category.isNew && index === drafts.length - 1)} positionLabel={category.isNew ? "Новая категория" : positionCount(category.item_count)} onChange={(patch) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, ...patch } : item))} onDelete={() => { if (category.isNew) { setDrafts((current) => current.filter((item) => item.id !== category.id)); return; } void onRemove(category).then((removed) => { if (removed) setDrafts((current) => current.filter((item) => item.id !== category.id)); }); }} />)}</div></SortableContext></DndContext> : <div className="category-manager-empty">Категорий пока нет</div>}</div><footer><Button kind="secondary" icon={Plus} onClick={addDraft}>Новая категория</Button><div><Button kind="secondary" onClick={onClose}>Закрыть</Button><Button type="submit" disabled={!hasChanges || invalid || saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button></div></footer></form></section></div>;
}

function SortableCategoryDraft({ category, autoFocus, positionLabel, onChange, onDelete }: { category: CategoryDraft; autoFocus: boolean; positionLabel: string; onChange: (patch: Partial<CategoryDraft>) => void; onDelete: () => void }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return <div ref={setNodeRef} style={style} className={`category-manager-row ${category.isNew ? "new" : ""} ${isDragging ? "dragging" : ""}`}><button type="button" className="category-manager-drag" aria-label={t("Переместить категорию {name}", { name: category.name || t("Новая категория") })} {...attributes} {...listeners}><GripVertical size={17} /></button><div className="category-manager-copy"><input aria-label={category.isNew ? "Название новой категории" : `Название категории ${category.name}`} autoFocus={autoFocus} value={category.name} onChange={(event) => onChange({ name: event.target.value })} placeholder={category.isNew ? "Название новой категории" : undefined} /><small>{positionLabel}</small></div><label className="category-visibility"><span>{category.is_active ? "В меню" : "Скрыта"}</span><span className="switch"><input type="checkbox" aria-label={`${category.is_active ? "Скрыть" : "Опубликовать"} категорию ${category.name || "новую"}`} checked={category.is_active} onChange={(event) => onChange({ is_active: event.target.checked })} /><span /></span></label><button type="button" className="category-delete" disabled={!category.isNew && category.item_count > 0} aria-label={`Удалить ${category.isNew ? "новую категорию" : `категорию ${category.name}`}`} title={!category.isNew && category.item_count > 0 ? "Сначала удалите или перенесите позиции" : "Удалить категорию"} onClick={onDelete}><Trash2 size={17} /></button></div>;
}

function ItemEditDialog({ item, onClose, onSave }: { item: OwnerMenuItem; onClose: () => void; onSave: (input: MenuItemInput) => Promise<void> }) {
  const { categories } = useOwnerWorkspace(); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); try { await onSave(itemInput(item, { category_id: String(data.get("category")), name: String(data.get("name")), description: String(data.get("description")), price_minor: Math.round(Number(data.get("price")) * 100) })); } finally { setSaving(false); } };
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><header><h2>Редактировать позицию</h2><IconButton icon={X} label="Закрыть" onClick={onClose} /></header><form onSubmit={submit}><div className="modal-body form-grid"><label className="field wide"><span>Название</span><input name="name" defaultValue={item.name} required /></label><label className="field"><span>Категория</span><select name="category" defaultValue={item.category_id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="field"><span>Цена</span><input name="price" type="number" min="0" step="0.01" defaultValue={(item.price_minor / 100).toFixed(2)} required /></label><label className="field wide"><span>Описание</span><textarea name="description" defaultValue={item.description} /></label></div><footer><Button kind="secondary" onClick={onClose}>Отмена</Button><Button type="submit" disabled={saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button></footer></form></section></div>;
}

function MenuPreview({ venueName, items, onClose }: { venueName: string; items: OwnerMenuItem[]; onClose: () => void }) {
  return <div className="preview-backdrop" onMouseDown={onClose}><section className="menu-preview-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">ПУБЛИЧНОЕ МЕНЮ</p><h2>{venueName}</h2></div><IconButton icon={X} label="Закрыть предпросмотр" onClick={onClose} /></header><div className="preview-stage"><div className="preview-device desktop"><div className="preview-venue"><span>Меню заведения</span><h3>{venueName}</h3></div><div className="preview-menu-grid">{items.map((item) => <article key={item.id}>{item.image_url && <div className="food-image" style={{ backgroundImage: 'url("' + item.image_url + '")' }} />}<div><small>{item.category}</small><strong>{item.name}</strong><b>{money(item.price_minor / 100, item.currency)}</b></div></article>)}</div></div></div><footer><p>{items.length ? `Доступных позиций: ${items.length}` : "Нет опубликованных позиций"}</p><Button kind="secondary" onClick={onClose}>Закрыть</Button></footer></section></div>;
}
