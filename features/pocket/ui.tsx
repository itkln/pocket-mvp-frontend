import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { type MenuItem } from "./model";

export function money(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(value);
}

export function Button({ children, icon: Icon, kind = "primary", onClick, type = "button", disabled = false, className = "" }: { children?: ReactNode; icon?: LucideIcon; kind?: "primary" | "secondary" | "quiet" | "danger"; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; className?: string }) {
  return <button type={type} className={`button ${kind} ${className}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={17} />}{children}</button>;
}

export function IconButton({ icon: Icon, label, onClick, active = false, className = "" }: { icon: LucideIcon; label: string; onClick?: () => void; active?: boolean; className?: string }) {
  return <button className={`icon-button ${active ? "active" : ""} ${className}`} onClick={onClick} aria-label={label} title={label}><Icon size={19} /></button>;
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}><i />{status}</span>;
}

export function FoodImage({ item, className = "" }: { item: MenuItem; className?: string }) {
  return <div className={`food-image ${className}`} style={{ backgroundPosition: item.position }} role="img" aria-label={item.name} />;
}

export function EmptyIllustration({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="empty-state"><span><Icon size={24} /></span><h3>{title}</h3><p>{text}</p></div>;
}


export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</div>;
}


export function PanelTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}


export function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) { return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span>{children}</label>; }
export function ToggleRow({ title, text, checked = false }: { title: string; text: string; checked?: boolean }) { return <div><div><strong>{title}</strong><p>{text}</p></div><label className="switch"><input type="checkbox" defaultChecked={checked} /><span /></label></div>; }

