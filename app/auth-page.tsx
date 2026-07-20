"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";

type AuthMode = "login" | "register";

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [role, setRole] = useState<"customer" | "owner">("customer");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!isLogin && data.get("password") !== data.get("confirmPassword")) {
      setError("Пароли не совпадают");
      return;
    }
    setError("");
    router.push("/");
  };

  return <main className="auth-screen">
    <section className="auth-screen-content">
      <Link className="auth-brand" href="/" aria-label="Pocket, на главную"><span>P</span><strong>pocket</strong></Link>
      <header className="auth-heading">
        <h1>{isLogin ? "Войти в Pocket" : "Создать аккаунт"}</h1>
        <p>{isLogin ? "Управляйте заведениями или продолжите как гость." : "Один аккаунт для бронирований, заказов и управления заведениями."}</p>
      </header>

      <form className="auth-form" onSubmit={submit}>
        {!isLogin && <label className="auth-field"><span>Имя</span><input name="name" autoComplete="name" placeholder="Ваше имя" required /></label>}
        <label className="auth-field"><span>E-mail</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
        <label className="auth-field"><span>Пароль</span><span className="auth-password"><input name="password" type={passwordVisible ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Введите пароль" : "Не менее 8 символов"} minLength={8} required /><button type="button" onClick={() => setPasswordVisible((current) => !current)} aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>

        {!isLogin && <>
          <label className="auth-field"><span>Повторите пароль</span><span className="auth-password"><input name="confirmPassword" type={confirmPasswordVisible ? "text" : "password"} autoComplete="new-password" placeholder="Повторите пароль" minLength={8} required /><button type="button" onClick={() => setConfirmPasswordVisible((current) => !current)} aria-label={confirmPasswordVisible ? "Скрыть пароль" : "Показать пароль"}>{confirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <fieldset className="auth-role"><legend>Как планируете использовать Pocket?</legend><div><button type="button" className={role === "customer" ? "active" : ""} onClick={() => setRole("customer")}>Как гость</button><button type="button" className={role === "owner" ? "active" : ""} onClick={() => setRole("owner")}>Как владелец</button></div></fieldset>
        </>}

        {isLogin ? <div className="auth-options"><label><input type="checkbox" name="remember" />Запомнить меня</label><button type="button">Забыли пароль?</button></div> : <label className="auth-consent"><input type="checkbox" required /><span>Я принимаю условия использования и политику конфиденциальности</span></label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit">{isLogin ? "Войти" : "Зарегистрироваться"}</button>
      </form>

      <p className="auth-switch">{isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Зарегистрироваться" : "Войти"}</Link></p>
    </section>
  </main>;
}
