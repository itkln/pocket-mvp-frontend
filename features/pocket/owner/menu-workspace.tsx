"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  GripVertical,
  ImagePlus,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Settings2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  type CategoryInput,
  type MenuItemInput,
  type OwnerCategory,
  type OwnerMenuItem,
  type OwnerVenue,
} from "../../../lib/owner-api";
import { copyMenuNutrition } from "../../../lib/menu-nutrition";
import { useConfirm } from "../confirm-dialog";
import { useI18n } from "../i18n";
import { Button, EmptyIllustration, IconButton, money } from "../ui";
import { useOwnerWorkspace } from "./context";
import { CategoryEditor } from "./menu-categories";
import { MenuItemDrawer, MenuCoverDrawer } from "./menu-drawers";

export const itemInput = (
  item: OwnerMenuItem,
  patch: Partial<MenuItemInput> = {},
): MenuItemInput => ({
  category_id: item.category_id,
  name: item.name,
  description: item.description,
  price_minor: item.price_minor,
  currency: item.currency,
  is_available: item.is_available,
  is_popular: item.is_popular,
  image_url: item.image_url,
  sort_order: item.sort_order,
  ...copyMenuNutrition(item),
  ...patch,
});

export function MenuManager({
  venueName,
  venue,
  onVenueUpdate,
  notify,
  canEditCover = true,
}: {
  // The venue cover is a venue setting: only the owner changes it.
  canEditCover?: boolean;
  venueName: string;
  venue?: OwnerVenue;
  onVenueUpdate?: (venue: OwnerVenue) => void;
  notify: (message: string) => void;
}) {
  const workspace = useOwnerWorkspace();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"menu" | "stop" | "photos">("menu");
  const [activeCategory, setActiveCategory] = useState("");
  const [categoriesMode, setCategoriesMode] = useState<"manage" | "create" | null>(null);
  const [createRequest, setCreateRequest] = useState(0);
  const [editor, setEditor] = useState<{ item?: OwnerMenuItem; categoryID: string } | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [actionItem, setActionItem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const operationInFlight = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const stoppedCategories = workspace.categories.filter((category) => !category.is_active);
  const stoppedItems = workspace.items.filter(
    (item) =>
      !item.is_available || stoppedCategories.some((category) => category.id === item.category_id),
  );
  const photoCount = workspace.items.filter((item) => item.image_url).length;
  const photoPercent = workspace.items.length
    ? Math.round((photoCount / workspace.items.length) * 100)
    : 0;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selectedCategory = workspace.categories.some((category) => category.id === activeCategory)
    ? activeCategory
    : workspace.categories[0]?.id;
  const groups = workspace.categories
    .filter((category) => mode === "stop" || category.id === selectedCategory)
    .map((category) => ({
      category,
      items: workspace.items.filter(
        (item) =>
          item.category_id === category.id &&
          (mode !== "stop" || !category.is_active || !item.is_available) &&
          (mode !== "photos" || !item.image_url) &&
          `${item.name} ${item.description ?? ""} ${category.name}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
      ),
    }))
    .filter(
      ({ category, items }) =>
        items.length ||
        (!normalizedQuery && mode === "menu") ||
        (mode === "stop" && !category.is_active && !normalizedQuery),
    );

  const run = async (operation: () => Promise<unknown>, message?: string) => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true);
    try {
      await operation();
      if (message) notify(message);
    } catch {
      /* Workspace reports API errors; keep the current view for retry. */
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  };
  const categoryInput = (category: OwnerCategory, patch: Partial<CategoryInput> = {}) => ({
    name: category.name,
    sort_order: category.sort_order,
    is_active: category.is_active,
    preorder_enabled: category.preorder_enabled,
    ...patch,
  });
  const enableAll = (categoryID?: string) =>
    run(async () => {
      // Run sequentially: every successful response stays visible even if a later update fails.
      for (const category of stoppedCategories.filter(
        (item) => !categoryID || item.id === categoryID,
      ))
        await workspace.editCategory(category.id, categoryInput(category, { is_active: true }));
      for (const item of workspace.items.filter(
        (item) => !item.is_available && (!categoryID || item.category_id === categoryID),
      ))
        await workspace.editItem(item.id, itemInput(item, { is_available: true }));
    }, "Доступность меню обновлена");
  const reorder = (event: DragEndEvent, categoryID?: string) => {
    if (!event.over || event.active.id === event.over.id) return;
    const ids = categoryID
      ? workspace.items.filter((item) => item.category_id === categoryID).map((item) => item.id)
      : workspace.categories.map((item) => item.id);
    const from = ids.indexOf(String(event.active.id)),
      to = ids.indexOf(String(event.over.id));
    if (from < 0 || to < 0) return;
    void run(
      () =>
        categoryID
          ? workspace.reorderItems(categoryID, arrayMove(ids, from, to))
          : workspace.reorderCategories(arrayMove(ids, from, to)),
      "Порядок сохранен",
    );
  };
  const remove = async (item: OwnerMenuItem) => {
    if (await confirm({ description: t("Удалить позицию «{name}»?", { name: item.name }) }))
      void run(() => workspace.removeItem(item.id), "Позиция удалена");
    setActionItem(null);
  };
  const createCategory = () => {
    setCategoriesMode("create");
    setCreateRequest((value) => value + 1);
  };

  return (
    <div className="vendor-menu">
      <header className="page-header vendor-menu-header">
        <div className="vendor-menu-heading">
          {mode === "stop" && (
            <button
              type="button"
              className="vendor-menu-back"
              aria-label={t("Назад к меню")}
              title={t("Назад к меню")}
              onClick={() => {
                setMode("menu");
                setQuery("");
              }}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div>
            <h1>{t(mode === "stop" ? "Стоп-лист" : "Меню")}</h1>
            <p>{venueName}</p>
          </div>
        </div>
        <label className="vendor-menu-search">
          <Search size={19} />
          <input
            aria-label={t("Поиск по меню")}
            placeholder={t("Найти блюдо")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" aria-label={t("Очистить поиск")} onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          )}
        </label>
      </header>
      {mode === "stop" ? (
        <div className="vendor-stop-summary">
          <div>
            <small>{t("В стоп-листе")}</small>
            <strong>
              {t("Категорий: {categories} · Позиций: {items}", {
                categories: stoppedCategories.length,
                items: stoppedItems.length,
              })}
            </strong>
          </div>
          <Button
            disabled={busy || (!stoppedItems.length && !stoppedCategories.length)}
            onClick={() => void enableAll()}
          >
            {t("Включить все")}
          </Button>
        </div>
      ) : (
        <div className="vendor-menu-stats">
          <button
            onClick={() => {
              setMode("stop");
              setQuery("");
            }}
          >
            <span className="vendor-stat-heading">
              {t("Стоп-лист")}
              <ChevronRight size={18} />
            </span>
            <strong>
              {stoppedItems.length
                ? t("Недоступно позиций: {count}", { count: stoppedItems.length })
                : t("Все позиции доступны")}
            </strong>
            <span className="vendor-stat-track">
              <i
                style={{
                  width: `${workspace.items.length ? ((workspace.items.length - stoppedItems.length) / workspace.items.length) * 100 : 0}%`,
                }}
              />
            </span>
            <small>{t("Отключено категорий: {count}", { count: stoppedCategories.length })}</small>
          </button>
          <button
            className={mode === "photos" ? "active" : ""}
            onClick={() => setMode((value) => (value === "photos" ? "menu" : "photos"))}
          >
            <span className="vendor-stat-heading">
              {t("Фотографии в меню")}
              <ChevronRight size={18} />
            </span>
            <strong>{photoPercent}%</strong>
            <span className="vendor-stat-track">
              <i style={{ width: `${photoPercent}%` }} />
            </span>
            <small>
              {t("С фото: {count} из {total}", {
                count: photoCount,
                total: workspace.items.length,
              })}
            </small>
          </button>
          {venue && canEditCover && (
            <button className="vendor-cover-summary" onClick={() => setCoverOpen(true)}>
              <span className="vendor-stat-heading">
                {t("Титульное фото")}
                <ChevronRight size={18} />
              </span>
              <span
                className="vendor-cover-mini"
                style={
                  typeof venue.settings.cover_image_url === "string" &&
                  venue.settings.cover_image_url
                    ? { backgroundImage: `url("${venue.settings.cover_image_url}")` }
                    : undefined
                }
              >
                <ImagePlus size={26} />
              </span>
              <small>{t("Обложка страницы заведения")}</small>
            </button>
          )}
        </div>
      )}
      {mode === "photos" && (
        <div className="vendor-photo-filter">
          <span>{t("Позиции без фотографии")}</span>
          <Button kind="quiet" icon={X} onClick={() => setMode("menu")}>
            {t("Все меню")}
          </Button>
        </div>
      )}
      <div
        className={`vendor-menu-layout ${mode === "stop" ? "stop-mode" : ""} ${categoriesMode ? "editing-categories" : ""}`}
      >
        {mode !== "stop" && (
          <aside className="vendor-category-panel">
            <header>
              <div>
                <h2>{t("Категории")}</h2>
                <small>{t("Всего: {count}", { count: workspace.categories.length })}</small>
              </div>
              <IconButton
                icon={categoriesMode ? X : Settings2}
                label={t(
                  categoriesMode ? "Закрыть редактирование категорий" : "Редактировать категории",
                )}
                onClick={() => setCategoriesMode((value) => (value ? null : "manage"))}
              />
              {categoriesMode !== "manage" && (
                <IconButton icon={Plus} label={t("Добавить категорию")} onClick={createCategory} />
              )}
            </header>
            {categoriesMode ? (
              <CategoryEditor
                key={categoriesMode}
                categories={categoriesMode === "create" ? [] : workspace.categories}
                newCategorySortOrder={workspace.categories.length}
                initialCreate={categoriesMode === "create"}
                createRequest={createRequest}
                inline
                onClose={() => setCategoriesMode(null)}
                onRemove={async (category) => {
                  if (category.item_count > 0) {
                    notify("Сначала перенесите или удалите позиции категории");
                    return false;
                  }
                  if (
                    !(await confirm({
                      description: t("Удалить категорию «{name}»?", { name: category.name }),
                    }))
                  )
                    return false;
                  await workspace.removeCategory(category.id);
                  return true;
                }}
                onSave={async (changed, created) => {
                  for (const category of changed)
                    await workspace.editCategory(category.id, categoryInput(category));
                  for (const category of created) await workspace.addCategory(category);
                  setCategoriesMode(null);
                  notify("Категории сохранены");
                }}
              />
            ) : (
              <div className="vendor-category-browse">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => reorder(event)}
                >
                  <SortableContext
                    items={workspace.categories.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {workspace.categories.map((category) => (
                      <CategoryLink
                        key={category.id}
                        category={category}
                        disabled={busy}
                        stopped={
                          workspace.items.filter(
                            (item) => item.category_id === category.id && !item.is_available,
                          ).length
                        }
                        active={selectedCategory === category.id}
                        onSelect={() => {
                          setActiveCategory(category.id);
                          setQuery("");
                          setActionItem(null);
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </aside>
        )}
        <div className="vendor-menu-groups">
          {groups.map(({ category, items }) => (
            <section
              className="vendor-menu-group"
              id={`vendor-category-${category.id}`}
              key={category.id}
            >
              <header>
                <AvailabilitySwitch
                  checked={category.is_active}
                  disabled={busy}
                  label={t("Доступность категории {name}", { name: category.name })}
                  onChange={() =>
                    void run(() =>
                      workspace.editCategory(
                        category.id,
                        categoryInput(category, { is_active: !category.is_active }),
                      ),
                    )
                  }
                />
                <div>
                  <h2>{category.name}</h2>
                  <small>
                    {!category.is_active
                      ? t("Категория отключена")
                      : t("Позиций: {count}", { count: items.length })}
                  </small>
                </div>
                {mode === "stop" ? (
                  <Button
                    kind="secondary"
                    disabled={busy}
                    onClick={() => void enableAll(category.id)}
                  >
                    {t("Включить все")}
                  </Button>
                ) : (
                  <Button
                    kind="secondary"
                    icon={Plus}
                    onClick={() => setEditor({ categoryID: category.id })}
                  >
                    {t("Добавить")}
                  </Button>
                )}
              </header>
              {!category.is_active && (
                <p className="vendor-category-notice">
                  {t("Блюда этой категории скрыты от гостей до её включения.")}
                </p>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => reorder(event, category.id)}
              >
                <SortableContext
                  items={items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item) => (
                    <MenuRow
                      key={item.id}
                      item={item}
                      busy={busy}
                      reorderEnabled={mode === "menu" && !normalizedQuery && !busy}
                      categoryActive={category.is_active}
                      actionOpen={actionItem === item.id}
                      onEdit={() => {
                        setActionItem(null);
                        setEditor({ item, categoryID: category.id });
                      }}
                      onActions={() => setActionItem(actionItem === item.id ? null : item.id)}
                      onAvailable={() =>
                        void run(() =>
                          workspace.editItem(
                            item.id,
                            itemInput(item, { is_available: !item.is_available }),
                          ),
                        )
                      }
                      onPopular={() => {
                        setActionItem(null);
                        void run(() =>
                          workspace.editItem(
                            item.id,
                            itemInput(item, { is_popular: !item.is_popular }),
                          ),
                        );
                      }}
                      onDuplicate={() => {
                        setActionItem(null);
                        void run(
                          () =>
                            workspace.addItem({
                              ...itemInput(item),
                              name: `${item.name} — копия`,
                              is_available: false,
                              is_popular: false,
                              sort_order: undefined,
                            }),
                          "Копия позиции создана",
                        );
                      }}
                      onRemove={() => void remove(item)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {!items.length && (
                <p className="vendor-menu-empty">{t("Добавьте первую позицию в эту категорию")}</p>
              )}
            </section>
          ))}
          {!groups.length && (
            <div className="vendor-menu-group">
              <EmptyIllustration
                icon={LayoutGrid}
                title={t(
                  mode === "stop"
                    ? "Стоп-лист пуст"
                    : mode === "photos"
                      ? "Нет позиций без фото"
                      : "Позиции не найдены",
                )}
                text={t(
                  query
                    ? "Измените поисковый запрос."
                    : workspace.categories.length
                      ? "Все изменения сохраняются в меню заведения."
                      : "Сначала создайте категорию, затем добавьте первую позицию.",
                )}
              />
              {!workspace.categories.length && mode === "menu" && (
                <Button icon={Plus} onClick={createCategory}>
                  {t("Добавить категорию")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {editor && (
        <MenuItemDrawer
          item={editor.item}
          categoryID={editor.categoryID}
          categories={workspace.categories}
          currency={venue?.currency ?? "EUR"}
          onClose={() => setEditor(null)}
          onSave={async (input) => {
            if (editor.item) await workspace.editItem(editor.item.id, input);
            else await workspace.addItem(input);
            setEditor(null);
            notify(editor.item ? "Позиция обновлена" : "Позиция добавлена");
          }}
        />
      )}
      {coverOpen && venue && (
        <MenuCoverDrawer
          venue={venue}
          onClose={() => setCoverOpen(false)}
          onSave={(updated) => {
            onVenueUpdate?.(updated);
            setCoverOpen(false);
            notify("Изменения сохранены");
          }}
        />
      )}
    </div>
  );
}

function CategoryLink({
  category,
  stopped,
  active,
  disabled,
  onSelect,
}: {
  category: OwnerCategory;
  stopped: number;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`vendor-category-link ${active ? "active" : ""}`}
    >
      <button aria-pressed={active} onClick={onSelect}>
        <strong>{category.name}</strong>
        <small>
          {!category.is_active
            ? t("Категория отключена")
            : stopped
              ? t("Недоступно позиций: {count}", { count: stopped })
              : t("Позиций: {count}", { count: category.item_count })}
        </small>
      </button>
      <button
        className="vendor-drag"
        aria-label={t("Переместить категорию {name}", { name: category.name })}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
    </div>
  );
}

export function AvailabilitySwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="switch vendor-availability">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={onChange}
      />
      <span />
    </label>
  );
}

function MenuRow({
  item,
  busy,
  reorderEnabled,
  categoryActive,
  actionOpen,
  onEdit,
  onActions,
  onAvailable,
  onPopular,
  onDuplicate,
  onRemove,
}: {
  item: OwnerMenuItem;
  busy: boolean;
  reorderEnabled: boolean;
  categoryActive: boolean;
  actionOpen: boolean;
  onEdit: () => void;
  onActions: () => void;
  onAvailable: () => void;
  onPopular: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !reorderEnabled,
  });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`vendor-menu-row ${isDragging ? "dragging" : ""}`}
    >
      <AvailabilitySwitch
        checked={item.is_available}
        disabled={busy}
        label={t("Доступность позиции {name}", { name: item.name })}
        onChange={onAvailable}
      />
      <button
        className="vendor-menu-item"
        onClick={onEdit}
        aria-label={t("Редактировать {name}", { name: item.name })}
      >
        <span
          className="vendor-dish-thumb"
          style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined}
        >
          {!item.image_url && <ImagePlus size={21} />}
        </span>
        <span>
          <strong>
            {item.name}
            {item.is_popular && <Star size={14} />}
          </strong>
          <small>
            {!categoryActive
              ? t("Категория отключена")
              : !item.is_available
                ? t("В стоп-листе")
                : item.description}
          </small>
        </span>
      </button>
      <strong className="vendor-menu-price">{money(item.price_minor / 100, item.currency)}</strong>
      <div className="row-actions">
        <IconButton
          icon={Ellipsis}
          label={t("Действия с позицией {name}", { name: item.name })}
          onClick={onActions}
        />
        {actionOpen && (
          <div className="row-actions-menu">
            <button onClick={onEdit}>
              <Pencil size={16} />
              {t("Редактировать")}
            </button>
            <button disabled={busy} onClick={onPopular}>
              <Star size={16} />
              {t(item.is_popular ? "Убрать «Хит»" : "Отметить как «Хит»")}
            </button>
            <button disabled={busy} onClick={onDuplicate}>
              <Copy size={16} />
              {t("Создать копию")}
            </button>
            <button disabled={busy} className="danger" onClick={onRemove}>
              <Trash2 size={16} />
              {t("Удалить")}
            </button>
          </div>
        )}
      </div>
      {reorderEnabled && (
        <button
          className="vendor-drag"
          aria-label={t("Переместить позицию {name}", { name: item.name })}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
      )}
    </article>
  );
}
