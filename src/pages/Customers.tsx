import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDemo } from "../data/store";
import type { ServiceHealth } from "../domain/service";
import { CustomerDialog } from "../features/CustomerDialog";
import { useFormat } from "../features/useFormat";
import { Icon } from "../ui/Icon";
import { Button, Card, EmptyState, HealthBadge, PageHeader, Select, cx } from "../ui/primitives";

const PAGE = 20;
type SortKey = "name" | "next" | "previous" | "code";
const HEALTHS: ServiceHealth[] = ["overdue", "due_soon", "booked", "on_track"];

export function Customers() {
  const { data, summaries } = useDemo();
  const { t, pick, fmtNumber, fmtDate, relDistance } = useFormat();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const q = params.get("q") ?? "";
  const zone = params.get("zone") ?? "all";
  const health = params.get("health") ?? "all";
  const segment = params.get("segment") ?? "all";
  const sort = (params.get("sort") as SortKey) ?? "next";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all" || (k === "sort" && v === "next")) next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data.customers.filter((c) => {
      const s = summaries.get(c.id)!;
      if (zone !== "all" && c.zoneId !== zone) return false;
      if (health !== "all" && s.health !== health) return false;
      if (segment !== "all" && c.segment !== segment) return false;
      if (needle) {
        const hay = `${c.name.en} ${c.name.ar} ${c.code} ${c.district.en} ${c.district.ar}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const nextDate = (id: string) => {
      const s = summaries.get(id)!;
      return s.next.kind === "booked" ? s.next.appointment.date : s.next.date;
    };
    list.sort((a, b) => {
      switch (sort) {
        case "name": return pick(a.name).localeCompare(pick(b.name));
        case "code": return a.code.localeCompare(b.code, undefined, { numeric: true });
        case "previous": return (summaries.get(b.id)!.previous?.date ?? "").localeCompare(summaries.get(a.id)!.previous?.date ?? "");
        default: return nextDate(a.id).localeCompare(nextDate(b.id));
      }
    });
    return list;
  }, [data.customers, summaries, q, zone, health, segment, sort, pick]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages);
  const slice = rows.slice((current - 1) * PAGE, current * PAGE);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of summaries.values()) c[s.health] = (c[s.health] ?? 0) + 1;
    return c;
  }, [summaries]);

  const zoneName = (id: string) => pick(data.zones.find((z) => z.id === id)!.name);
  const systemName = (id: string) => pick(data.systems.find((s) => s.id === id)!.name);

  return (
    <>
      <PageHeader title={t("customers.title")} subtitle={t("customers.subtitle", { n: fmtNumber(data.customers.length) })}
        actions={<Button variant="primary" icon="plus" onClick={() => setAdding(true)} data-testid="add-customer">{t("customers.add")}</Button>} />

      {/* Quick health filter chips */}
      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={t("customers.health")}>
        {(["all", ...HEALTHS] as const).map((h) => (
          <button key={h} type="button" onClick={() => set({ health: h })} aria-pressed={health === h}
            className={cx("h-7 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
              health === h ? "bg-brand text-brand-fg border-brand" : "bg-surface border-line text-ink-2 hover:border-line-strong")}>
            {h === "all" ? t("common.all") : t(`health.${h}`)}
            <span className={cx("num text-2xs", health === h ? "opacity-90" : "text-ink-3")}>{fmtNumber(h === "all" ? data.customers.length : counts[h] ?? 0)}</span>
          </button>
        ))}
      </div>

      <Card bodyClass="p-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] gap-3 p-3 border-b border-line-subtle">
          <label className="block">
            <span className="label">{t("common.search")}</span>
            <span className="relative block">
              <Icon name="search" className="w-4 h-4 absolute top-2 start-2.5 text-ink-3" />
              <input type="search" className="field ps-8" placeholder={t("customers.searchPlaceholder")} value={q}
                onChange={(e) => set({ q: e.target.value })} data-testid="customer-search" />
            </span>
          </label>
          <Select label={t("customers.zone")} value={zone} onChange={(v) => set({ zone: v })}>
            <option value="all">{t("common.all")}</option>
            {data.zones.map((z) => <option key={z.id} value={z.id}>{pick(z.name)}</option>)}
          </Select>
          <Select label={t("customers.segment")} value={segment} onChange={(v) => set({ segment: v })}>
            <option value="all">{t("common.all")}</option>
            <option value="residential">{t("segment.residential")}</option>
            <option value="commercial">{t("segment.commercial")}</option>
          </Select>
          <Select label={t("customers.sortBy")} value={sort} onChange={(v) => set({ sort: v })} id="customer-sort">
            <option value="next">{t("customers.colNext")}</option>
            <option value="previous">{t("customers.colPrevious")}</option>
            <option value="name">{t("customers.colCustomer")}</option>
            <option value="code">PH-####</option>
          </Select>
        </div>

        {slice.length === 0 ? <EmptyState icon="search">{t("common.noResults")}</EmptyState> : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse" data-testid="customer-table">
                <thead className="bg-surface-sunken border-b border-line-subtle">
                  <tr>
                    <th className="th">{t("customers.colCustomer")}</th>
                    <th className="th">{t("customers.colZone")}</th>
                    <th className="th hidden xl:table-cell">{t("customers.colSystem")}</th>
                    <th className="th">{t("customers.colPrevious")}</th>
                    <th className="th">{t("customers.colNext")}</th>
                    <th className="th">{t("customers.colStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {slice.map((c) => {
                    const s = summaries.get(c.id)!;
                    const nextDate = s.next.kind === "booked" ? s.next.appointment.date : s.next.date;
                    return (
                      <tr key={c.id} className="hover:bg-surface-hover cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                        <td className="td">
                          <Link to={`/customers/${c.id}`} className="font-medium text-ink hover:text-brand" onClick={(e) => e.stopPropagation()}>{pick(c.name)}</Link>
                          <span className="block text-2xs text-ink-3 num">{c.code} · {t(`segment.${c.segment}`)}</span>
                        </td>
                        <td className="td text-ink-2">{zoneName(c.zoneId)}<span className="block text-2xs text-ink-3">{pick(c.district)}</span></td>
                        <td className="td text-ink-2 hidden xl:table-cell">{systemName(c.systemId)}<span className="block text-2xs text-ink-3">{t("customers.everyMonths", { n: c.cycleMonths })}</span></td>
                        <td className="td num">{s.previous ? <>{fmtDate(s.previous.date)}<span className="block text-2xs text-ink-3">{relDistance(s.previous.date)}</span></> : <span className="text-ink-3">{t("customers.never")}</span>}</td>
                        <td className="td num">
                          {fmtDate(nextDate)}
                          <span className={cx("block text-2xs", s.health === "overdue" ? "text-bad-fg" : "text-ink-3")}>
                            {s.next.kind === "projected" ? `${t("customers.projected")} · ` : ""}{relDistance(nextDate)}
                          </span>
                        </td>
                        <td className="td"><HealthBadge health={s.health} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-line-subtle">
              {slice.map((c) => {
                const s = summaries.get(c.id)!;
                const nextDate = s.next.kind === "booked" ? s.next.appointment.date : s.next.date;
                return (
                  <li key={c.id}>
                    <Link to={`/customers/${c.id}`} className="block px-4 py-3 hover:bg-surface-hover">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{pick(c.name)}</p>
                          <p className="text-2xs text-ink-3 num">{c.code} · {pick(c.district)}</p>
                        </div>
                        <HealthBadge health={s.health} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs num">
                        <div><span className="block text-2xs text-ink-3">{t("customers.colPrevious")}</span>{s.previous ? fmtDate(s.previous.date) : "—"}</div>
                        <div><span className="block text-2xs text-ink-3">{t("customers.colNext")}{s.next.kind === "projected" ? ` (${t("customers.projected")})` : ""}</span>{fmtDate(nextDate)}</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-t border-line-subtle text-xs text-ink-3">
          <span className="num" data-testid="customer-count">
            {t("common.showing", { from: fmtNumber(rows.length ? (current - 1) * PAGE + 1 : 0), to: fmtNumber(Math.min(current * PAGE, rows.length)), total: fmtNumber(rows.length) })}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={current <= 1} onClick={() => set({ page: String(current - 1) })} aria-label={t("common.previous")}>
              <Icon name="chevron" className="w-4 h-4 rotate-180 rtl:rotate-0" />
            </Button>
            <span className="num px-1">{current} / {pages}</span>
            <Button size="sm" variant="ghost" disabled={current >= pages} onClick={() => set({ page: String(current + 1) })} aria-label={t("common.next")}>
              <Icon name="chevron" className="w-4 h-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </Card>

      <CustomerDialog open={adding} onClose={() => setAdding(false)} onCreated={(id) => navigate(`/customers/${id}`)} />
    </>
  );
}
