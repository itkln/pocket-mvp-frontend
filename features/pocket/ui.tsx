"use client";

import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useI18n } from "./i18n";
import { motionEnabled } from "./motion-preference";

export function money(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(value);
}

// A number that counts towards its value: from zero when it first appears, from the shown
// number when the value changes. React renders the final text; the count only rewrites that
// text node while it runs, and is skipped when animations are off (motion-preference.ts).
export function CountUp({
  value,
  format = (current) => String(Math.round(current)),
}: {
  value: number;
  format?: (value: number) => string;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const formatter = useRef(format);
  useLayoutEffect(() => {
    formatter.current = format;
  });
  useLayoutEffect(() => {
    const text = node.current?.firstChild;
    const from = shown.current;
    if (!text || from === value) return;
    if (!motionEnabled()) {
      shown.current = value;
      return;
    }
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      // A frame timestamp can be a little earlier than the start: never count backwards.
      const progress = Math.min(1, Math.max(0, (now - started) / 900));
      const current = progress === 1 ? value : from + (value - from) * (1 - (1 - progress) ** 4);
      shown.current = current;
      text.nodeValue = formatter.current(current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    text.nodeValue = formatter.current(from);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span className="count-up" ref={node}>
      {format(value)}
    </span>
  );
}

export function Button({
  children,
  icon: Icon,
  kind = "primary",
  onClick,
  type = "button",
  disabled = false,
  className = "",
  ariaLabel,
}: {
  children?: ReactNode;
  icon?: LucideIcon;
  kind?: "primary" | "secondary" | "quiet" | "danger";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      className={`button ${kind} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {Icon && <Icon size={17} />}
      {children}
    </button>
  );
}

export const TooltipContext = createContext(true);

export function IconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const showTooltip = useContext(TooltipContext);
  return (
    <button
      className={`icon-button ${active ? "active" : ""} ${className}`}
      onClick={onClick}
      aria-label={label}
      title={showTooltip ? label : undefined}
    >
      <Icon size={19} />
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  const { t } = useI18n();
  return (
    <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>
      <i />
      {t(status)}
    </span>
  );
}

export function EmptyIllustration({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}

// A stat card from the menu page: title row, large value, optional progress bar and caption.
// With onClick the whole card is a button that leads to the related screen.
export function StatCard({
  title,
  value,
  caption,
  progress,
  onClick,
  active = false,
  tone,
}: {
  title: string;
  value: ReactNode;
  caption?: ReactNode;
  progress?: number;
  onClick?: () => void;
  active?: boolean;
  tone?: "warning";
}) {
  const className = `vendor-stat-card ${active ? "active" : ""} ${tone ? `tone-${tone}` : ""}`;
  const content = (
    <>
      <span className="vendor-stat-heading">
        {title}
        {onClick && <ChevronRight size={18} />}
      </span>
      <strong>{value}</strong>
      {progress !== undefined && (
        <span className="vendor-stat-track">
          <i style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </span>
      )}
      {caption && <small>{caption}</small>}
    </>
  );
  return onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function PanelTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function ToggleRow({
  title,
  text,
  checked = false,
}: {
  title: string;
  text: string;
  checked?: boolean;
}) {
  return (
    <div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <label className="switch">
        <input type="checkbox" defaultChecked={checked} />
        <span />
      </label>
    </div>
  );
}
