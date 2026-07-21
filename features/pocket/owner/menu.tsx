"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, Copy, Ellipsis, Eye, LayoutGrid, List, Pencil, Plus, Search, Settings2, Star, Trash2, X } from "lucide-react";
import { type MenuItemInput, type OwnerCategory, type OwnerMenuItem } from "../../../lib/owner-api";
import { Button, EmptyIllustration, IconButton, PageHeader, money } from "../ui";
import { useOwnerWorkspace } from "./context";

export function MenuManager({ venueName, onAdd, notify }: { venueName: string; onAdd: () => void; notify: (message: string) => void }) {
  const workspace = useOwnerWorkspace();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoriesMode, setCategoriesMode] = useState<"manage" | "create" | null>(null);
  const [actionItem, setActionItem] = useState<string | null>(null);
  const [editing, setEditing] = useState<OwnerMenuItem | null>(null);
  const [preview, setPreview] = useState(false);
  const filtered = useMemo(() => workspace.items.filter((item) => (category === "all" || item.category_id === category) && (item.name + " " + (item.description ?? "")).toLowerCase().includes(query.toLowerCase())), [workspace.items, category, query]);

  const duplicate = async (item: OwnerMenuItem) => {
    await workspace.addItem({ category_id: item.category_id, name: item.name + " — копия", description: item.description, price_minor: item.price_minor, currency: item.currency, is_available: false, is_popular: false, image_url: item.image_url });
    setActionItem(null); notify("Копия позиции создана");
  };
  const remove = async (item: OwnerMenuItem) => {
    if (!window.confirm("Удалить «" + item.name + "»?")) return;
    await workspace.removeItem(item.id); setActionItem(null); notify("Позиция удалена");
  };
  const removeCategory = async (item: OwnerCategory) => {
    if (item.item_count > 0) { notify("Сначала перенесите или удалите позиции категории"); return false; }
    if (!window.confirm("Удалить категорию «" + item.name + "»?")) return false;
    await workspace.removeCategory(item.id);
    if (category === item.id) setCategory("all");
    notify("Категория удалена");
    return true;
  };

  return <><PageHeader title="Меню" subtitle="Категории, цены и доступность блюд." actions={<><Button kind="secondary" icon={Eye} onClick={() => setPreview(true)}>Предпросмотр</Button><div className="menu-create-menu"><Button icon={Plus} onClick={() => setCreateOpen((value) => !value)}>Добавить</Button>{createOpen && <CreateMenu onItem={() => { setCreateOpen(false); onAdd(); }} onCategory={() => { setCreateOpen(false); setCategoriesMode("create"); }} />}</div></>} />
    <div className={`mobile-create-fab ${createOpen ? "open" : ""}`}>{createOpen && <div className="mobile-create-popover"><CreateMenuContent onItem={() => { setCreateOpen(false); onAdd(); }} onCategory={() => { setCreateOpen(false); setCategoriesMode("create"); }} /></div>}<button className="mobile-create-trigger" aria-label={createOpen ? "Закрыть меню создания" : "Добавить в меню"} onClick={() => setCreateOpen((value) => !value)}>{createOpen ? <X size={25} /> : <Plus size={25} />}</button></div>
    <div className="menu-layout"><aside className="category-list"><div className="category-list-heading"><strong>Категории</strong><IconButton icon={Settings2} label="Управление категориями" onClick={() => setCategoriesMode("manage")} /></div><button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}><span>Все позиции</span><b>{workspace.items.length}</b></button>{workspace.categories.map((item) => <button className={category === item.id ? "active" : ""} key={item.id} onClick={() => setCategory(item.id)}><span>{item.name}</span><b>{item.item_count}</b></button>)}</aside><section><div className="list-toolbar menu-list-toolbar"><p>Позиций: <strong>{filtered.length}</strong></p><div className="menu-filter-row"><label className="mobile-category-select"><LayoutGrid size={16} /><select aria-label="Категория меню" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Все позиции</option>{workspace.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></label><IconButton icon={Settings2} className="mobile-category-manage" label="Управление категориями" onClick={() => setCategoriesMode("manage")} /><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти блюдо" /></label></div></div><div className="menu-view-row"><span>Вид меню</span><div className="view-toggle"><IconButton icon={LayoutGrid} label="Показать сеткой" active={view === "grid"} onClick={() => setView("grid")} /><IconButton icon={List} label="Показать списком" active={view === "list"} onClick={() => setView("list")} /></div></div>
      {filtered.length ? <div className={"menu-items " + view}>{filtered.map((item) => <article className="menu-card" key={item.id}>{item.image_url ? <div className="food-image" style={{ backgroundImage: 'url("' + item.image_url + '")' }} role="img" aria-label={item.name} /> : <div className="food-image menu-image-placeholder"><span>{item.name.at(0)}</span></div>}<div className="menu-card-body">{item.is_popular && <span className="menu-status"><Star size={12} />Хит</span>}<small>{item.category}</small><h3>{item.name}</h3><p>{item.description || "Описание не добавлено"}</p><footer><strong>{money(item.price_minor / 100, item.currency)}</strong><label className="switch" title={item.is_available ? "Скрыть позицию" : "Опубликовать позицию"}><input type="checkbox" checked={item.is_available} onChange={() => void workspace.editItem(item.id, itemInput(item, { is_available: !item.is_available }))} /><span /></label><IconButton icon={Pencil} label="Редактировать" onClick={() => setEditing(item)} /><div className="row-actions"><IconButton icon={Ellipsis} label="Действия с позицией" onClick={() => setActionItem(actionItem === item.id ? null : item.id)} />{actionItem === item.id && <div className="row-actions-menu"><button onClick={() => { setEditing(item); setActionItem(null); }}><Pencil size={16} />Редактировать</button><button onClick={() => void workspace.editItem(item.id, itemInput(item, { is_popular: !item.is_popular })).then(() => setActionItem(null))}><Star size={16} />{item.is_popular ? "Убрать «Хит»" : "Отметить как «Хит»"}</button><button onClick={() => void duplicate(item)}><Copy size={16} />Создать копию</button><button className="danger" onClick={() => void remove(item)}><Trash2 size={16} />Удалить</button></div>}</div></footer></div></article>)}</div> : <div className="panel"><EmptyIllustration icon={LayoutGrid} title={workspace.categories.length ? "Позиции не найдены" : "Меню пока пустое"} text={workspace.categories.length ? "Измените категорию или поисковый запрос." : "Сначала создайте категорию, затем добавьте первую позицию."} /></div>}</section></div>
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

const itemInput = (item: OwnerMenuItem, patch: Partial<MenuItemInput> = {}): MenuItemInput => ({ category_id: item.category_id, name: item.name, description: item.description, price_minor: item.price_minor, currency: item.currency, is_available: item.is_available, is_popular: item.is_popular, image_url: item.image_url, ...patch });

type CategoryDraft = OwnerCategory & { isNew?: boolean };

const newCategoryDraft = (sortOrder: number): CategoryDraft => ({ id: `new-category-${Date.now()}-${sortOrder}`, name: "", sort_order: sortOrder, is_active: true, item_count: 0, isNew: true });

export function CategoryManagerDialog({ categories, initialCreate, onClose, onRemove, onSave }: { categories: OwnerCategory[]; initialCreate: boolean; onClose: () => void; onRemove: (category: OwnerCategory) => Promise<boolean>; onSave: (categories: OwnerCategory[], newCategories: { name: string; sort_order: number; is_active: boolean }[]) => Promise<void> }) {
  const [drafts, setDrafts] = useState<CategoryDraft[]>(() => [...categories.map((category) => ({ ...category })), ...(initialCreate ? [newCategoryDraft(categories.length)] : [])]);
  const [saving, setSaving] = useState(false);
  const originals = new Map(categories.map((category) => [category.id, category]));
  const changed = drafts.filter((category) => {
    const original = originals.get(category.id);
    return original && (category.name.trim() !== original.name || category.is_active !== original.is_active);
  });
  const created = drafts.filter((category) => category.isNew && category.name.trim());
  const invalid = drafts.some((category) => !category.name.trim());
  const hasChanges = changed.length > 0 || created.length > 0;
  const positionCount = (count: number) => count === 1 ? "1 позиция" : count >= 2 && count <= 4 ? `${count} позиции` : `${count} позиций`;
  const addDraft = () => setDrafts((current) => [...current, newCategoryDraft(Math.max(-1, ...current.map((category) => category.sort_order)) + 1)]);

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

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal category-manager-dialog" onMouseDown={(event) => event.stopPropagation()}><header><h2>Управление категориями</h2><IconButton icon={X} label="Закрыть" onClick={onClose} /></header><form onSubmit={submit}><div className="modal-body">{drafts.length ? <div className="category-manager-list">{drafts.map((category, index) => <div className={`category-manager-row ${category.isNew ? "new" : ""}`} key={category.id}><div><input aria-label={category.isNew ? "Название новой категории" : `Название категории ${category.name}`} autoFocus={category.isNew && index === drafts.length - 1} value={category.name} onChange={(event) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item))} placeholder={category.isNew ? "Название новой категории" : undefined} /><small>{category.isNew ? "Новая категория" : positionCount(category.item_count)}</small></div><label className="category-visibility"><span>{category.is_active ? "В меню" : "Скрыта"}</span><span className="switch"><input type="checkbox" aria-label={`${category.is_active ? "Скрыть" : "Опубликовать"} категорию ${category.name || "новую"}`} checked={category.is_active} onChange={(event) => setDrafts((current) => current.map((item) => item.id === category.id ? { ...item, is_active: event.target.checked } : item))} /><span /></span></label><button type="button" className="category-delete" disabled={!category.isNew && category.item_count > 0} aria-label={`Удалить ${category.isNew ? "новую категорию" : `категорию ${category.name}`}`} title={!category.isNew && category.item_count > 0 ? "Сначала удалите или перенесите позиции" : "Удалить категорию"} onClick={() => { if (category.isNew) { setDrafts((current) => current.filter((item) => item.id !== category.id)); return; } void onRemove(category).then((removed) => { if (removed) setDrafts((current) => current.filter((item) => item.id !== category.id)); }); }}><Trash2 size={17} /></button></div>)}</div> : <div className="category-manager-empty">Категорий пока нет</div>}</div><footer><Button kind="secondary" icon={Plus} onClick={addDraft}>Новая категория</Button><div><Button kind="secondary" onClick={onClose}>Закрыть</Button><Button type="submit" disabled={!hasChanges || invalid || saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button></div></footer></form></section></div>;
}

function ItemEditDialog({ item, onClose, onSave }: { item: OwnerMenuItem; onClose: () => void; onSave: (input: MenuItemInput) => Promise<void> }) {
  const { categories } = useOwnerWorkspace(); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); try { await onSave(itemInput(item, { category_id: String(data.get("category")), name: String(data.get("name")), description: String(data.get("description")), price_minor: Math.round(Number(data.get("price")) * 100) })); } finally { setSaving(false); } };
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><header><h2>Редактировать позицию</h2><IconButton icon={X} label="Закрыть" onClick={onClose} /></header><form onSubmit={submit}><div className="modal-body form-grid"><label className="field wide"><span>Название</span><input name="name" defaultValue={item.name} required /></label><label className="field"><span>Категория</span><select name="category" defaultValue={item.category_id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="field"><span>Цена</span><input name="price" type="number" min="0" step="0.01" defaultValue={(item.price_minor / 100).toFixed(2)} required /></label><label className="field wide"><span>Описание</span><textarea name="description" defaultValue={item.description} /></label></div><footer><Button kind="secondary" onClick={onClose}>Отмена</Button><Button type="submit" disabled={saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button></footer></form></section></div>;
}

function MenuPreview({ venueName, items, onClose }: { venueName: string; items: OwnerMenuItem[]; onClose: () => void }) {
  return <div className="preview-backdrop" onMouseDown={onClose}><section className="menu-preview-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">ПУБЛИЧНОЕ МЕНЮ</p><h2>{venueName}</h2></div><IconButton icon={X} label="Закрыть предпросмотр" onClick={onClose} /></header><div className="preview-stage"><div className="preview-device desktop"><div className="preview-venue"><span>Меню заведения</span><h3>{venueName}</h3></div><div className="preview-menu-grid">{items.map((item) => <article key={item.id}>{item.image_url && <div className="food-image" style={{ backgroundImage: 'url("' + item.image_url + '")' }} />}<div><small>{item.category}</small><strong>{item.name}</strong><b>{money(item.price_minor / 100, item.currency)}</b></div></article>)}</div></div></div><footer><p>{items.length ? `Доступных позиций: ${items.length}` : "Нет опубликованных позиций"}</p><Button kind="secondary" onClick={onClose}>Закрыть</Button></footer></section></div>;
}
