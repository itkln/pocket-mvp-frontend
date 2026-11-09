"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout, AuthAPIError, type AuthUser } from "../lib/auth-api";
import { staffInvitation, type StaffInvitation } from "../lib/staff-invitations";
import { selectedVenueKey } from "../features/pocket/model";
import { useI18n } from "../features/pocket/i18n";

const roles = {
  manager: "Менеджер",
  waiter: "Официант",
  kitchen: "Кухня",
  viewer: "Только просмотр",
};
export default function StaffInvitationPage({ token }: { token: string }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [invitation, setInvitation] = useState<StaffInvitation | null>(null);
  const validToken = /^[A-Za-z0-9_-]{32,256}$/.test(token);
  const [loadingState, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorState, setError] = useState("");
  const loading = validToken && loadingState;
  const error = validToken ? errorState : "Некорректная ссылка приглашения.";
  const lock = useRef(false);
  const returnTo = `/${locale}/invite?token=${encodeURIComponent(token)}`;
  const authLink = (mode: string) => `/${locale}/${mode}?returnTo=${encodeURIComponent(returnTo)}`;
  const explain = (e: unknown) =>
    e instanceof AuthAPIError && e.status === 403
      ? "Войдите с e-mail, на который отправлено приглашение."
      : e instanceof AuthAPIError && [404, 409, 422].includes(e.status)
        ? "Приглашение уже принято, отозвано или срок ссылки истёк. Попросите владельца отправить новое."
        : "Не удалось проверить приглашение. Попробуйте ещё раз.";
  useEffect(() => {
    if (!validToken) return;
    let active = true;
    async function load() {
      try {
        const account = await getCurrentUser();
        if (!active) return;
        setUser(account);
        const data = await staffInvitation(token);
        if (active) setInvitation(data);
      } catch (e) {
        if (active && !(e instanceof AuthAPIError && e.status === 401)) setError(explain(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token, validToken]);
  const accept = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await staffInvitation(token, true);
      if (user) window.localStorage.setItem(selectedVenueKey(user.id), result.venue_id);
      router.replace(`/${locale}/staff/${result.role === "kitchen" ? "kitchen" : "service"}`);
      router.refresh();
    } catch (e) {
      setError(explain(e));
      setInvitation(null);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <main className="auth-screen">
      <section className="auth-screen-content">
        <Link className="auth-brand" href={`/${locale}`}>
          <img src="/logo.svg" alt="" width={30} height={30} />
          <strong>Pocket Vendor</strong>
        </Link>
        <header className="auth-heading">
          <h1>Приглашение в команду</h1>
          <p>Войдите с e-mail, на который пришло приглашение, и подтвердите доступ.</p>
        </header>
        {loading ? (
          <p role="status">Проверяем приглашение…</p>
        ) : (
          <>
            {user && (
              <p>
                Вы вошли как <strong>{user.email}</strong>
              </p>
            )}
            {invitation && (
              <div className="auth-heading">
                <h2>{invitation.venue_name}</h2>
                <p>Роль: {roles[invitation.role]}</p>
                <p>
                  Действует до{" "}
                  {new Date(invitation.expires_at).toLocaleString(locale === "ua" ? "uk" : locale)}
                </p>
              </div>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            {!user && !error && (
              <div className="auth-form">
                <Link className="auth-submit" href={authLink("login")}>
                  Войти
                </Link>
                <Link href={authLink("register")}>Создать аккаунт</Link>
              </div>
            )}
            {user && invitation && (
              <button className="auth-submit" disabled={busy} onClick={() => void accept()}>
                {busy ? "Принимаем…" : "Принять приглашение"}
              </button>
            )}
            {user && (
              <p className="auth-switch">
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await logout();
                      router.replace(authLink("login"));
                    } catch {
                      setError("Не удалось выйти. Попробуйте ещё раз.");
                      setBusy(false);
                    }
                  }}
                >
                  Войти в другой аккаунт
                </button>
              </p>
            )}
            {error && (
              <button className="auth-submit" onClick={() => window.location.reload()}>
                Проверить снова
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
