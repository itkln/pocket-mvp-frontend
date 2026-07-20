"use client";

import { Ellipsis, Plus, Search } from "lucide-react";
import { Button, IconButton, StatusPill, PageHeader } from "../ui";

export function TeamScreen({ onInvite, notify }: { onInvite: () => void; notify: (message: string) => void }) {
  const staff = [
    { initials: "SM", name: "София Марек", email: "sofia@northvine.sk", role: "Официант", status: "На смене", color: "coral" },
    { initials: "AK", name: "Адам Ковач", email: "adam@northvine.sk", role: "Менеджер", status: "На смене", color: "green" },
    { initials: "LN", name: "Лукас Новак", email: "lukas@northvine.sk", role: "Кухня", status: "Не на смене", color: "blue" },
    { initials: "EV", name: "Эма Вarga", email: "ema@northvine.sk", role: "Официант", status: "Приглашен", color: "gold" },
  ];
  return <><PageHeader title="Команда" subtitle="Сотрудники, роли и доступ к рабочему пространству." actions={<Button icon={Plus} onClick={onInvite}>Пригласить сотрудника</Button>} /><section className="panel team-panel"><div className="list-toolbar"><p><strong>4</strong> сотрудника</p><label className="search-field"><Search size={17} /><input placeholder="Поиск по команде" /></label></div><div className="team-list">{staff.map((person) => <div className="team-row" key={person.email}><span className={`person-avatar ${person.color}`}>{person.initials}</span><div className="person-copy"><strong>{person.name}</strong><small>{person.email}</small></div><select defaultValue={person.role} onChange={() => notify("Роль сотрудника обновлена")}><option>Менеджер</option><option>Официант</option><option>Кухня</option><option>Только просмотр</option></select><StatusPill status={person.status} /><IconButton icon={Ellipsis} label="Действия" /></div>)}</div></section></>;
}


