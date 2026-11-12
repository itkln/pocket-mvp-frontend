"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Copy, Ellipsis, Plus, Search, Send, Trash2, UserCheck, UserX } from "lucide-react";
import { type OwnerStaffMember } from "../../../lib/owner-api";
import { useConfirm } from "../confirm-dialog";
import { useI18n } from "../i18n";
import { useDismiss } from "../use-dismiss";
import { Button, EmptyIllustration, IconButton, PageHeader, StatusPill } from "../ui";
import { useOwnerWorkspace } from "./context";

const statusLabel: Record<OwnerStaffMember["status"], string> = {
  invited: "Приглашен",
  active: "Активен",
  inactive: "Неактивен",
};

export function TeamScreen({
  onInvite,
  notify,
}: {
  onInvite: () => void;
  notify: (message: string) => void;
}) {
  const { resendInvitation, staff, editStaff, removeStaff } = useOwnerWorkspace();
  const { confirm } = useConfirm();
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [actions, setActions] = useState<string | null>(null);
  const actionsArea = useRef<HTMLDivElement>(null);
  const closeActions = useCallback(() => setActions(null), []);
  useDismiss(actions !== null, actionsArea, closeActions);
  const filtered = useMemo(
    () =>
      staff.filter((person) =>
        (person.display_name + " " + person.email).toLowerCase().includes(query.toLowerCase()),
      ),
    [staff, query],
  );
  const updateRole = async (person: OwnerStaffMember, role: OwnerStaffMember["role"]) => {
    await editStaff(person.id, { role, status: person.status });
    notify("Роль сотрудника обновлена");
  };
  const deactivate = async (person: OwnerStaffMember) => {
    await editStaff(person.id, {
      role: person.role,
      status: person.status === "inactive" ? "active" : "inactive",
    });
    setActions(null);
    notify(person.status === "inactive" ? "Доступ восстановлен" : "Доступ приостановлен");
  };
  const remove = async (person: OwnerStaffMember) => {
    if (
      !(await confirm({
        description: t("Удалить сотрудника {name} из команды?", { name: person.display_name }),
      }))
    )
      return;
    await removeStaff(person.id);
    setActions(null);
    notify("Сотрудник удален");
  };

  return (
    <div className="vendor-team">
      <PageHeader
        title={t("Команда")}
        actions={
          <Button icon={Plus} onClick={onInvite}>
            {t("Пригласить сотрудника")}
          </Button>
        }
      />
      <section className="panel team-panel">
        <div className="list-toolbar">
          <p>
            {t("Сотрудников:")} <strong>{staff.length}</strong>
          </p>
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Поиск по команде")}
            />
          </label>
        </div>
        {filtered.length ? (
          <div className="team-list">
            {filtered.map((person) => (
              <div className="team-row" key={person.id}>
                <span className="person-avatar blue">
                  {person.display_name
                    .split(/\s+/)
                    .map((part) => part.at(0))
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="person-copy">
                  <strong>{person.display_name}</strong>
                  <small>{person.email}</small>
                </div>
                <select
                  aria-label={t("Роль {name}", { name: person.display_name })}
                  value={person.role}
                  onChange={(event) =>
                    void updateRole(person, event.target.value as OwnerStaffMember["role"])
                  }
                >
                  <option value="manager">{t("Менеджер")}</option>
                  <option value="waiter">{t("Официант")}</option>
                </select>
                <StatusPill status={statusLabel[person.status]} />
                <div className="row-actions" ref={actions === person.id ? actionsArea : undefined}>
                  <IconButton
                    icon={Ellipsis}
                    active={actions === person.id}
                    label={t("Действия с {name}", { name: person.display_name })}
                    onClick={() => setActions(actions === person.id ? null : person.id)}
                  />
                  {actions === person.id && (
                    <div className="row-actions-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          navigator.clipboard?.writeText(person.email);
                          setActions(null);
                          notify("E-mail скопирован");
                        }}
                      >
                        <Copy size={18} />
                        {t("Скопировать e-mail")}
                      </button>
                      {person.status === "invited" && (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={sending}
                          onClick={async () => {
                            setSending(true);
                            try {
                              await resendInvitation(person.id);
                              notify("Приглашение отправлено");
                              setActions(null);
                            } catch {
                              notify("Не удалось отправить приглашение. Повторите через минуту.");
                            } finally {
                              setSending(false);
                            }
                          }}
                        >
                          <Send size={18} />
                          {sending ? t("Отправляем...") : t("Отправить приглашение снова")}
                        </button>
                      )}
                      {person.status !== "invited" && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void deactivate(person)}
                        >
                          {person.status === "inactive" ? (
                            <UserCheck size={18} />
                          ) : (
                            <UserX size={18} />
                          )}
                          {person.status === "inactive"
                            ? t("Вернуть доступ")
                            : t("Приостановить доступ")}
                        </button>
                      )}
                      <hr />
                      <button
                        type="button"
                        role="menuitem"
                        className="danger"
                        onClick={() => void remove(person)}
                      >
                        <Trash2 size={18} />
                        {t("Удалить из команды")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyIllustration
            icon={Search}
            title={staff.length ? t("Ничего не найдено") : t("Команда пока пустая")}
            text={
              staff.length
                ? t("Измените поисковый запрос.")
                : t("Пригласите менеджера или официанта.")
            }
          />
        )}
      </section>
    </div>
  );
}
