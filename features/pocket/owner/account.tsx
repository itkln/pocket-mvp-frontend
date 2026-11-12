"use client";

import { useContext, useEffect, useState, type FormEvent } from "react";
import {
  changeEmail,
  changePassword,
  updateAvatar,
  updateProfile,
  type AuthUser,
} from "../../../lib/auth-api";
import {
  Bell,
  Camera,
  Eye,
  EyeOff,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { userInitials } from "../model";
import { TooltipContext, Button, PageHeader, PanelTitle, Field } from "../ui";
import { useI18n } from "../i18n";
import { useLocalizedError } from "../error-message";
import { setMotionPreference, useMotionPreference } from "../motion-preference";

type AccountSection = "profile" | "notifications" | "interface" | "security";
type AccountPreferences = { orderUpdates: boolean; productNews: boolean; reviewReplies: boolean };
const defaultPreferences: AccountPreferences = {
  orderUpdates: true,
  productNews: false,
  reviewReplies: true,
};
const preferencesKey = (userID: string) => `pocket:account-preferences:${userID}`;

export function AccountScreen({
  user,
  notify,
  onLogout,
  onUpdate,
  initialSection = "profile",
  embedded = false,
  onProfileSaved,
  interfaceSettings = false,
}: {
  user: AuthUser;
  notify: (message: string) => void;
  onLogout: () => void;
  onUpdate: (user: AuthUser) => void;
  initialSection?: AccountSection;
  embedded?: boolean;
  onProfileSaved?: () => void;
  // Vendor shows the "Interface" section with device settings such as animations.
  interfaceSettings?: boolean;
}) {
  const { t } = useI18n();
  const errorMessage = useLocalizedError();
  const showTooltips = useContext(TooltipContext);
  const motion = useMotionPreference();
  const [section, setSection] = useState<AccountSection>(initialSection);
  const [profile, setProfile] = useState({
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultPreferences);
  const [editingPassword, setEditingPassword] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const profileChanged =
    profile.firstName.trim() !== user.first_name ||
    profile.lastName.trim() !== user.last_name ||
    profile.phone.trim() !== (user.phone ?? "");

  useEffect(() => {
    const stored = window.localStorage.getItem(preferencesKey(user.id));
    if (!stored) return;
    try {
      const restored = {
        ...defaultPreferences,
        ...(JSON.parse(stored) as Partial<AccountPreferences>),
      };
      const frame = window.requestAnimationFrame(() => setPreferences(restored));
      return () => window.cancelAnimationFrame(frame);
    } catch {
      window.localStorage.removeItem(preferencesKey(user.id));
    }
  }, [user.id]);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    if (!firstName || !lastName) {
      setProfileError(t("Имя и фамилия обязательны"));
      return;
    }
    setSavingProfile(true);
    setProfileError("");
    try {
      const updated = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: profile.phone.trim(),
      });
      onUpdate(updated);
      notify("Профиль сохранен");
      onProfileSaved?.();
    } catch (error) {
      setProfileError(errorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePreference = (key: keyof AccountPreferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    window.localStorage.setItem(preferencesKey(user.id), JSON.stringify(next));
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("current_password") ?? "");
    const newPassword = String(data.get("new_password") ?? "");
    const confirmation = String(data.get("password_confirmation") ?? "");
    if (!currentPassword) {
      setFormError(t("Введите текущий пароль"));
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setFormError(t("Пароль должен содержать от 12 до 128 символов"));
      return;
    }
    if (newPassword !== confirmation) {
      setFormError(t("Пароли не совпадают"));
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await changePassword(currentPassword, newPassword);
      form.reset();
      setEditingPassword(false);
      setShowPasswords(false);
      notify("Пароль изменен");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("new_email") ?? "")
      .trim()
      .toLowerCase();
    const currentPassword = String(data.get("current_password") ?? "");
    if (!email || !email.includes("@")) {
      setFormError(t("Введите корректный e-mail"));
      return;
    }
    if (!currentPassword) {
      setFormError(t("Введите текущий пароль"));
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const updated = await changeEmail(currentPassword, email);
      onUpdate(updated);
      form.reset();
      setEditingEmail(false);
      notify("E-mail изменен");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError(t("Используйте JPEG, PNG или WebP"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t("Фотография должна быть меньше 2 МБ"));
      return;
    }
    setUploadingAvatar(true);
    setAvatarError("");
    try {
      const updated = await updateAvatar(file);
      onUpdate(updated);
      notify("Фотография обновлена");
    } catch (error) {
      setAvatarError(errorMessage(error));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const sections: { id: AccountSection; label: string; icon: typeof UserRound; value?: string }[] =
    [
      { id: "profile", label: "Личные данные", icon: UserRound },
      { id: "notifications", label: "Уведомления", icon: Bell },
      ...(interfaceSettings
        ? [{ id: "interface" as const, label: "Интерфейс", icon: MonitorSmartphone }]
        : []),
      { id: "security", label: "Безопасность", icon: ShieldCheck },
    ];

  return (
    <div className="account-page">
      {!embedded && (
        <PageHeader
          title={t("Настройки")}
          actions={
            <Button
              className="account-header-logout"
              kind="danger"
              icon={LogOut}
              onClick={onLogout}
            >
              {t("Выйти из аккаунта")}
            </Button>
          }
        />
      )}
      {(!embedded || section === "profile") && (
        <section className="panel account-profile-hero">
          <label
            className={`account-profile-avatar account-avatar-editor ${uploadingAvatar ? "loading" : ""}`}
            title={showTooltips ? t("Изменить фотографию") : undefined}
          >
            {user.avatar_url ? (
              <i
                className="account-avatar-image"
                style={{ backgroundImage: `url("${user.avatar_url}")` }}
              />
            ) : (
              userInitials(user)
            )}
            <input
              type="file"
              aria-label={t("Изменить фотографию")}
              accept="image/jpeg,image/png,image/webp"
              disabled={uploadingAvatar}
              onChange={(event) => {
                void uploadPhoto(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <span>
              <Camera size={20} />
            </span>
          </label>
          <div>
            <h2>
              {user.first_name} {user.last_name}
            </h2>
            <p>{user.email}</p>
            {avatarError && (
              <small className="account-avatar-error" role="alert">
                {t(avatarError)}
              </small>
            )}
          </div>
        </section>
      )}
      <div className="account-settings-layout">
        {!embedded && (
          <nav className="panel account-section-list" aria-label={t("Разделы настроек")}>
            {sections.map(({ id, label, icon: Icon, value }) => (
              <button
                type="button"
                className={section === id ? "active" : ""}
                key={id}
                onClick={() => setSection(id)}
              >
                <span>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <strong>{t(label)}</strong>
                {value && <small>{value}</small>}
              </button>
            ))}
          </nav>
        )}
        <section className="panel account-section-panel">
          {section === "profile" && (
            <form className="account-profile-form" onSubmit={submitProfile}>
              <PanelTitle
                title={t("Личные данные")}
                subtitle={t("Используются во всех ролях и заведениях.")}
              />
              <div className="form-grid">
                <Field label={t("Имя")}>
                  <input
                    value={profile.firstName}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, firstName: event.target.value }))
                    }
                    maxLength={80}
                    autoComplete="given-name"
                  />
                </Field>
                <Field label={t("Фамилия")}>
                  <input
                    value={profile.lastName}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, lastName: event.target.value }))
                    }
                    maxLength={80}
                    autoComplete="family-name"
                  />
                </Field>
                <Field label={t("Телефон")}>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, phone: event.target.value }))
                    }
                    maxLength={40}
                    autoComplete="tel"
                    placeholder={t("Добавить телефон")}
                  />
                </Field>
                <Field label="E-mail">
                  <input type="email" value={user.email} readOnly />
                </Field>
              </div>
              {profileError && (
                <p className="form-error" role="alert">
                  {t(profileError)}
                </p>
              )}
              <footer>
                <Button type="submit" disabled={!profileChanged || savingProfile}>
                  {savingProfile ? t("Сохраняем...") : t("Сохранить изменения")}
                </Button>
              </footer>
            </form>
          )}
          {section === "notifications" && (
            <div className="account-preference-panel">
              <PanelTitle
                title={t("Уведомления")}
                subtitle={t("Выберите события, которые важны лично вам.")}
              />
              <div className="account-setting-rows">
                <AccountToggle
                  title={t("Статусы заказов")}
                  text={t("Изменения заказов, оплат и бронирований.")}
                  checked={preferences.orderUpdates}
                  onChange={(value) => updatePreference("orderUpdates", value)}
                />
                <AccountToggle
                  title={t("Ответы на отзывы")}
                  text={t("Ответы заведений на ваши отзывы.")}
                  checked={preferences.reviewReplies}
                  onChange={(value) => updatePreference("reviewReplies", value)}
                />
                <AccountToggle
                  title={t("Новости Pocket")}
                  text={t("Редкие обновления о новых возможностях.")}
                  checked={preferences.productNews}
                  onChange={(value) => updatePreference("productNews", value)}
                />
              </div>
            </div>
          )}
          {section === "interface" && interfaceSettings && (
            <div className="account-preference-panel">
              <PanelTitle title={t("Интерфейс")} subtitle={t("Настройки этого устройства.")} />
              <div className="account-setting-rows">
                <AccountToggle
                  title={t("Анимации")}
                  text={t("Плавные переходы между страницами, появление блоков и счётчики цифр.")}
                  checked={motion}
                  onChange={setMotionPreference}
                />
              </div>
            </div>
          )}
          {section === "security" && (
            <div className="account-preference-panel account-security-panel">
              <PanelTitle
                title={t("Безопасность")}
                subtitle={t("E-mail и пароль для входа в аккаунт.")}
              />
              {editingEmail ? (
                <form className="account-password-form" noValidate onSubmit={submitEmail}>
                  <div className="form-grid">
                    <Field label={t("Новый e-mail")} wide>
                      <input
                        name="new_email"
                        type="email"
                        defaultValue={user.email}
                        autoComplete="email"
                        autoFocus
                      />
                    </Field>
                    <Field label={t("Текущий пароль")} wide>
                      <div className="account-password-input">
                        <input
                          name="current_password"
                          type={showPasswords ? "text" : "password"}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          aria-label={t(showPasswords ? "Скрыть пароль" : "Показать пароль")}
                          onClick={() => setShowPasswords((value) => !value)}
                        >
                          {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </Field>
                  </div>
                  {formError && (
                    <p className="form-error" role="alert">
                      {t(formError)}
                    </p>
                  )}
                  <div className="account-password-actions">
                    <Button
                      kind="secondary"
                      onClick={() => {
                        setEditingEmail(false);
                        setFormError("");
                      }}
                    >
                      {t("Отмена")}
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? t("Сохраняем...") : t("Сохранить e-mail")}
                    </Button>
                  </div>
                </form>
              ) : editingPassword ? (
                <form className="account-password-form" noValidate onSubmit={submitPassword}>
                  <div className="form-grid">
                    <Field label={t("Текущий пароль")} wide>
                      <div className="account-password-input">
                        <input
                          name="current_password"
                          type={showPasswords ? "text" : "password"}
                          autoComplete="current-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          aria-label={t(showPasswords ? "Скрыть пароль" : "Показать пароль")}
                          onClick={() => setShowPasswords((value) => !value)}
                        >
                          {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </Field>
                    <Field label={t("Новый пароль")}>
                      <input
                        name="new_password"
                        type={showPasswords ? "text" : "password"}
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label={t("Повторите новый пароль")}>
                      <input
                        name="password_confirmation"
                        type={showPasswords ? "text" : "password"}
                        autoComplete="new-password"
                      />
                    </Field>
                  </div>
                  {formError && (
                    <p className="form-error" role="alert">
                      {t(formError)}
                    </p>
                  )}
                  <div className="account-password-actions">
                    <Button
                      kind="secondary"
                      onClick={() => {
                        setEditingPassword(false);
                        setFormError("");
                      }}
                    >
                      {t("Отмена")}
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? t("Сохраняем...") : t("Сохранить пароль")}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="account-security-list">
                  <div>
                    <div>
                      <strong>E-mail</strong>
                      <p>{user.email}</p>
                    </div>
                    <Button
                      kind="quiet"
                      ariaLabel={t("Изменить e-mail")}
                      onClick={() => {
                        setEditingEmail(true);
                        setShowPasswords(false);
                        setFormError("");
                      }}
                    >
                      {t("Изменить")}
                    </Button>
                  </div>
                  <div>
                    <div>
                      <strong>{t("Пароль")}</strong>
                      <p>••••••••••••</p>
                    </div>
                    <Button
                      kind="quiet"
                      ariaLabel={t("Изменить пароль")}
                      onClick={() => {
                        setEditingPassword(true);
                        setShowPasswords(false);
                        setFormError("");
                      }}
                    >
                      {t("Изменить")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AccountToggle({
  title,
  text,
  checked,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div>
        <strong>{t(title)}</strong>
        <p>{t(text)}</p>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span />
      </label>
    </div>
  );
}
