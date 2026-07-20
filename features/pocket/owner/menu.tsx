"use client";

import { useState } from "react";
import { ArrowUpDown, ChevronDown, Copy, Ellipsis, Eye, EyeOff, LayoutGrid, Pencil, Plus, Rows3, Search, Sparkles, Trash2, UserRound, Utensils, X } from "lucide-react";
import { menuItems } from "../model";
import { money, Button, IconButton, FoodImage, PageHeader, Field } from "../ui";

export function MenuManager({ venueName, onAdd, notify }: { venueName: string; onAdd: () => void; notify: (message: string) => void }) {
  const [category, setCategory] = useState("Все позиции");
  const [categories, setCategories] = useState(["Все позиции", "Закуски", "Паста", "Основное", "Десерты", "Напитки"]);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [actionsItem, setActionsItem] = useState<number | null>(null);
  const visible = category === "Все позиции" ? menuItems : menuItems.filter((item) => item.category === category);
  const positionWord = visible.length % 10 === 1 && visible.length % 100 !== 11 ? "позиция" : visible.length % 10 >= 2 && visible.length % 10 <= 4 && (visible.length % 100 < 12 || visible.length % 100 > 14) ? "позиции" : "позиций";
  const counts: Record<string, number> = { "Все позиции": 32, "Закуски": 5, "Паста": 6, "Основное": 9, "Десерты": 5, "Напитки": 7 };
  const addCategory = () => {
    const nextCategory = categoryDraft.trim();
    if (!nextCategory || categories.includes(nextCategory)) return;
    setCategories((current) => [...current, nextCategory]);
    setCategory(nextCategory);
    setCategoryDraft("");
    setCategoryDialogOpen(false);
    notify("Категория добавлена");
  };
  const runAction = (message: string) => {
    setActionsItem(null);
    notify(message);
  };
  const addMenuItem = () => {
    setCreateMenuOpen(false);
    onAdd();
  };
  const openCategoryDialog = () => {
    setCreateMenuOpen(false);
    setCategoryDialogOpen(true);
  };
  const pageActions = <><Button kind="secondary" icon={Eye} onClick={() => setPreviewOpen(true)}>Предпросмотр</Button><div className="menu-create-menu"><Button icon={Plus} onClick={() => setCreateMenuOpen((open) => !open)}>Добавить <ChevronDown size={15} /></Button>{createMenuOpen && <div className="menu-create-popover"><button onClick={addMenuItem}><Utensils size={17} /><span><strong>Позицию</strong><small>Новое блюдо или напиток</small></span></button><button onClick={openCategoryDialog}><Rows3 size={17} /><span><strong>Категорию</strong><small>Новый раздел меню</small></span></button></div>}</div></>;

  return <>
    <PageHeader title="Меню" subtitle="Управляйте категориями, ценами и доступностью блюд." actions={pageActions} />
    <div className="menu-layout">
      <aside className="category-list">
        <div className="category-heading"><strong>Категории</strong></div>
        {categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}><span>{item}</span><b>{counts[item] ?? 0}</b></button>)}
      </aside>
      <section className="menu-items-section">
        <div className="list-toolbar menu-list-toolbar"><label className="mobile-category-select"><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Категория меню">{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} /></label><p><strong>{visible.length}</strong> {positionWord}</p><div><label className="search-field"><Search size={17} /><input placeholder="Найти блюдо" /></label></div></div>
        <div className="menu-view-row"><span>Вид меню</span><div className="view-toggle" aria-label="Вид меню"><IconButton icon={LayoutGrid} label="Показать сеткой" active={view === "grid"} onClick={() => setView("grid")} /><IconButton icon={Rows3} label="Показать списком" active={view === "list"} onClick={() => setView("list")} /></div></div>
        <div className={`manager-grid view-${view}`}>{visible.map((item) => <article className="manager-item" key={item.id}><FoodImage item={item} />{item.popular && <span className="menu-status"><Sparkles size={12} />Хит</span>}<div className="manager-copy"><div><small>{item.category}</small></div><h3>{item.name}</h3><p>{item.description}</p><footer><strong>{money(item.price)}</strong><label className="switch"><input type="checkbox" defaultChecked onChange={() => notify("Доступность обновлена")} /><span /></label><IconButton icon={Pencil} label="Редактировать" onClick={onAdd} /><IconButton icon={Ellipsis} label="Действия с позицией" active={actionsItem === item.id} onClick={() => setActionsItem((current) => current === item.id ? null : item.id)} /></footer>{actionsItem === item.id && <div className="item-actions-menu"><button onClick={() => { setActionsItem(null); onAdd(); }}><Pencil size={16} />Редактировать</button><button onClick={() => runAction(`${item.name}: копия создана`)}><Copy size={16} />Дублировать</button><button onClick={() => runAction(`${item.name}: выберите новую категорию`)}><ArrowUpDown size={16} />Переместить в категорию</button><button onClick={() => runAction(`${item.name}: скрыто из меню`)}><EyeOff size={16} />Скрыть из меню</button><button className="danger" onClick={() => runAction(`${item.name}: удалено`)}><Trash2 size={16} />Удалить</button></div>}</div></article>)}</div>
      </section>
    </div>
    {actionsItem === null && <div className={`mobile-create-fab ${createMenuOpen ? "open" : ""}`}>
      {createMenuOpen && <div className="mobile-create-popover"><button onClick={addMenuItem}><Utensils size={20} /><span><strong>Добавить позицию</strong><small>Новое блюдо или напиток</small></span></button><button onClick={openCategoryDialog}><Rows3 size={20} /><span><strong>Добавить категорию</strong><small>Новый раздел меню</small></span></button></div>}
      <button className="mobile-create-trigger" aria-label={createMenuOpen ? "Закрыть меню создания" : "Открыть меню создания"} onClick={() => setCreateMenuOpen((open) => !open)}>{createMenuOpen ? <X size={27} /> : <Pencil size={24} fill="currentColor" />}</button>
    </div>}
    {categoryDialogOpen && <CategoryDialog value={categoryDraft} onChange={setCategoryDraft} onSubmit={addCategory} onClose={() => { setCategoryDialogOpen(false); setCategoryDraft(""); }} />}
    {previewOpen && <MenuPreview venueName={venueName} onClose={() => setPreviewOpen(false)} />}
  </>;
}

export function CategoryDialog({ value, onChange, onSubmit, onClose }: { value: string; onChange: (value: string) => void; onSubmit: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal category-dialog" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>Новая категория</h2><p>Добавьте понятное название для раздела меню.</p></div><IconButton icon={X} label="Закрыть" onClick={onClose} /></header><div className="modal-body"><Field label="Название категории"><input autoFocus value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSubmit()} placeholder="Например, Завтраки" /></Field></div><footer><Button kind="secondary" onClick={onClose}>Отмена</Button><Button icon={Plus} disabled={!value.trim()} onClick={onSubmit}>Создать категорию</Button></footer></section></div>;
}

export function MenuPreview({ venueName, onClose }: { venueName: string; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return <div className="preview-backdrop" onMouseDown={onClose}><section className="menu-preview-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">ПУБЛИЧНОЕ МЕНЮ</p><h2>Предпросмотр {venueName}</h2></div><div className="preview-actions"><div className="view-toggle"><IconButton icon={LayoutGrid} label="Широкий экран" active={device === "desktop"} onClick={() => setDevice("desktop")} /><IconButton icon={UserRound} label="Мобильный экран" active={device === "mobile"} onClick={() => setDevice("mobile")} /></div><IconButton icon={X} label="Закрыть предпросмотр" onClick={onClose} /></div></header><div className="preview-stage"><div className={`preview-device ${device}`}><div className="preview-cover" /><div className="preview-venue"><span>Открыто до 22:30</span><h3>{venueName}</h3><p>Современная европейская · €€</p></div><div className="preview-tabs"><b>Все</b><span>Закуски</span><span>Основное</span><span>Десерты</span></div><div className="preview-menu-grid">{menuItems.slice(0, device === "mobile" ? 2 : 3).map((item) => <article key={item.id}><FoodImage item={item} />{item.popular && <span>Хит</span>}<div><small>{item.category}</small><strong>{item.name}</strong><b>{money(item.price)}</b></div></article>)}</div></div></div><footer><p>Так меню увидят гости по ссылке и QR-коду стола.</p><Button kind="secondary" onClick={onClose}>Закрыть</Button></footer></section></div>;
}


