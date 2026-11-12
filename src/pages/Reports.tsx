import { useMemo, useState } from "react";
import { useDemo } from "../data/store";
import { addDays, addMonths, monthKey } from "../domain/dates";
import { toCSV } from "../domain/csv";
import { downloadText } from "../lib/download";
import { countByZone, filterAppointments, monthlyCompleted, outcomes, technicianStats } from "../domain/reports";
import type { ServiceType } from "../domain/types";
import { useFormat } from "../features/useFormat";
import { BarChart, Donut, HBars, Legend } from "../ui/charts";
import { Icon } from "../ui/Icon";
import { Avatar, Button, Card, PageHeader, Select, cx } from "../ui/primitives";

type Period = "p30" | "p90" | "p180" | "p365";
const PERIODS: Period[] = ["p30", "p90", "p180", "p365"];

/** Day-based windows for short periods; whole calendar months for long ones, so no bar is a partial first month. */
export function periodStart(period: Period, today: string) {
  if (period === "p30") return addDays(today, -29);
  if (period === "p90") return addDays(today, -89);
  return `${monthKey(addMonths(today, period === "p180" ? -5 : -11))}-01`;
}
const TYPES: ServiceType[] = ["maintenance", "installation", "inspection"];

export function Reports() {
  const { data, today, customersById, techById } = useDemo();
  const { t, pick, fmtNumber, fmtDate, months, time } = useFormat();
  const [period, setPeriod] = useState<Period>("p180");
  const [types, setTypes] = useState<ServiceType[]>(TYPES);
  const [zone, setZone] = useState("all");
  const [showTable, setShowTable] = useState(false);

  const from = periodStart(period, today);
  const r = useMemo(() => {
    const list = filterAppointments(data.appointments, customersById, { from, to: today, types, zoneId: zone });
    return {
      list,
      monthly: monthlyCompleted(list, from, today),
      outcome: outcomes(list.filter((a) => a.date < today || a.status === "completed")),
      zones: countByZone(list, customersById),
      team: technicianStats(list, data.technicians),
    };
  }, [data, customersById, from, today, types, zone]);

  const series = TYPES.map((ty, i) => ({ key: ty, name: t(`type.${ty}`), color: `var(--series-${i + 1})` })).filter((s) => types.includes(s.key as ServiceType));
  const mtd = monthKey(today);
  const monthLabel = (m: string) => `${months[Number(m.slice(5, 7)) - 1]}${m.endsWith("-01") ? ` ${m.slice(2, 4)}` : ""}${m === mtd ? "*" : ""}`;
  const totalCompleted = r.monthly.reduce((s, b) => s + b.maintenance + b.installation + b.inspection, 0);

  const toggleType = (ty: ServiceType) =>
    setTypes((xs) => (xs.includes(ty) ? (xs.length > 1 ? xs.filter((x) => x !== ty) : xs) : TYPES.filter((x) => x === ty || xs.includes(x))));

  const exportCsv = () => {
    const header = ["visit", "date", "start", "type", "status", "customer_code", "customer", "zone", "technician"];
    const rows = r.list.map((a) => {
      const c = customersById.get(a.customerId)!;
      return [a.code, a.date, time(a.startMin), a.type, a.status, c.code, pick(c.name), pick(data.zones.find((z) => z.id === c.zoneId)!.name),
        a.technicianId ? pick(techById.get(a.technicianId)!.name) : ""];
    });
    downloadText(`${t("reports.exportName")}-${from}-to-${today}.csv`, toCSV(header, rows));
  };

  return (
    <>
      <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")}
        actions={<Button icon="download" onClick={exportCsv} data-testid="export-csv">{t("common.exportCsv")}</Button>} />

      {/* Filters — one row above all charts */}
      <div className="card p-3 mb-4 flex flex-wrap items-end gap-3">
        <Select label={t("reports.period")} value={period} onChange={(v) => setPeriod(v as Period)} className="w-44" id="report-period">
          {PERIODS.map((p) => <option key={p} value={p}>{t(`reports.${p}`)}</option>)}
        </Select>
        <Select label={t("reports.zone")} value={zone} onChange={setZone} className="w-44">
          <option value="all">{t("schedule.allZones")}</option>
          {data.zones.map((z) => <option key={z.id} value={z.id}>{pick(z.name)}</option>)}
        </Select>
        <fieldset>
          <legend className="label">{t("reports.types")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((ty, i) => (
              <button key={ty} type="button" aria-pressed={types.includes(ty)} onClick={() => toggleType(ty)}
                className={cx("h-8 px-2.5 rounded border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                  types.includes(ty) ? "bg-surface border-line-strong text-ink" : "bg-surface-sunken border-line text-ink-3 line-through")}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: types.includes(ty) ? `var(--series-${i + 1})` : "var(--line-strong)" }} />
                {t(`type.${ty}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="ms-auto text-2xs text-ink-3 num self-center">{fmtDate(from)} – {fmtDate(today)}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Card className="xl:col-span-2" title={<span>{t("reports.volume")} <span className="text-ink-3 font-normal num">· {fmtNumber(totalCompleted)}</span></span>}
          actions={<>
            {!showTable && <span className="hidden sm:block"><Legend series={series} /></span>}
            <Button size="sm" variant="ghost" icon={showTable ? "chart" : "table"} onClick={() => setShowTable((x) => !x)} aria-label={showTable ? t("reports.chart") : t("reports.table")} title={showTable ? t("reports.chart") : t("reports.table")} />
          </>}>
          {showTable ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.8125rem]" data-testid="volume-table">
                <thead><tr className="border-b border-line-subtle"><th className="th">{t("reports.month")}</th>{series.map((s) => <th key={s.key} className="th text-end">{s.name}</th>)}<th className="th text-end">{t("reports.total")}</th></tr></thead>
                <tbody className="divide-y divide-line-subtle">
                  {r.monthly.map((b) => {
                    const vals = series.map((s) => b[s.key as ServiceType]);
                    return (
                      <tr key={b.month}><td className="td">{months[Number(b.month.slice(5)) - 1]} {b.month.slice(0, 4)}</td>
                        {vals.map((v, i) => <td key={i} className="td text-end num">{fmtNumber(v)}</td>)}
                        <td className="td text-end num font-semibold">{fmtNumber(vals.reduce((x, y) => x + y, 0))}</td></tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <BarChart ariaLabel={t("reports.volume")} height={240} categories={r.monthly.map((b) => b.month)} series={series}
              values={r.monthly.map((b) => series.map((s) => b[s.key as ServiceType]))} formatCategory={monthLabel} />
          )}
          <p className="mt-2 text-2xs text-ink-3">{t("reports.mtd")}</p>
        </Card>

        <Card title={t("reports.outcomes")}>
          <div className="mb-4">
            <p className="text-2xs text-ink-3">{t("reports.completionRate")}</p>
            <p className="text-[1.75rem] font-semibold leading-tight num" data-testid="completion-rate">
              {r.outcome.completionRate === null ? "—" : fmtNumber(r.outcome.completionRate, { style: "percent", maximumFractionDigits: 1 })}
            </p>
          </div>
          <Donut ariaLabel={t("reports.outcomes")} centerLabel={t("overview.visits")} slices={[
            { key: "completed", label: t("status.completed"), value: r.outcome.completed, color: "var(--ok-solid)" },
            { key: "postponed", label: t("status.postponed"), value: r.outcome.postponed, color: "var(--mute-solid)" },
            { key: "cancelled", label: t("status.cancelled"), value: r.outcome.cancelled, color: "var(--bad-solid)" },
          ]} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title={t("reports.byZone")}>
          <HBars ariaLabel={t("reports.byZone")} rows={data.zones
            .map((z) => ({ key: z.id, label: pick(z.name), value: r.zones.get(z.id) ?? 0 }))
            .filter((x) => zone === "all" || x.key === zone)
            .sort((a, b) => b.value - a.value)} />
        </Card>

        <Card title={t("reports.team")} className="xl:col-span-2" bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" data-testid="team-table">
              <thead className="bg-surface-sunken border-b border-line-subtle">
                <tr>
                  <th className="th">{t("reports.colTech")}</th>
                  <th className="th text-end">{t("reports.colCompleted")}</th>
                  <th className="th text-end">{t("reports.colHours")}</th>
                  <th className="th text-end">{t("reports.colCancelled")}</th>
                  <th className="th text-end">{t("reports.colOnTime")}</th>
                  <th className="th text-end">{t("reports.colRating")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {r.team.map((s) => {
                  const max = Math.max(1, r.team[0].completed);
                  return (
                    <tr key={s.technician.id}>
                      <td className="td"><span className="flex items-center gap-2"><Avatar name={s.technician.name.en} size="sm" />{pick(s.technician.name)}</span></td>
                      <td className="td text-end num">
                        <span className="inline-flex items-center gap-2 justify-end">
                          <span className="hidden sm:block h-1.5 w-16 rounded-full bg-surface-active overflow-hidden"><span className="block h-full bg-series-1" style={{ width: `${(s.completed / max) * 100}%` }} /></span>
                          {fmtNumber(s.completed)}
                        </span>
                      </td>
                      <td className="td text-end num">{fmtNumber(s.hours)}</td>
                      <td className="td text-end num">{fmtNumber(s.cancelled)}</td>
                      <td className="td text-end num">{fmtNumber(s.technician.onTimeRate, { style: "percent" })}</td>
                      <td className="td text-end num"><span className="inline-flex items-center gap-1">{fmtNumber(s.technician.rating, { minimumFractionDigits: 1 })}<Icon name="star" className="w-3 h-3 text-warn-solid" /></span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 border-t border-line-subtle text-2xs text-ink-3">{t("reports.syntheticNote")}</p>
        </Card>
      </div>
    </>
  );
}
