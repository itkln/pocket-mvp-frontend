"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import {
  listOwnerVenues,
  updateOwnerVenue,
  type MenuItemInput,
  type OwnerCategory,
  type OwnerMenuItem,
  type OwnerVenue,
} from "../../../lib/owner-api";
import { readMenuNutrition } from "../../../lib/menu-nutrition";
import { useI18n } from "../i18n";
import { useLocalizedError } from "../error-message";
import { MenuImageField } from "../menu-image-field";
import { MenuNutritionFields } from "../menu-nutrition-fields";
import { Button } from "../ui";
import { prepareCoverImage } from "./venue";

function MenuDrawer({
  title,
  children,
  onClose,
  busy,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="vendor-menu-drawer"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="vendor-drawer-inner">
        <header>
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Закрыть")}
            disabled={busy}
            onClick={onClose}
          >
            <X size={23} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

export function MenuItemDrawer({
  item,
  categoryID,
  categories,
  currency,
  onClose,
  onSave,
}: {
  item?: OwnerMenuItem;
  categoryID: string;
  categories: OwnerCategory[];
  currency: string;
  onClose: () => void;
  onSave: (input: MenuItemInput) => Promise<void>;
}) {
  const { t } = useI18n();
  const errorMessage = useLocalizedError();
  const [imageURL, setImageURL] = useState(item?.image_url ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [processingImage, setProcessingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || processingImage) return;
    const data = new FormData(event.currentTarget);
    if (!name.trim()) {
      setError(t("Укажите название позиции"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        category_id: String(data.get("category")),
        name: name.trim(),
        description: String(data.get("description")).trim(),
        price_minor: Math.round(Number(data.get("price")) * 100),
        currency: item?.currency ?? currency,
        sort_order: item?.sort_order,
        image_url: imageURL,
        is_available: data.has("available"),
        is_popular: data.has("popular"),
        ...readMenuNutrition(data),
      });
    } catch (caught) {
      setError(errorMessage(caught, "Не удалось сохранить изменения"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <MenuDrawer
      title={item?.name ?? t("Новая позиция")}
      onClose={onClose}
      busy={saving || processingImage}
    >
      <form onSubmit={submit}>
        <fieldset className="vendor-drawer-content" disabled={saving}>
          <section className="vendor-editor-card">
            <h3>{t("Основная информация")}</h3>
            <label className="field">
              <span>{t("Название")}</span>
              <input
                autoFocus
                name="name"
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("Категория")}</span>
              <select name="category" defaultValue={item?.category_id ?? categoryID} required>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("Описание")}</span>
              <textarea
                name="description"
                maxLength={2000}
                rows={3}
                defaultValue={item?.description}
              />
            </label>
          </section>
          <section className="vendor-editor-card">
            <h3>{t("Доступность блюда")}</h3>
            <label className="vendor-editor-toggle">
              <span>
                <strong>{t("Доступно для заказа")}</strong>
                <small>{t("Отключённая позиция попадёт в стоп-лист")}</small>
              </span>
              <span className="switch">
                <input
                  name="available"
                  type="checkbox"
                  defaultChecked={item?.is_available ?? true}
                />
                <span />
              </span>
            </label>
            <label className="vendor-editor-toggle">
              <span>{t("Отметка «Хит»")}</span>
              <span className="switch">
                <input name="popular" type="checkbox" defaultChecked={item?.is_popular ?? false} />
                <span />
              </span>
            </label>
          </section>
          <section className="vendor-editor-card">
            <h3>{t("Фотография")}</h3>
            <MenuImageField
              value={imageURL}
              name={name}
              onChange={setImageURL}
              onProcessingChange={setProcessingImage}
            />
          </section>
          <section className="vendor-editor-card">
            <h3>{t("Цена и пищевая ценность")}</h3>
            <label className="field">
              <span>
                {t("Цена")} · {item?.currency ?? currency}
              </span>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={item ? (item.price_minor / 100).toFixed(2) : ""}
                placeholder="0.00"
              />
            </label>
            <MenuNutritionFields item={item} />
          </section>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </fieldset>
        <footer>
          <Button kind="secondary" disabled={saving || processingImage} onClick={onClose}>
            {t("Отмена")}
          </Button>
          <Button type="submit" disabled={saving || processingImage || !categories.length}>
            {t(saving ? "Сохраняем..." : item ? "Сохранить" : "Добавить в меню")}
          </Button>
        </footer>
      </form>
    </MenuDrawer>
  );
}

export function MenuCoverDrawer({
  venue,
  onClose,
  onSave,
}: {
  venue: OwnerVenue;
  onClose: () => void;
  onSave: (venue: OwnerVenue) => void;
}) {
  const { t } = useI18n();
  const errorMessage = useLocalizedError();
  const original =
    typeof venue.settings.cover_image_url === "string" ? venue.settings.cover_image_url : "";
  const [image, setImage] = useState(original);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const select = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError(t("Выберите JPG, PNG или WebP до 10 МБ"));
      return;
    }
    setProcessing(true);
    setError("");
    try {
      setImage(await prepareCoverImage(file));
    } catch {
      setError(t("Не удалось обработать изображение"));
    } finally {
      setProcessing(false);
    }
  };
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      // Read the latest settings so saving a cover cannot overwrite other venue changes.
      const latest = (await listOwnerVenues()).find((item) => item.id === venue.id);
      if (!latest) throw new Error("Venue not found");
      const settings = Object.fromEntries(
        Object.entries(latest.settings).filter(
          ([key]) => key !== "floor_plan" && key !== "interface_language",
        ),
      );
      const updated = await updateOwnerVenue(venue.id, {
        name: latest.name,
        description: latest.description,
        cuisine_type: latest.cuisine_type,
        phone: latest.phone,
        email: latest.email,
        address: latest.address,
        city: latest.city,
        postal_code: latest.postal_code,
        country_code: latest.country_code,
        timezone: latest.timezone,
        currency: latest.currency,
        status: latest.status,
        settings: { ...settings, cover_image_url: image },
      });
      onSave(updated);
    } catch (caught) {
      setError(errorMessage(caught, "Не удалось сохранить изменения"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <MenuDrawer title={t("Титульное фото")} onClose={onClose} busy={saving || processing}>
      <div className="vendor-cover-form">
        <div className="vendor-drawer-content">
          <section className="vendor-editor-card">
            <h3>{t("Обложка страницы заведения")}</h3>
            <p>{t("Это фото увидят гости над меню и бронированием в Pocket Dish.")}</p>
            <div
              className={`vendor-cover-preview ${image ? "has-image" : ""}`}
              style={image ? { backgroundImage: `url("${image}")` } : undefined}
            >
              {!image && <ImagePlus size={42} />}
              <span>{venue.name}</span>
            </div>
            <input
              ref={input}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              aria-label={t("Загрузить титульное фото")}
              onChange={(event) => void select(event)}
            />
            <div className="vendor-cover-actions">
              <Button
                kind="secondary"
                icon={ImagePlus}
                disabled={saving || processing}
                onClick={() => input.current?.click()}
              >
                {t(
                  processing ? "Обрабатываем..." : image ? "Заменить фотографию" : "Добавить фото",
                )}
              </Button>
              {image && (
                <Button
                  kind="quiet"
                  icon={Trash2}
                  disabled={saving || processing}
                  onClick={() => setImage("")}
                >
                  {t("Удалить")}
                </Button>
              )}
            </div>
            <small>{t("JPG, PNG или WebP до 10 МБ. Фото обрезается до формата обложки.")}</small>
          </section>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </div>
        <footer>
          <Button kind="secondary" disabled={saving || processing} onClick={onClose}>
            {t("Отмена")}
          </Button>
          <Button disabled={saving || processing || image === original} onClick={() => void save()}>
            {t(saving ? "Сохраняем..." : "Сохранить")}
          </Button>
        </footer>
      </div>
    </MenuDrawer>
  );
}
