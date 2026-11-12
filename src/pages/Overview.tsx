import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDemo } from "../data/store";
import { addDays, monthKey } from "../domain/dates";
import { outcomes } from "../domain/reports";
import { OPEN_STATUSES, type AppointmentStatus, type ServiceType } from "../domain/types";
import { AppointmentDetail } from "../features/AppointmentDetail";
import { AppointmentDialog } from "../features/AppointmentDialog";
import { useFormat } from "../features/useFormat";
import { BarChart, Donut, Legend } from "../ui/charts";
import { Icon, type IconName } from "../ui/Icon";
import { Avatar, Button, Card, buttonClass, EmptyState, PageHeader, Progress, StatusBadge, TypeTag, cx } from "../ui/primitives";

const TYPES: ServiceType[] = ["maintenance", "installation", "inspection"];
const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: "var(--info-solid)", en_route: "var(--warn-solid)", in_progress: "var(--prog-solid)",
  completed: "var(--ok-solid)", postponed: "var(--mute-solid)", cancelled: "var(--bad-solid)",
};

function Stat({ label, value, hint, icon, tone, to, testId }: {
  label: string; value: string; hint: string; icon: IconName; tone?: "bad"; to: string; testId: string;
}) {
  return (
    <Link to={to} className="card p-4 flex flex-col gap-2 hover:border-line-strong transition-colors group" data-testid={testId}>
      <div className="flex items-center justify-between text-ink-3">
        <span className="text-xs font-medium">{label}</span>
        <span className={cx("w-7 h-7 rounded-md inline-flex items-center justify-center", tone === "bad" ? "bg-bad-bg text-bad-fg" : "bg-brand-soft text-brand-softfg")}>
          <Icon name={icon} />
        </span>
      </div>
      <span className="text-[1.75rem] leading-none font-semibold tracking-tight text-ink num">{value}</span>
      <span className={cx("text-xs", tone === "bad" ? "text-bad-fg" : "text-ink-3")}>{hint}</span>
    </Link>
  );
}

export function Overview() {
  const { data, today, summaries, customersById } = useDemo();
  const { t, pick, fmtNumber, fmtDate, slot, techName, time } = useFormat();
  const [openId, setOpenId] = useState<string | null>(null);
  const [bookFor, setBookFor] = useState<string | null>(null);

  const m = useMemo(() => {
    const todays = data.appointments.filter((a) => a.date === today && a.status !== "cancelled");
    const thisMonth = data.appointments.filter((a) => monthKey(a.date) === monthKey(today) && a.date <= today);
    const overdue = [...summaries.entries()]
      .filter(([, s]) => s.health === "overdue")
      .sort((a, b) => a[1].daysToNext - b[1].daysToNext);
    const upcoming = data.appointments
      .filter((a) => OPEN_STATUSES.includes(a.status) && a.date > today)
      .slice(0, 7);
    const from = addDays(today, -13);
    const days = Array.from({ length: 14 }, (_, i) => addDays(from, i));
    const trend = days.map((d) => TYPES.map((ty) => data.appointments.filter((a) => a.date === d && a.type === ty && a.status === "completed").length));
    const statusOrder: AppointmentStatus[] = ["completed", "in_progress", "en_route", "scheduled", "postponed"];
    const mix = statusOrder.map((s) => ({ key: s, label: t(`status.${s}`), value: todays.filter((a) => a.status === s).length, color: STATUS_COLOR[s] }));
    const team = data.technicians.map((tech) => {
      const own = todays.filter((a) => a.technicianId === tech.id);
      return { tech, total: own.length, done: own.filter((a) => a.status === "completed").length, active: own.find((a) => a.status === "in_progress" || a.status === "en_route") };
    }).sort((a, b) => b.total - a.total);
    return {
      todays, overdue, upcoming, days, trend, mix, team,
      newCustomers: data.customers.filter((c) => c.createdOn >= addDays(today, -30)).length,
      month: outcomes(thisMonth),
    };
  }, [data, today, summaries, t]);

  const done = m.todays.filter((a) => a.status === "completed").length;
  const series = TYPES.map((ty, i) => ({ key: ty, name: t(`type.${ty}`), color: `var(--series-${i + 1})` }));

  return (
    <>
      <PageHeader title={t("overview.title")} subtitle={`${t("overview.subtitle")} · ${fmtDate(today, "long")}`}
        actions={<Link to="/schedule" className={buttonClass("primary")}><Icon name="calendar" />{t("overview.openSchedule")}</Link>} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <Stat testId="kpi-customers" to="/customers" icon="customers" label={t("overview.activeCustomers")} value={fmtNumber(data.customers.length)} hint={t("overview.activeCustomersHint", { n: m.newCustomers })} />
        <Stat testId="kpi-today" to="/workforce" icon="route" label={t("overview.todayVisits")} value={fmtNumber(m.todays.length)} hint={t("overview.todayVisitsHint", { done, open: m.todays.length - done })} />
        <Stat testId="kpi-month" to="/reports" icon="check" label={t("overview.monthCompleted")} value={fmtNumber(m.month.completed)}
          hint={t("overview.monthCompletedHint", { rate: m.month.completionRate === null ? "—" : fmtNumber(m.month.completionRate, { style: "percent" }) })} />
        <Stat testId="kpi-overdue" to="/customers?health=overdue" icon="alert" tone="bad" label={t("overview.overdue")} value={fmtNumber(m.overdue.length)} hint={t("overview.overdueHint")} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Card title={t("overview.weekTrend")} className="xl:col-span-2" actions={<Legend series={series} />}>
          <BarChart ariaLabel={t("overview.weekTrend")} categories={m.days} series={series} values={m.trend}
            formatCategory={(d) => fmtDate(d, "short")} />
        </Card>
        <Card title={t("overview.statusMix")}>
          <Donut slices={m.mix} ariaLabel={t("overview.statusMix")} centerLabel={t("overview.visits")} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title={t("overview.upcoming")} bodyClass="p-0" actions={<Link className="text-xs text-brand hover:underline" to="/schedule">{t("overview.openSchedule")}</Link>}>
          {m.upcoming.length === 0 ? <EmptyState>{t("overview.upcomingEmpty")}</EmptyState> : (
            <ul className="divide-y divide-line-subtle">
              {m.upcoming.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setOpenId(a.id)} className="w-full text-start px-4 py-2.5 hover:bg-surface-hover flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] font-medium truncate">{pick(customersById.get(a.customerId)!.name)}</p>
                      <p className="text-2xs text-ink-3 num truncate">{slot(a)} · {techName(a.technicianId)}</p>
                    </div>
                    <TypeTag type={a.type} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("overview.followUp")} bodyClass="p-0" actions={<Link className="text-xs text-brand hover:underline" to="/customers?health=overdue">{t("overview.allCustomers")}</Link>}>
          <p className="px-4 pt-3 pb-1 text-2xs text-ink-3">{t("overview.followUpHint")}</p>
          <ul className="divide-y divide-line-subtle" data-testid="follow-up">
            {m.overdue.slice(0, 6).map(([id, s]) => {
              const c = customersById.get(id)!;
              return (
                <li key={id} className="px-4 py-2.5 flex items-center gap-3">
                  <Link to={`/customers/${id}`} className="min-w-0 flex-1 group">
                    <p className="text-[0.8125rem] font-medium truncate group-hover:text-brand">{pick(c.name)}</p>
                    <p className="text-2xs text-bad-fg num">{t("common.overdueBy", { n: -s.daysToNext })}</p>
                  </Link>
                  <Button size="sm" icon="plus" onClick={() => setBookFor(id)}>{t("customer.schedule")}</Button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title={t("overview.teamToday")} bodyClass="p-0" actions={<Link className="text-xs text-brand hover:underline" to="/workforce">{t("overview.viewWorkforce")}</Link>}>
          <ul className="divide-y divide-line-subtle">
            {m.team.map(({ tech, total, done: d, active }) => (
              <li key={tech.id} className="px-4 py-2.5 flex items-center gap-3">
                <Avatar name={tech.name.en} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[0.8125rem] font-medium truncate">{pick(tech.name)}</span>
                    <span className="text-2xs text-ink-3 num whitespace-nowrap">{total ? t("workforce.tasksDone", { done: d, total }) : t("workforce.offToday")}</span>
                  </div>
                  <Progress value={total ? d / total : 0} label={pick(tech.name)} />
                  {active && <p className="text-2xs text-ink-3 mt-1 num flex items-center gap-1.5"><StatusBadge status={active.status} /> {time(active.startMin)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <AppointmentDetail id={openId} onClose={() => setOpenId(null)} />
      <AppointmentDialog open={!!bookFor} presetCustomerId={bookFor ?? undefined} presetDate={addDays(today, 1)} onClose={() => setBookFor(null)} />
    </>
  );
}
