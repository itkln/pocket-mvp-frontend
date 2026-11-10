"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Trash2, X } from "lucide-react";
import { type OwnerCategory, type OwnerMenuItem } from "../../../lib/owner-api";
import { useI18n } from "../i18n";
import { useLocalizedError } from "../error-message";
import { Button, IconButton, money } from "../ui";

type CategoryDraft = OwnerCategory & { isNew?: boolean };

const newCategoryDraft = (sortOrder: number): CategoryDraft => ({
  id: `new-category-${Date.now()}-${sortOrder}`,
  name: "",
  sort_order: sortOrder,
  is_active: true,
  preorder_enabled: true,
  item_count: 0,
  isNew: true,
});

type CategoryEditorProps = {
  categories: OwnerCategory[];
  initialCreate: boolean;
  createRequest?: number;
  newCategorySortOrder?: number;
  inline?: boolean;
  onClose: () => void;
  onRemove: (category: OwnerCategory) => Promise<boolean>;
  onSave: (
    categories: OwnerCategory[],
    newCategories: {
      name: string;
      sort_order: number;
      is_active: boolean;
      preorder_enabled: boolean;
    }[],
  ) => Promise<void>;
};

export function CategoryManagerDialog(props: CategoryEditorProps) {
  const { t } = useI18n();
  return (
    <div className="modal-backdrop" onMouseDown={props.onClose}>
      <section
        className="modal category-manager-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{t("Управление категориями")}</h2>
          <IconButton icon={X} label={t("Закрыть")} onClick={props.onClose} />
        </header>
        <CategoryEditor {...props} />
      </section>
    </div>
  );
}

export function CategoryEditor({
  categories,
  initialCreate,
  createRequest = 0,
  newCategorySortOrder = categories.length,
  inline = false,
  onRemove,
  onSave,
}: CategoryEditorProps) {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<CategoryDraft[]>(() => [
    ...categories.map((category) => ({ ...category })),
    ...(initialCreate ? [newCategoryDraft(newCategorySortOrder)] : []),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const errorMessage = useLocalizedError();
  const handledCreateRequest = useRef(createRequest);
  useEffect(() => {
    if (handledCreateRequest.current === createRequest) return;
    handledCreateRequest.current = createRequest;
    setDrafts((current) => [
      ...current,
      newCategoryDraft(newCategorySortOrder + current.filter((category) => category.isNew).length),
    ]);
  }, [createRequest, newCategorySortOrder]);
  const originals = new Map(categories.map((category) => [category.id, category]));
  const changed = drafts.filter((category) => {
    const original = originals.get(category.id);
    return (
      original &&
      (category.name.trim() !== original.name ||
        category.is_active !== original.is_active ||
        category.sort_order !== original.sort_order ||
        category.preorder_enabled !== original.preorder_enabled)
    );
  });
  const created = drafts.filter((category) => category.isNew && category.name.trim());
  const invalid = drafts.some((category) => !category.name.trim());
  const hasChanges = changed.length > 0 || created.length > 0;
  const positionCount = (count: number) =>
    count === 1 ? "1 позиция" : count >= 2 && count <= 4 ? `${count} позиции` : `${count} позиций`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges || invalid) return;
    setSaving(true);
    setError("");
    try {
      await onSave(
        changed.map((category) => ({ ...category, name: category.name.trim() })),
        created.map((category) => ({
          name: category.name.trim(),
          sort_order: category.sort_order,
          is_active: category.is_active,
          preorder_enabled: category.preorder_enabled,
        })),
      );
    } catch (caught) {
      setError(errorMessage(caught, "Не удалось сохранить изменения"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className={inline ? "category-editor category-inline-editor" : "category-editor"}
      onSubmit={submit}
    >
      <div className={inline ? "category-inline-body" : "modal-body"}>
        {drafts.length ? (
          <div className="category-manager-list">
            {drafts.map((category, index) => (
              <CategoryDraftRow
                key={category.id}
                category={category}
                autoFocus={Boolean(category.isNew && index === drafts.length - 1)}
                positionLabel={
                  category.isNew ? t("Новая категория") : t(positionCount(category.item_count))
                }
                onChange={(patch) =>
                  setDrafts((current) =>
                    current.map((item) => (item.id === category.id ? { ...item, ...patch } : item)),
                  )
                }
                onDelete={() => {
                  if (category.isNew) {
                    setDrafts((current) => current.filter((item) => item.id !== category.id));
                    return;
                  }
                  void onRemove(category)
                    .then((removed) => {
                      if (removed)
                        setDrafts((current) => current.filter((item) => item.id !== category.id));
                    })
                    .catch((caught) => setError(errorMessage(caught)));
                }}
              />
            ))}
          </div>
        ) : (
          <div className="category-manager-empty">{t("Категорий пока нет")}</div>
        )}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {t(error)}
        </p>
      )}
      <footer>
        <Button type="submit" disabled={!hasChanges || invalid || saving}>
          {saving ? t("Сохраняем...") : t("Сохранить")}
        </Button>
      </footer>
    </form>
  );
}

function CategoryDraftRow({
  category,
  autoFocus,
  positionLabel,
  onChange,
  onDelete,
}: {
  category: CategoryDraft;
  autoFocus: boolean;
  positionLabel: string;
  onChange: (patch: Partial<CategoryDraft>) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className={`category-manager-row ${category.isNew ? "new" : ""}`}>
      <div className="category-manager-copy">
        <input
          aria-label={
            category.isNew
              ? t("Название новой категории")
              : t("Название категории {name}", { name: category.name })
          }
          autoFocus={autoFocus}
          value={category.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={category.isNew ? t("Название новой категории") : undefined}
        />
        <small>{positionLabel}</small>
      </div>
      <label
        className="category-visibility"
        title={category.is_active ? t("Скрыть категорию") : t("Показывать категорию")}
      >
        <span>{t("Показывать в меню")}</span>
        <span className="switch">
          <input
            type="checkbox"
            aria-label={t(
              category.is_active ? "Скрыть категорию {name}" : "Опубликовать категорию {name}",
              { name: category.name || t("новую") },
            )}
            checked={category.is_active}
            onChange={(event) => onChange({ is_active: event.target.checked })}
          />
          <span />
        </span>
      </label>
      <button
        type="button"
        className="category-delete"
        disabled={!category.isNew && category.item_count > 0}
        aria-label={
          category.isNew
            ? t("Удалить новую категорию")
            : t("Удалить категорию {name}", { name: category.name })
        }
        title={
          !category.isNew && category.item_count > 0
            ? t("Сначала удалите или перенесите позиции")
            : t("Удалить категорию")
        }
        onClick={onDelete}
      >
        <Trash2 size={17} />
      </button>
      <label className="category-preorder">
        <span>{t("Предзаказ")}</span>
        <span className="switch">
          <input
            type="checkbox"
            aria-label={t("Предзаказ категории {name}", { name: category.name || t("новую") })}
            checked={category.preorder_enabled}
            onChange={(event) => onChange({ preorder_enabled: event.target.checked })}
          />
          <span />
        </span>
      </label>
    </div>
  );
}

export function MenuPreview({
  venueName,
  items,
  onClose,
}: {
  venueName: string;
  items: OwnerMenuItem[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="preview-backdrop" onMouseDown={onClose}>
      <section className="menu-preview-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">{t("ПУБЛИЧНОЕ МЕНЮ")}</p>
            <h2>{venueName}</h2>
          </div>
          <IconButton icon={X} label={t("Закрыть предпросмотр")} onClick={onClose} />
        </header>
        <div className="preview-stage">
          <div className="preview-device desktop">
            <div className="preview-venue">
              <span>{t("Меню заведения")}</span>
              <h3>{venueName}</h3>
            </div>
            <div className="preview-menu-grid">
              {items.map((item) => (
                <article key={item.id}>
                  {item.image_url && (
                    <div
                      className="food-image"
                      style={{ backgroundImage: 'url("' + item.image_url + '")' }}
                    />
                  )}
                  <div>
                    <small>{item.category}</small>
                    <strong>{item.name}</strong>
                    <b>{money(item.price_minor / 100, item.currency)}</b>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
        <footer>
          <p>
            {items.length
              ? t(`Доступных позиций: ${items.length}`)
              : t("Нет опубликованных позиций")}
          </p>
          <Button kind="secondary" onClick={onClose}>
            {t("Закрыть")}
          </Button>
        </footer>
      </section>
    </div>
  );
}
