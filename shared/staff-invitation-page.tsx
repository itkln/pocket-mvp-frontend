"use client";
import Link from "next/link";
import { BadgeCheck, CalendarClock, Loader2, Store, TriangleAlert, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout, AuthAPIError, type AuthUser } from "../lib/auth-api";
import { staffInvitation, type StaffInvitation } from "../lib/staff-invitations";
import { selectedVenueKey } from "../features/pocket/model";
import { useI18n } from "../features/pocket/i18n";

const roles = {
  manager: "Менеджер",
  waiter: "Официант",
};
export default function StaffInvitationPage({ token }: { token: string }) {
  const { locale, t } = useI18n();
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
      router.replace(`/${locale}/staff/service`);
      router.refresh();
    } catch (e) {
      setError(explain(e));
      setInvitation(null);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const signOutAndSwitch = async () => {
    setBusy(true);
    try {
      await logout();
      router.replace(authLink("login"));
    } catch {
      setError("Не удалось выйти. Попробуйте ещё раз.");
      setBusy(false);
    }
  };
  return (
    <main className="auth-screen vendor-auth invitation-screen">
      <section className="auth-screen-content">
        <Link className="auth-brand" href={`/${locale}`}>
          <span className="auth-brand-mark">
            <img src="/logo.svg" alt="" width={72} height={72} />
          </span>
          <strong>Pocket Vendor</strong>
        </Link>
        <header className="auth-heading">
          <h1>{t("Приглашение в команду")}</h1>
          <p>{t("Войдите с e-mail, на который пришло приглашение, и подтвердите доступ.")}</p>
        </header>
        {loading ? (
          <p className="invitation-loading" role="status">
            <Loader2 size={20} aria-hidden="true" />
            {t("Проверяем приглашение…")}
          </p>
        ) : (
          <div className="invitation-body">
            {invitation && (
              <article className="invitation-card">
                <header>
                  <span className="invitation-card-icon" aria-hidden="true">
                    <Store size={22} />
                  </span>
                  <h2>{invitation.venue_name}</h2>
                </header>
                <dl>
                  <div>
                    <dt>
                      <BadgeCheck size={18} aria-hidden="true" />
                      {t("Роль")}
                    </dt>
                    <dd>{t(roles[invitation.role])}</dd>
                  </div>
                  <div>
                    <dt>
                      <CalendarClock size={18} aria-hidden="true" />
                      {t("Действует до")}
                    </dt>
                    <dd>
                      {new Date(invitation.expires_at).toLocaleString(
                        locale === "ua" ? "uk" : locale,
                        { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" },
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            )}
            {user && (
              <p className="invitation-account">
                <span className="invitation-account-avatar" aria-hidden="true">
                  <UserRound size={18} />
                </span>
                <span>
                  <small>{t("Вы вошли как")}</small>
                  <strong>{user.email}</strong>
                </span>
              </p>
            )}
            {error && (
              <p className="auth-error invitation-error" role="alert">
                <TriangleAlert size={18} aria-hidden="true" />
                <span>{t(error)}</span>
              </p>
            )}
            <div className="invitation-actions">
              {!user && !error && (
                <>
                  <Link className="auth-submit" href={authLink("login")}>
                    {t("Войти")}
                  </Link>
                  <Link className="invitation-secondary" href={authLink("register")}>
                    {t("Создать аккаунт")}
                  </Link>
                </>
              )}
              {user && invitation && (
                <button className="auth-submit" disabled={busy} onClick={() => void accept()}>
                  {busy ? t("Принимаем…") : t("Принять приглашение")}
                </button>
              )}
              {error && (
                <button className="auth-submit" onClick={() => window.location.reload()}>
                  {t("Проверить снова")}
                </button>
              )}
              {user && (
                <button
                  className="invitation-secondary"
                  disabled={busy}
                  onClick={() => void signOutAndSwitch()}
                >
                  {t("Войти в другой аккаунт")}
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
