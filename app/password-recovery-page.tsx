"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocalizedError } from "../features/pocket/error-message";
import { useI18n } from "../features/pocket/i18n";
import { requestPasswordReset, resetPassword } from "../lib/auth-api";

type RecoveryMode = "request" | "reset";

export default function PasswordRecoveryPage({ mode, token = "" }: { mode: RecoveryMode; token?: string }) {
  const { locale } = useI18n();
  const errorMessage = useLocalizedError();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(mode === "reset" && !token ? "Ссылка недействительна или устарела" : "");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (mode === "reset" && data.get("password") !== data.get("confirmPassword")) {
      setError("Пароли не совпадают");
      return;
    }
    if (mode === "reset" && !token) {
      setError("Ссылка недействительна или устарела");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      if (mode === "request") await requestPasswordReset(String(data.get("email")), locale);
      else await resetPassword(token, String(data.get("password")));
      setComplete(true);
    } catch (caught) {
      setError(errorMessage(caught, "Сервер временно недоступен. Попробуйте еще раз"));
    } finally {
      setSubmitting(false);
    }
  };

  const requestMode = mode === "request";
  const title = complete
    ? requestMode ? "Проверьте почту" : "Пароль изменен"
    : requestMode ? "Восстановление пароля" : "Новый пароль";
  const description = complete
    ? requestMode
      ? "Если аккаунт с таким e-mail существует, мы отправили ссылку для смены пароля."
      : "Теперь вы можете войти в Pocket с новым паролем."
    : requestMode
      ? "Укажите e-mail аккаунта. Мы отправим безопасную ссылку для смены пароля."
      : "Придумайте новый пароль длиной от 12 до 128 символов.";

  return <main className="auth-screen">
    <section className="auth-screen-content">
      <Link className="auth-brand" href={`/${locale}`} aria-label="Pocket, на главную"><span className="auth-brand-mark"><Image src="/logo.svg" alt="" width={30} height={30} priority /></span><strong>Pocket</strong></Link>
      <header className="auth-heading">
        {complete && <span className="auth-success-icon" aria-hidden="true"><MailCheck size={24} /></span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      {!complete && <form className="auth-form" onSubmit={submit}>
        {requestMode ? <label className="auth-field"><span>E-mail</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required autoFocus /></label> : <>
          <label className="auth-field"><span>Новый пароль</span><span className="auth-password"><input name="password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" placeholder="От 12 до 128 символов" minLength={12} maxLength={128} required autoFocus /><button type="button" onClick={() => setPasswordVisible((current) => !current)} aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <label className="auth-field"><span>Повторите новый пароль</span><span className="auth-password"><input name="confirmPassword" type={confirmPasswordVisible ? "text" : "password"} autoComplete="new-password" placeholder="Повторите новый пароль" minLength={12} maxLength={128} required /><button type="button" onClick={() => setConfirmPasswordVisible((current) => !current)} aria-label={confirmPasswordVisible ? "Скрыть пароль" : "Показать пароль"}>{confirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        </>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {!requestMode && error && <Link className="auth-recovery-link" href={`/${locale}/forgot-password`}>Запросить новую ссылку</Link>}
        <button className="auth-submit" type="submit" disabled={submitting || (!requestMode && !token)}>{submitting ? requestMode ? "Отправляем..." : "Сохраняем..." : requestMode ? "Отправить ссылку" : "Сохранить пароль"}</button>
      </form>}

      <p className="auth-switch">{complete && requestMode ? "Не получили письмо?" : "Вспомнили пароль?"} {complete && requestMode ? <button type="button" className="auth-link-button" onClick={() => setComplete(false)}>Отправить еще раз</button> : <Link href={`/${locale}/login`}>Вернуться ко входу</Link>}</p>
    </section>
  </main>;
}
