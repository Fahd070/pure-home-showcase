import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDemo } from "../data/store";
import { CHECKLIST_STEPS } from "../data/catalog";
import { addDays, startOfWeek } from "../domain/dates";
import type { Appointment, Technician } from "../domain/types";
import { AppointmentDetail } from "../features/AppointmentDetail";
import { useFormat } from "../features/useFormat";
import type { TKey } from "../i18n";
import { Icon } from "../ui/Icon";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, Progress, StatusBadge, TypeTag, cx, type Tone } from "../ui/primitives";
import { useToast } from "../ui/Toast";

type Presence = "onSite" | "enRoute" | "available" | "offToday";
const PRESENCE_TONE: Record<Presence, Tone> = { onSite: "prog", enRoute: "warn", available: "ok", offToday: "mute" };

export function Workforce() {
  const { data, today, customersById, setStatus, toggleStep } = useDemo();
  const { t, pick, fmtNumber, time } = useFormat();
  const toast = useToast();
  const [selected, setSelected] = useState<string>(data.technicians[0].id);
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    return new Map(data.technicians.map((tech) => {
      const todays = data.appointments.filter((a) => a.technicianId === tech.id && a.date === today && a.status !== "cancelled").sort((a, b) => a.startMin - b.startMin);
      const week = data.appointments.filter((a) => a.technicianId === tech.id && a.date >= weekStart && a.date <= weekEnd && a.status !== "cancelled" && a.status !== "postponed");
      const presence: Presence = todays.some((a) => a.status === "in_progress") ? "onSite"
        : todays.some((a) => a.status === "en_route") ? "enRoute"
          : todays.length ? "available" : "offToday";
      return [tech.id, {
        todays,
        done: todays.filter((a) => a.status === "completed").length,
        weekHours: week.reduce((s, a) => s + a.durationMin, 0) / 60,
        presence,
      }];
    }));
  }, [data, today]);

  const tech = data.technicians.find((x) => x.id === selected)!;
  const st = stats.get(selected)!;

  const act = (a: Appointment, next: Appointment["status"]) => {
    setStatus(a.id, next);
    toast(t("appt.statusChanged", { status: t(`status.${next}`) }));
  };

  return (
    <>
      <PageHeader title={t("workforce.title")} subtitle={t("workforce.subtitle")} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 content-start" data-testid="tech-list">
          {data.technicians.map((x) => {
            const s = stats.get(x.id)!;
            return (
              <li key={x.id}>
                <button type="button" onClick={() => setSelected(x.id)} aria-pressed={selected === x.id}
                  className={cx("card w-full text-start p-3.5 transition-colors hover:border-line-strong", selected === x.id && "!border-brand ring-1 ring-brand")}>
                  <div className="flex items-start gap-3">
                    <Avatar name={x.name.en} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.8125rem] font-semibold truncate">{pick(x.name)}</span>
                        <Badge tone={PRESENCE_TONE[s.presence]}>{t(`workforce.${s.presence}` as TKey)}</Badge>
                      </div>
                      <p className="text-2xs text-ink-3 truncate">{pick(data.zones.find((z) => z.id === x.zoneId)!.name)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-2xs text-ink-3 mb-1 num">
                      <span>{t("workforce.load")}</span>
                      <span>{s.todays.length ? t("workforce.tasksDone", { done: s.done, total: s.todays.length }) : "—"}</span>
                    </div>
                    <Progress value={s.todays.length ? s.done / s.todays.length : 0} tone={s.todays.length && s.done === s.todays.length ? "ok" : "brand"} label={pick(x.name)} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-2xs text-ink-3">
                    <span><span className="block text-[0.8125rem] font-semibold text-ink num">{fmtNumber(s.weekHours, { maximumFractionDigits: 1 })}</span>{t("workforce.utilisation")}</span>
                    <span><span className="block text-[0.8125rem] font-semibold text-ink num inline-flex items-center gap-0.5">{fmtNumber(x.rating, { minimumFractionDigits: 1 })}<Icon name="star" className="w-3 h-3 text-warn-solid" /></span>{t("workforce.rating")}</span>
                    <span><span className="block text-[0.8125rem] font-semibold text-ink num">{fmtNumber(x.onTimeRate, { style: "percent" })}</span>{t("workforce.onTime")}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="space-y-4 min-w-0">
          <TechHeader tech={tech} presence={st.presence} />
          <Card title={t("workforce.queue")} bodyClass="p-0" actions={<span className="text-2xs text-ink-3 num">{t("workforce.tasksDone", { done: st.done, total: st.todays.length })}</span>}>
            {st.todays.length === 0 ? <EmptyState icon="route">{t("workforce.offToday")}</EmptyState> : (
              <ol className="divide-y divide-line-subtle" data-testid="tech-route">
                {st.todays.map((a, idx) => {
                  const c = customersById.get(a.customerId)!;
                  const steps = CHECKLIST_STEPS[a.type];
                  const done = a.checklist.filter(Boolean).length;
                  const canTick = a.status === "in_progress";
                  return (
                    <li key={a.id} className="p-4" data-testid="route-task">
                      <div className="flex flex-wrap items-start gap-3">
                        <span className={cx("w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-semibold num flex-shrink-0",
                          a.status === "completed" ? "bg-ok-solid text-white" : "bg-surface-active text-ink-2")}>
                          {a.status === "completed" ? <Icon name="check" className="w-3.5 h-3.5" /> : idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[0.8125rem] font-semibold num">{time(a.startMin)}–{time(a.startMin + a.durationMin)}</span>
                            <TypeTag type={a.type} />
                            <StatusBadge status={a.status} />
                          </div>
                          <Link to={`/customers/${c.id}`} className="text-[0.8125rem] text-ink hover:text-brand">{pick(c.name)}</Link>
                          <p className="text-2xs text-ink-3 inline-flex items-center gap-1 ms-2"><Icon name="pin" className="w-3 h-3" />{pick(c.district)}</p>
                        </div>
                        <div className="flex gap-2">
                          {a.status === "scheduled" && <Button size="sm" icon="route" onClick={() => act(a, "en_route")}>{t("workforce.startTravel")}</Button>}
                          {a.status === "en_route" && <Button size="sm" variant="primary" icon="pin" onClick={() => act(a, "in_progress")} data-testid="arrive">{t("workforce.arrive")}</Button>}
                          <Button size="sm" variant="ghost" onClick={() => setOpenId(a.id)}>{t("common.view")}</Button>
                        </div>
                      </div>
                      <div className="mt-3 ms-10">
                        <div className="flex items-center justify-between text-2xs text-ink-3 mb-1 num">
                          <span>{t("workforce.checklist")}</span><span>{done}/{steps.length}</span>
                        </div>
                        <Progress value={done / steps.length} tone={done === steps.length ? "ok" : "brand"} label={`${a.code} ${t("workforce.progress")}`} />
                        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {steps.map((s, i) => (
                            <li key={s}>
                              <label className={cx("flex items-center gap-2 text-xs rounded px-1.5 py-1", canTick ? "cursor-pointer hover:bg-surface-hover" : "opacity-70")}>
                                <input type="checkbox" className="accent-[var(--brand)] w-3.5 h-3.5" checked={a.checklist[i]} disabled={!canTick}
                                  onChange={() => toggleStep(a.id, i)} data-testid="step" />
                                <span className={a.checklist[i] ? "line-through text-ink-3" : "text-ink-2"}>{t(`steps.${s}` as TKey)}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
      <AppointmentDetail id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function TechHeader({ tech, presence }: { tech: Technician; presence: Presence }) {
  const { data } = useDemo();
  const { t, pick } = useFormat();
  return (
    <div className="card p-4 flex flex-wrap items-center gap-4" data-testid="tech-header">
      <Avatar name={tech.name.en} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{pick(tech.name)}</h2>
          <Badge tone={PRESENCE_TONE[presence]}>{t(`workforce.${presence}` as TKey)}</Badge>
        </div>
        <p className="text-xs text-ink-3">{pick(data.zones.find((z) => z.id === tech.zoneId)!.name)} · {t("workforce.since", { year: tech.joinedYear })}</p>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label={t("workforce.skills")}>
        {tech.skills.map((s) => <TypeTag key={s} type={s} />)}
      </div>
    </div>
  );
}
