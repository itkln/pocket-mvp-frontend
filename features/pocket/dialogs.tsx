"use client";

import { useState, type FormEvent } from "react";
import { Clock3, ShieldCheck, Table2, X } from "lucide-react";
import { type VenueInput } from "../../lib/owner-api";
import { useOwnerWorkspace } from "./owner/context";
import { MenuImageField } from "./menu-image-field";
import { MenuNutritionFields } from "./menu-nutrition-fields";
import { readMenuNutrition } from "../../lib/menu-nutrition";
import { Button, IconButton, StatusPill, Field, money } from "./ui";
import { localeTags, useI18n } from "./i18n";

// Creating a venue asks only for what the public page needs first; the rest lives in settings.
export function NewVenueModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (venue: VenueInput) => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Братислава");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ready = Boolean(name.trim() && city.trim()) && !submitting;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || "Адрес не указан",
        country_code: "SK",
        timezone: "Europe/Bratislava",
        currency: "EUR",
        status: "draft",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal venue-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="venue-create-title">{t("Новое заведение")}</h2>
            <p>{t("Меню, расписание и команду добавите позже.")}</p>
          </div>
          <IconButton icon={X} label={t("Закрыть")} onClick={onClose} className="modal-close" />
        </header>
        <form className="venue-create-form" onSubmit={submit}>
          <div className="modal-body">
            <Field label={t("Название")} wide>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("Например, Mokka Bistro")}
                maxLength={80}
                required
              />
            </Field>
            <div className="venue-create-location">
              <Field label={t("Город")}>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={t("Город")}
                  maxLength={80}
                  required
                />
              </Field>
              <Field label={t("Адрес")}>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={t("Улица и номер")}
                  maxLength={120}
                />
              </Field>
            </div>
          </div>
          <footer>
            <Button kind="secondary" onClick={onClose}>
              {t("Отмена")}
            </Button>
            <Button type="submit" disabled={!ready}>
              {submitting ? t("Создаем...") : t("Создать заведение")}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function Modal({
  type,
  onClose,
  notify,
  currency = "EUR",
}: {
  type: "item" | "invite" | "order";
  onClose: () => void;
  notify: (message: string) => void;
  currency?: string;
}) {
  const { locale, t } = useI18n();
  const workspace = useOwnerWorkspace();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [itemImage, setItemImage] = useState("");
  const order = workspace.orders[0];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      setFormError(t("Заполните обязательные поля"));
      return;
    }
    if (type === "item") {
      if (!event.currentTarget.reportValidity()) return;
      const category = String(data.get("category") ?? "");
      const rawPrice = String(data.get("price") ?? "");
      if (!category || rawPrice === "") {
        setFormError(t("Заполните обязательные поля"));
        return;
      }
      if (!Number.isFinite(Number(rawPrice)) || Number(rawPrice) < 0) {
        setFormError(t("Укажите корректную цену"));
        return;
      }
    }
    if (
      type === "invite" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get("email") ?? "").trim())
    ) {
      setFormError(t("Введите корректный e-mail"));
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      if (type === "item") {
        await workspace.addItem({
          name,
          category_id: String(data.get("category")),
          price_minor: Math.round(Number(data.get("price")) * 100),
          description: String(data.get("description")),
          image_url: itemImage,
          currency,
          is_available: true,
          ...readMenuNutrition(data),
        });
        notify("Позиция добавлена в меню");
      } else if (type === "invite") {
        const delivered = await workspace.inviteStaff({
          display_name: name,
          email: String(data.get("email")).trim(),
          role: String(data.get("role")) as "manager" | "waiter",
        });
        notify(
          delivered
            ? "Приглашение отправлено"
            : "Сотрудник добавлен, но письмо не отправлено. Повторите отправку в меню команды.",
        );
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    type === "item"
      ? "Новая позиция"
      : type === "invite"
        ? "Пригласить сотрудника"
        : order
          ? `Заказ #${order.number}`
          : "Заказ";
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className={`modal ${type === "order" ? "order-modal" : type === "invite" ? "team-invite-modal" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>{t(title)}</h2>
          </div>
          <IconButton icon={X} label={t("Закрыть")} onClick={onClose} />
        </header>
        {type !== "order" ? (
          <form noValidate onSubmit={submit}>
            {type === "item" && (
              <div className="modal-body">
                <div className="form-grid">
                  <div className="field wide">
                    <span>{t("Фото")}</span>
                    <MenuImageField
                      value={itemImage}
                      name="Новая позиция"
                      onChange={setItemImage}
                    />
                  </div>
                  <Field label={t("Название")} wide>
                    <input name="name" autoFocus placeholder={t("Название блюда")} required />
                  </Field>
                  <Field label={t("Категория")}>
                    <select name="category" required defaultValue="">
                      <option value="" disabled>
                        {t("Выберите категорию")}
                      </option>
                      {workspace.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("Цена")}>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </Field>
                  <Field label={t("Описание")} wide>
                    <textarea
                      name="description"
                      placeholder={t("Ингредиенты и короткое описание")}
                    />
                  </Field>
                  <MenuNutritionFields />
                </div>
              </div>
            )}
            {type === "invite" && (
              <div className="modal-body">
                <div className="form-grid">
                  <Field label={t("Имя")}>
                    <input name="name" autoFocus placeholder={t("Имя сотрудника")} required />
                  </Field>
                  <Field label="E-mail">
                    <input name="email" type="email" placeholder="name@example.com" required />
                  </Field>
                  <Field label={t("Роль")} wide>
                    <select name="role" defaultValue="waiter">
                      <option value="waiter">{t("Официант")}</option>
                      <option value="manager">{t("Менеджер")}</option>
                    </select>
                  </Field>
                </div>
                <div className="permission-note">
                  <ShieldCheck size={20} />
                  <p>
                    <strong>{t("Доступ по роли")}</strong>
                    <span>{t("Сотрудник увидит только разрешенные разделы этого заведения.")}</span>
                  </p>
                </div>
              </div>
            )}
            {formError && (
              <p className="modal-form-error" role="alert">
                {t(formError)}
              </p>
            )}
            <footer>
              <Button kind="secondary" onClick={onClose}>
                {t("Отмена")}
              </Button>
              <Button
                type="submit"
                disabled={submitting || (type === "item" && workspace.categories.length === 0)}
              >
                {submitting
                  ? t("Сохраняем...")
                  : type === "item"
                    ? t("Добавить в меню")
                    : t("Отправить приглашение")}
              </Button>
            </footer>
          </form>
        ) : (
          <>
            <div className="modal-body order-detail">
              {order ? (
                <>
                  <div className="order-detail-top">
                    <StatusPill status={order.status} />
                    <span>
                      <Clock3 size={15} />
                      {new Date(order.created_at).toLocaleString(localeTags[locale])}
                    </span>
                  </div>
                  <div className="order-source">
                    <span>
                      <Table2 size={20} />
                    </span>
                    <div>
                      <strong>{t(order.source)}</strong>
                      <p>{order.guest_name || t("Гость")}</p>
                    </div>
                  </div>
                  <dl className="order-total">
                    {Boolean(order.tip_minor) && (
                      <div>
                        <dt>{t("Чаевые")}</dt>
                        <dd>{money(order.tip_minor! / 100, order.currency)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>{t("Итого")}</dt>
                      <dd>{money(order.total_minor / 100, order.currency)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p>{t("Заказов пока нет.")}</p>
              )}
            </div>
            <footer>
              <Button kind="secondary" onClick={onClose}>
                {t("Закрыть")}
              </Button>
              {order && order.status === "new" && (
                <Button
                  onClick={async () => {
                    await workspace.setOrderStatus(order.id, "preparing");
                    notify("Заказ готовится");
                    onClose();
                  }}
                >
                  {t("Заказ готовится")}
                </Button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
