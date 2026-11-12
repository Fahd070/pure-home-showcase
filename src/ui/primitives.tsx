import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./Icon";
import { useI18n } from "../i18n";
import type { AppointmentStatus, ServiceType } from "../domain/types";
import type { ServiceHealth } from "../domain/service";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-brand-hover border border-transparent",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-hover",
  ghost: "text-ink-2 hover:bg-surface-hover hover:text-ink border border-transparent",
  danger: "bg-bad-solid text-white hover:opacity-90 border border-transparent",
};

export const buttonClass = (variant: Variant = "secondary", size: "sm" | "md" = "md", extra?: string) =>
  cx(
    "inline-flex items-center justify-center gap-1.5 rounded font-medium whitespace-nowrap transition-colors",
    "disabled:opacity-50 disabled:pointer-events-none",
    size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-[0.8125rem]",
    VARIANTS[variant],
    extra,
  );

export function Button({
  variant = "secondary", icon, size = "md", className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; size?: "sm" | "md" }) {
  return (
    <button type="button" {...rest} className={buttonClass(variant, size, className)}>
      {icon && <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      {children}
    </button>
  );
}

export type Tone = "ok" | "warn" | "bad" | "info" | "prog" | "mute" | "brand";
const TONES: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok-fg border-ok-line",
  warn: "bg-warn-bg text-warn-fg border-warn-line",
  bad: "bg-bad-bg text-bad-fg border-bad-line",
  info: "bg-info-bg text-info-fg border-info-line",
  prog: "bg-prog-bg text-prog-fg border-prog-line",
  mute: "bg-mute-bg text-mute-fg border-mute-line",
  brand: "bg-brand-soft text-brand-softfg border-brand-line",
};
const DOTS: Record<Tone, string> = {
  ok: "bg-ok-solid", warn: "bg-warn-solid", bad: "bg-bad-solid", info: "bg-info-solid",
  prog: "bg-prog-solid", mute: "bg-mute-solid", brand: "bg-brand",
};

export function Badge({ tone, children, dot = true }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full border text-2xs font-semibold whitespace-nowrap", TONES[tone])}>
      {dot && <span className={cx("w-1.5 h-1.5 rounded-full", DOTS[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<AppointmentStatus, Tone> = {
  scheduled: "info", en_route: "warn", in_progress: "prog", completed: "ok", postponed: "mute", cancelled: "bad",
};
export const HEALTH_TONE: Record<ServiceHealth, Tone> = { booked: "brand", overdue: "bad", due_soon: "warn", on_track: "ok" };
export const TYPE_COLOR: Record<ServiceType, string> = {
  maintenance: "var(--series-1)", installation: "var(--series-2)", inspection: "var(--series-3)",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useI18n();
  return <Badge tone={STATUS_TONE[status]}>{t(`status.${status}`)}</Badge>;
}

export function HealthBadge({ health }: { health: ServiceHealth }) {
  const { t } = useI18n();
  return <Badge tone={HEALTH_TONE[health]}>{t(`health.${health}`)}</Badge>;
}

export function TypeTag({ type }: { type: ServiceType }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-2 whitespace-nowrap">
      <span className="w-2 h-2 rounded-sm" style={{ background: TYPE_COLOR[type] }} aria-hidden="true" />
      {t(`type.${type}`)}
    </span>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.replace(/^(Al-|ال)/, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.replace(/^(Al-|ال)/, "")[0]).join("");
  const s = size === "sm" ? "w-7 h-7 text-2xs" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-xs";
  return (
    <span className={cx("inline-flex items-center justify-center rounded-full bg-brand-soft text-brand-softfg font-semibold flex-shrink-0", s)} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Progress({ value, tone = "brand", label }: { value: number; tone?: "brand" | "ok"; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-active overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx("h-full rounded-full transition-[width] duration-300", tone === "ok" ? "bg-ok-solid" : "bg-brand")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ title, actions, children, className, bodyClass = "p-4" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cx("card min-w-0", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 h-11 border-b border-line-subtle">
          {title && <h2 className="text-[0.8125rem] font-semibold text-ink truncate">{title}</h2>}
          {actions && <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="text-[0.8125rem] text-ink-3 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Select({ label, value, onChange, children, className, id }: {
  label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string; id?: string;
}) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="label">{label}</span>
      <select id={id} className="field pe-7" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

/** Accessible modal dialog: focus moves in, Escape closes, focus returns to the opener. */
export function Dialog({ open, onClose, title, children, footer, width = "max-w-lg" }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])");
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href]")].filter((el) => !el.hasAttribute("disabled"));
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 scrim-enter" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="dlg-title" tabIndex={-1}
        className={cx("relative w-full card shadow-pop pop-enter my-auto", width)}>
        <header className="flex items-center justify-between gap-3 px-5 h-12 border-b border-line-subtle">
          <h2 id="dlg-title" className="text-sm font-semibold">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label={t("common.close")}
            className="w-7 h-7 -me-1.5 inline-flex items-center justify-center rounded text-ink-3 hover:bg-surface-hover hover:text-ink">
            <Icon name="x" />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-line-subtle bg-surface-sunken rounded-b-lg">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function EmptyState({ icon = "info", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-ink-3 text-[0.8125rem]">
      <Icon name={icon} className="w-6 h-6" />
      <div>{children}</div>
    </div>
  );
}
