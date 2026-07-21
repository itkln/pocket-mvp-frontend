"use client";

import { useMemo, useState } from "react";
import { Ellipsis, Mail, Plus, Search, Trash2, UserX } from "lucide-react";
import { type OwnerStaffMember } from "../../../lib/owner-api";
import { Button, EmptyIllustration, IconButton, PageHeader, StatusPill } from "../ui";
import { useOwnerWorkspace } from "./context";

const statusLabel: Record<OwnerStaffMember["status"], string> = { invited: "Приглашен", active: "Активен", inactive: "Неактивен" };

export function TeamScreen({ onInvite, notify }: { onInvite: () => void; notify: (message: string) => void }) {
  const { staff, editStaff, removeStaff } = useOwnerWorkspace();
  const [query, setQuery] = useState("");
  const [actions, setActions] = useState<string | null>(null);
  const filtered = useMemo(() => staff.filter((person) => (person.display_name + " " + person.email).toLowerCase().includes(query.toLowerCase())), [staff, query]);
  const updateRole = async (person: OwnerStaffMember, role: OwnerStaffMember["role"]) => { await editStaff(person.id, { role, status: person.status }); notify("Роль сотрудника обновлена"); };
  const deactivate = async (person: OwnerStaffMember) => { await editStaff(person.id, { role: person.role, status: person.status === "inactive" ? "active" : "inactive" }); setActions(null); notify(person.status === "inactive" ? "Доступ восстановлен" : "Доступ приостановлен"); };
  const remove = async (person: OwnerStaffMember) => { if (!window.confirm("Удалить сотрудника из команды?")) return; await removeStaff(person.id); setActions(null); notify("Сотрудник удален"); };

  return <><PageHeader title="Команда" subtitle="Сотрудники, роли и доступ к заведению." actions={<Button icon={Plus} onClick={onInvite}>Пригласить сотрудника</Button>} /><section className="panel team-panel"><div className="list-toolbar"><p>Сотрудников: <strong>{staff.length}</strong></p><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по команде" /></label></div>{filtered.length ? <div className="team-list">{filtered.map((person) => <div className="team-row" key={person.id}><span className="person-avatar blue">{person.display_name.split(/\s+/).map((part) => part.at(0)).slice(0, 2).join("").toUpperCase()}</span><div className="person-copy"><strong>{person.display_name}</strong><small>{person.email}</small></div><select aria-label={"Роль " + person.display_name} value={person.role} onChange={(event) => void updateRole(person, event.target.value as OwnerStaffMember["role"])}><option value="manager">Менеджер</option><option value="waiter">Официант</option><option value="kitchen">Кухня</option><option value="viewer">Только просмотр</option></select><StatusPill status={statusLabel[person.status]} /><div className="row-actions"><IconButton icon={Ellipsis} label={"Действия с " + person.display_name} onClick={() => setActions(actions === person.id ? null : person.id)} />{actions === person.id && <div className="row-actions-menu"><button onClick={() => { navigator.clipboard?.writeText(person.email); setActions(null); notify("E-mail скопирован"); }}><Mail size={16} />Скопировать e-mail</button><button onClick={() => void deactivate(person)}><UserX size={16} />{person.status === "inactive" ? "Вернуть доступ" : "Приостановить доступ"}</button><button className="danger" onClick={() => void remove(person)}><Trash2 size={16} />Удалить из команды</button></div>}</div></div>)}</div> : <EmptyIllustration icon={Search} title={staff.length ? "Ничего не найдено" : "Команда пока пустая"} text={staff.length ? "Измените поисковый запрос." : "Пригласите менеджера, официанта или сотрудника кухни."} />}</section></>;
}
