"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, Store } from "lucide-react";
import {
  getSubscription,
  updateSubscription,
  type OwnerSubscription,
} from "../../../lib/owner-api";
import { Button, PageHeader, money } from "../ui";
import { localeTags, useI18n } from "../i18n";
import { useLocalizedError } from "../error-message";

const plans = [
  {
    id: "start",
    name: "Start",
    price: 29,
    description: "Для небольшого заведения",
    limit: 1,
    features: ["Онлайн-меню", "QR-коды столов", "До 5 сотрудников"],
  },
  {
    id: "business",
    name: "Business",
    price: 69,
    description: "Для растущей команды",
    limit: 3,
    features: ["Все возможности Start", "Аналитика и отзывы", "Брони и предзаказы"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 129,
    description: "Для сети заведений",
    limit: Number.POSITIVE_INFINITY,
    features: ["Все возможности Business", "Без ограничения заведений", "Приоритетная поддержка"],
  },
] as const;

const statusLabel: Record<OwnerSubscription["status"], string> = {
  trialing: "Пробный период",
  active: "Активна",
  past_due: "Ожидает оплаты",
  cancelled: "Отменена",
};

export function SubscriptionScreen({
  venueCount,
  notify,
}: {
  venueCount: number;
  notify: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const errorMessage = useLocalizedError();
  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [plan, setPlan] = useState<OwnerSubscription["plan"]>("business");
  const [billing, setBilling] = useState<OwnerSubscription["billing_cycle"]>("yearly");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(
      () =>
        void getSubscription()
          .then((item) => {
            setSubscription(item);
            if (item) {
              setPlan(item.plan);
              setBilling(item.billing_cycle);
            }
          })
          .catch((error) => notify(errorMessage(error, "Не удалось загрузить подписку"))),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [errorMessage, notify]);
  const activate = async () => {
    setSaving(true);
    try {
      const item = await updateSubscription(plan, billing);
      setSubscription(item);
      notify("Тариф сохранен");
    } catch (error) {
      notify(errorMessage(error, "Не удалось сохранить подписку"));
    } finally {
      setSaving(false);
    }
  };
  const selected = plans.find((item) => item.id === plan) ?? plans[1];
  const current = subscription ? plans.find((item) => item.id === subscription.plan) : undefined;
  const fitting = plans.find((item) => item.limit >= venueCount) ?? plans[plans.length - 1];
  const tooSmall = selected.limit < venueCount;
  const unchanged =
    !tooSmall &&
    !!subscription &&
    subscription.plan === plan &&
    subscription.billing_cycle === billing;
  return (
    <>
      <PageHeader title={t("Подписка")} />
      <section className={"vendor-block subscription-status " + (subscription ? "active" : "")}>
        <span>
          <Sparkles size={24} />
        </span>
        <div>
          <strong>
            {subscription ? "Pocket " + (current ?? selected).name : t("Подписка не выбрана")}
          </strong>
          <p>
            {subscription?.trial_ends_at
              ? t("Пробный период до {date}", {
                  date: new Date(subscription.trial_ends_at).toLocaleDateString(localeTags[locale]),
                })
              : t("Выберите тариф и начните 14-дневный пробный период.")}
          </p>
        </div>
        {subscription && (
          <b className={"subscription-state state-" + subscription.status}>
            {t(statusLabel[subscription.status])}
          </b>
        )}
      </section>
      <section className="vendor-block subscription-picker">
        <header className="subscription-heading">
          <div>
            <h2>{t("Выберите тариф")}</h2>
            <p>{t("Тариф можно изменить по мере роста команды.")}</p>
          </div>
          <div className="vendor-segmented billing-toggle">
            <button
              type="button"
              className={billing === "monthly" ? "active" : ""}
              onClick={() => setBilling("monthly")}
            >
              {t("Ежемесячно")}
            </button>
            <button
              type="button"
              className={billing === "yearly" ? "active" : ""}
              onClick={() => setBilling("yearly")}
            >
              {t("Ежегодно")}
              <b>−17%</b>
            </button>
          </div>
        </header>
        <div className="subscription-plans">
          {plans.map((item) => {
            const incompatible = item.limit < venueCount;
            const chosen = plan === item.id;
            return (
              <button
                type="button"
                aria-pressed={chosen}
                className={
                  "subscription-plan " +
                  (chosen ? "selected" : "") +
                  (incompatible ? " incompatible" : "")
                }
                key={item.id}
                disabled={incompatible}
                onClick={() => setPlan(item.id)}
              >
                <div className="plan-title">
                  <div>
                    <strong>
                      {item.name}
                      {current?.id === item.id && <em>{t("Текущий")}</em>}
                    </strong>
                    <span>{t(item.description)}</span>
                  </div>
                  <i className="plan-radio" aria-hidden="true">
                    {chosen && <Check size={14} strokeWidth={3} />}
                  </i>
                </div>
                <div className="plan-price">
                  <strong>{money(item.price)}</strong>
                  <span>{t("/ месяц")}</span>
                </div>
                <p className="plan-yearly">
                  {billing === "yearly"
                    ? t("{price} в год", { price: money(item.price * 10) })
                    : ""}
                </p>
                <ul>
                  {item.features.map((feature) => (
                    <li key={feature}>
                      <Check size={16} strokeWidth={2.4} />
                      {t(feature)}
                    </li>
                  ))}
                </ul>
                <small>
                  <Store size={16} />
                  {incompatible
                    ? t("Заведений у вас: {count}", { count: venueCount })
                    : Number.isFinite(item.limit)
                      ? t("До " + item.limit + " заведений")
                      : t("Без ограничений")}
                </small>
              </button>
            );
          })}
        </div>
        <footer className="subscription-actions">
          <p className={tooSmall ? "warning" : ""}>
            {tooSmall
              ? t("Для ваших заведений ({count}) подходит тариф {plan}.", {
                  count: venueCount,
                  plan: fitting.name,
                })
              : billing === "yearly"
                ? t("При ежегодной оплате два месяца бесплатно.")
                : t("Списание один раз в месяц.")}
          </p>
          <Button
            icon={unchanged ? Check : Sparkles}
            disabled={saving || tooSmall || unchanged}
            onClick={() => void activate()}
          >
            {saving
              ? t("Сохраняем...")
              : unchanged
                ? t("Текущий тариф")
                : subscription
                  ? t("Изменить тариф")
                  : t("Начать пробный период")}
          </Button>
        </footer>
      </section>
    </>
  );
}
