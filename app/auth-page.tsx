"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthAPIError, login, register } from "../lib/auth-api";

type AuthMode = "login" | "register";

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [role, setRole] = useState<"customer" | "owner">("customer");
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
				role,
			});
		}
		router.replace("/");
		router.refresh();
	} catch (caught) {
		setError(caught instanceof AuthAPIError ? caught.message : "Сервер временно недоступен. Попробуйте еще раз");
	} finally {
		setSubmitting(false);
	}
  };

  return <main className="auth-screen">
    <section className="auth-screen-content">
      <Link className="auth-brand" href="/" aria-label="Pocket, на главную"><span className="auth-brand-mark"><Image src="/logo.svg" alt="" width={30} height={30} priority /></span><strong>Pocket</strong></Link>
      <header className="auth-heading">
        <h1>{isLogin ? "Войти в Pocket" : "Создать аккаунт"}</h1>
        <p>{isLogin ? "Управляйте заведениями или продолжите как гость." : "Один аккаунт для бронирований, заказов и управления заведениями."}</p>
      </header>

      <form className="auth-form" onSubmit={submit}>
		{!isLogin && <div className="auth-name-grid"><label className="auth-field"><span>Имя</span><input name="firstName" autoComplete="given-name" placeholder="Имя" maxLength={80} required /></label><label className="auth-field"><span>Фамилия</span><input name="lastName" autoComplete="family-name" placeholder="Фамилия" maxLength={80} required /></label></div>}
        <label className="auth-field"><span>E-mail</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
        <label className="auth-field"><span>Пароль</span><span className="auth-password"><input name="password" type={passwordVisible ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Введите пароль" : "От 12 до 128 символов"} minLength={isLogin ? 1 : 12} maxLength={128} required /><button type="button" onClick={() => setPasswordVisible((current) => !current)} aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>

        {!isLogin && <>
          <label className="auth-field"><span>Повторите пароль</span><span className="auth-password"><input name="confirmPassword" type={confirmPasswordVisible ? "text" : "password"} autoComplete="new-password" placeholder="Повторите пароль" minLength={12} maxLength={128} required /><button type="button" onClick={() => setConfirmPasswordVisible((current) => !current)} aria-label={confirmPasswordVisible ? "Скрыть пароль" : "Показать пароль"}>{confirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <fieldset className="auth-role"><legend>Как планируете использовать Pocket?</legend><div><button type="button" className={role === "customer" ? "active" : ""} onClick={() => setRole("customer")}>Как гость</button><button type="button" className={role === "owner" ? "active" : ""} onClick={() => setRole("owner")}>Как владелец</button></div></fieldset>
        </>}

        {isLogin ? <div className="auth-options"><label><input type="checkbox" name="remember" />Запомнить меня</label><button type="button">Забыли пароль?</button></div> : <label className="auth-consent"><input type="checkbox" required /><span>Я принимаю условия использования и политику конфиденциальности</span></label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
		<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? (isLogin ? "Входим..." : "Создаем аккаунт...") : (isLogin ? "Войти" : "Зарегистрироваться")}</button>
      </form>

      <p className="auth-switch">{isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Зарегистрироваться" : "Войти"}</Link></p>
    </section>
  </main>;
}
