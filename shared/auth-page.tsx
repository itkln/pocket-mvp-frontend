"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { vendorInviteReturnTo } from "../lib/staff-invitations";
import { login, register } from "../lib/auth-api";
import { dishAuthPath, dishReturnTo } from "../lib/dish-auth-navigation";
import { useLocalizedError } from "../features/pocket/error-message";
import { useI18n } from "../features/pocket/i18n";

type AuthMode = "login" | "register";
type PocketProduct = "vendor" | "dish";

export default function AuthPage({
  mode,
  product = "vendor",
  returnTo,
}: {
  mode: AuthMode;
  product?: PocketProduct;
  returnTo?: string;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const errorMessage = useLocalizedError();
  const isLogin = mode === "login";
  const productName =
    product === "vendor" ? "Pocket Vendor" : product === "dish" ? "Pocket Dish" : "Pocket Spots";
  const destination =
    product !== "vendor" ? dishReturnTo(returnTo, locale) : vendorInviteReturnTo(returnTo, locale);
  const authPath = (screen: "login" | "register" | "forgot-password") =>
    product !== "vendor"
      ? dishAuthPath(locale, screen, returnTo)
      : `/${locale}/${screen}${destination !== `/${locale}` ? `?returnTo=${encodeURIComponent(destination)}` : ""}`;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!isLogin && data.get("password") !== data.get("confirmPassword")) {
      setError("Пароли не совпадают");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(String(data.get("email")), String(data.get("password")));
      } else {
        await register({
          first_name: String(data.get("firstName")),
          last_name: String(data.get("lastName")),
          email: String(data.get("email")),
          password: String(data.get("password")),
        });
      }
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught, "Сервер временно недоступен. Попробуйте еще раз"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`auth-screen ${product === "vendor" ? "vendor-auth" : ""}`}>
      <section className="auth-screen-content">
        <Link
          className="auth-brand"
          href={product === "dish" ? destination : `/${locale}`}
          aria-label={t("{product}, на главную", { product: productName })}
        >
          <span className="auth-brand-mark">
            <Image src="/logo.svg" alt="" width={30} height={30} priority />
          </span>
          <strong>{productName}</strong>
        </Link>
        {/* Vendor shows the brand once, so the heading is short and has no tagline. */}
        <header className="auth-heading">
          <h1>
            {product === "vendor"
              ? isLogin
                ? t("Вход в аккаунт")
                : t("Регистрация")
              : isLogin
                ? t("Войти в {product}", { product: productName })
                : t("Создать аккаунт")}
          </h1>
          {product !== "vendor" && (
            <p>
              {isLogin
                ? t("Бронируйте столики и оформляйте предзаказ.")
                : t("Аккаунт для бронирований и предзаказов в заведениях.")}
            </p>
          )}
        </header>

        <form className="auth-form" onSubmit={submit}>
          {!isLogin && (
            <div className="auth-name-grid">
              <label className="auth-field">
                <span>{t("Имя")}</span>
                <input
                  name="firstName"
                  autoComplete="given-name"
                  placeholder={t("Имя")}
                  maxLength={80}
                  required
                />
              </label>
              <label className="auth-field">
                <span>{t("Фамилия")}</span>
                <input
                  name="lastName"
                  autoComplete="family-name"
                  placeholder={t("Фамилия")}
                  maxLength={80}
                  required
                />
              </label>
            </div>
          )}
          <label className="auth-field">
            <span>E-mail</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              required
            />
          </label>
          <label className="auth-field">
            <span>{t("Пароль")}</span>
            <span className="auth-password">
              <input
                name="password"
                type={passwordVisible ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={isLogin ? t("Введите пароль") : t("От 12 до 128 символов")}
                minLength={isLogin ? 1 : 12}
                maxLength={128}
                required
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((current) => !current)}
                aria-label={passwordVisible ? t("Скрыть пароль") : t("Показать пароль")}
              >
                {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {!isLogin && (
            <>
              <label className="auth-field">
                <span>{t("Повторите пароль")}</span>
                <span className="auth-password">
                  <input
                    name="confirmPassword"
                    type={confirmPasswordVisible ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("Повторите пароль")}
                    minLength={12}
                    maxLength={128}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmPasswordVisible((current) => !current)}
                    aria-label={confirmPasswordVisible ? t("Скрыть пароль") : t("Показать пароль")}
                  >
                    {confirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
            </>
          )}

          {isLogin ? (
            <div className="auth-options">
              {product !== "vendor" && (
                <label>
                  <input type="checkbox" name="remember" />
                  {t("Запомнить меня")}
                </label>
              )}
              <Link href={authPath("forgot-password")}>{t("Забыли пароль?")}</Link>
            </div>
          ) : (
            <label className="auth-consent">
              <input type="checkbox" required />
              <span>{t("Я принимаю условия использования и политику конфиденциальности")}</span>
            </label>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {t(error)}
            </p>
          )}
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? isLogin
                ? t("Входим...")
                : t("Создаем аккаунт...")
              : isLogin
                ? t("Войти")
                : t("Зарегистрироваться")}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? t("Нет аккаунта?") : t("Уже есть аккаунт?")}{" "}
          <Link href={authPath(isLogin ? "register" : "login")}>
            {isLogin ? t("Зарегистрироваться") : t("Войти")}
          </Link>
        </p>
      </section>
    </main>
  );
}
