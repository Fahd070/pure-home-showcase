import { useMemo, useState, type DragEvent } from "react";
import { useDemo } from "../data/store";
import { addDays, parseISODate, startOfWeek } from "../domain/dates";
import type { Appointment, ISODate } from "../domain/types";
import { AppointmentDetail } from "../features/AppointmentDetail";
import { AppointmentDialog, useProblemText } from "../features/AppointmentDialog";
import { useFormat } from "../features/useFormat";
import { Icon } from "../ui/Icon";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, STATUS_TONE, Select, StatusBadge, TYPE_COLOR, cx } from "../ui/primitives";
import { useToast } from "../ui/Toast";

const DRAG_MIME = "application/x-showcase-visit";
const movable = (a: Appointment) => a.status === "scheduled" || a.status === "postponed";
const TONE_BORDER: Record<string, string> = {
  info: "border-info-line", warn: "border-warn-line", prog: "border-prog-line", ok: "border-ok-line", mute: "border-mute-line", bad: "border-bad-line",
};

export function Schedule() {
  const { data, today, customersById, move } = useDemo();
  const { t, pick, fmtDate, techName, time, dir } = useFormat();
  const toast = useToast();
  const problemText = useProblemText();
  const [weekStart, setWeekStart] = useState<ISODate>(() => startOfWeek(today));
  const [zone, setZone] = useState("all");
  const [view, setView] = useState<"board" | "agenda">(() => (window.matchMedia?.("(max-width: 900px)").matches ? "agenda" : "board"));
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOn, setNewOn] = useState<ISODate | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = days[6];

  const visible = useMemo(() => data.appointments.filter((a) =>
    a.date >= weekStart && a.date <= weekEnd && a.status !== "cancelled" &&
    (zone === "all" || customersById.get(a.customerId)?.zoneId === zone)), [data.appointments, weekStart, weekEnd, zone, customersById]);

  const techs = data.technicians.filter((x) => zone === "all" || x.zoneId === zone || visible.some((a) => a.technicianId === x.id));
  const rows: { id: string | null; label: string }[] = [{ id: null, label: t("common.unassigned") }, ...techs.map((x) => ({ id: x.id, label: pick(x.name) }))];

  const cell = (techId: string | null, date: ISODate) => visible.filter((a) => a.technicianId === techId && a.date === date);
  const unassignedOpen = data.appointments.filter((a) => !a.technicianId && a.status === "scheduled" && a.date >= today);

  const onDrop = (e: DragEvent, techId: string | null, date: ISODate) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData(DRAG_MIME);
    const appt = data.appointments.find((a) => a.id === id);
    if (!appt || (appt.date === date && appt.technicianId === techId)) return;
    const res = move(id, { date, startMin: appt.startMin, technicianId: techId });
    if (res.ok) toast(t("appt.moved", { slot: `${fmtDate(date, "short")} ${time(appt.startMin)}` }));
    else toast(res.problems.map(problemText).join(" "), "bad");
  };

  const chip = (a: Appointment) => {
    const c = customersById.get(a.customerId)!;
    const canDrag = movable(a) && a.date >= today;
    return (
      <button
        key={a.id}
        type="button"
        draggable={canDrag}
        onDragStart={(e) => { e.dataTransfer.setData(DRAG_MIME, a.id); e.dataTransfer.effectAllowed = "move"; }}
        onClick={() => setOpenId(a.id)}
        data-testid="visit-chip"
        data-visit={a.code}
        className={cx(
          "group w-full text-start rounded border bg-surface px-1.5 py-1 shadow-card hover:border-line-strong transition-colors",
          TONE_BORDER[STATUS_TONE[a.status]],
          canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
          a.status === "completed" && "opacity-70",
        )}
        style={{ borderInlineStartWidth: 3, borderInlineStartColor: TYPE_COLOR[a.type] }}
        title={`${a.code} · ${pick(c.name)} · ${t(`type.${a.type}`)} · ${t(`status.${a.status}`)}`}
      >
        <span className="flex items-center justify-between gap-1">
          <span className="text-2xs font-semibold num text-ink">{time(a.startMin)}</span>
          {a.status !== "scheduled" && <span className="text-[10px] text-ink-3 truncate">{t(`status.${a.status}`)}</span>}
        </span>
        <span className="block text-2xs text-ink-2 truncate">{pick(c.name)}</span>
      </button>
    );
  };

  const isRest = (d: ISODate) => parseISODate(d).getDay() === 5;

  return (
    <>
      <PageHeader title={t("schedule.title")} subtitle={t("schedule.subtitle")}
        actions={<Button variant="primary" icon="plus" onClick={() => setNewOn(addDays(today, 1))} data-testid="new-visit">{t("appt.newTitle")}</Button>} />

      <Card bodyClass="p-0" className="mb-4">
        <div className="flex flex-wrap items-end gap-3 p-3 border-b border-line-subtle">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t("schedule.prevWeek")}>
              <Icon name="chevron" className="w-4 h-4 rotate-180 rtl:rotate-0" />
            </Button>
            <Button size="sm" onClick={() => setWeekStart(startOfWeek(today))}>{t("schedule.thisWeek")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t("schedule.nextWeek")} data-testid="next-week">
              <Icon name="chevron" className="w-4 h-4 rtl:rotate-180" />
            </Button>
            <span className="ms-2 text-[0.8125rem] font-semibold num" data-testid="week-label">{fmtDate(weekStart, "short")} – {fmtDate(weekEnd, "medium")}</span>
          </div>
          <div className="flex-1" />
          <Select label={t("customers.zone")} value={zone} onChange={setZone} className="w-44">
            <option value="all">{t("schedule.allZones")}</option>
            {data.zones.map((z) => <option key={z.id} value={z.id}>{pick(z.name)}</option>)}
          </Select>
          <div className="inline-flex rounded border border-line-strong overflow-hidden h-8" role="group">
            {(["board", "agenda"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
                className={cx("px-3 text-xs font-medium", view === v ? "bg-brand text-brand-fg" : "bg-surface text-ink-2 hover:bg-surface-hover")}>
                {v === "board" ? t("schedule.week") : t("schedule.agenda")}
              </button>
            ))}
          </div>
        </div>

        {view === "board" ? (
          <div className="overflow-x-auto" dir={dir}>
            <table className="w-full min-w-[960px] border-collapse table-fixed" data-testid="dispatch-board">
              <colgroup><col className="w-44" />{days.map((d) => <col key={d} />)}</colgroup>
              <thead>
                <tr className="bg-surface-sunken border-b border-line">
                  <th className="th">{t("appt.technician")}</th>
                  {days.map((d) => (
                    <th key={d} className={cx("th text-center normal-case tracking-normal", d === today && "text-brand")}>
                      <span className="block text-2xs uppercase">{fmtDate(d, "weekday")}</span>
                      <span className={cx("inline-flex items-center justify-center min-w-7 h-6 px-1 rounded-full text-[0.8125rem] num", d === today ? "bg-brand text-brand-fg" : "text-ink")}>
                        {parseISODate(d).getDate()}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id ?? "none"} className="border-b border-line-subtle align-top">
                    <th scope="row" className="px-3 py-2 text-start font-normal">
                      <span className="flex items-center gap-2 min-w-0">
                        {r.id ? <Avatar name={data.technicians.find((x) => x.id === r.id)!.name.en} size="sm" /> :
                          <span className="w-7 h-7 rounded-full bg-warn-bg text-warn-fg inline-flex items-center justify-center"><Icon name="alert" className="w-3.5 h-3.5" /></span>}
                        <span className={cx("text-xs font-medium truncate", !r.id && "text-warn-fg")}>{r.label}</span>
                      </span>
                    </th>
                    {days.map((d) => {
                      const key = `${r.id}|${d}`;
                      const items = cell(r.id, d);
                      const droppable = d >= today && !isRest(d);
                      return (
                        <td key={d}
                          className={cx("p-1 border-s border-line-subtle h-16 transition-colors",
                            isRest(d) && "bg-[repeating-linear-gradient(135deg,var(--surface-sunken),var(--surface-sunken)_6px,var(--surface)_6px,var(--surface)_12px)]",
                            d < today && "bg-surface-sunken",
                            dragOver === key && "bg-brand-soft outline outline-2 -outline-offset-2 outline-brand")}
                          onDragOver={droppable ? (e) => { e.preventDefault(); setDragOver(key); } : undefined}
                          onDragLeave={() => setDragOver((k) => (k === key ? null : k))}
                          onDrop={droppable ? (e) => onDrop(e, r.id, d) : undefined}
                          data-cell={key}>
                          <div className="space-y-1">
                            {items.map((a) => chip(a))}
                            {isRest(d) && items.length === 0 && r.id === null && <span className="block text-center text-[10px] text-ink-3 pt-1">{t("schedule.restDay")}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="divide-y divide-line-subtle" data-testid="agenda">
            {days.map((d) => {
              const items = visible.filter((a) => a.date === d);
              return (
                <section key={d} className="px-4 py-3">
                  <h3 className={cx("text-xs font-semibold mb-2", d === today ? "text-brand" : "text-ink-2")}>{fmtDate(d, "long")}</h3>
                  {items.length === 0 ? <p className="text-xs text-ink-3">{isRest(d) ? t("schedule.restDay") : t("schedule.noVisits")}</p> : (
                    <ul className="space-y-1.5">
                      {items.map((a) => (
                        <li key={a.id}>
                          <button type="button" onClick={() => setOpenId(a.id)} className="w-full text-start flex items-center gap-3 rounded-md border border-line-subtle px-3 py-2 hover:bg-surface-hover"
                            style={{ borderInlineStartWidth: 3, borderInlineStartColor: TYPE_COLOR[a.type] }}>
                            <span className="text-xs font-semibold num w-11">{time(a.startMin)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[0.8125rem] font-medium truncate">{pick(customersById.get(a.customerId)!.name)}</span>
                              <span className="block text-2xs text-ink-3 truncate">{t(`type.${a.type}`)} · {techName(a.technicianId)}</span>
                            </span>
                            <StatusBadge status={a.status} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 border-t border-line-subtle" aria-label={t("schedule.legend")}>
          {(["maintenance", "installation", "inspection"] as const).map((ty) => (
            <span key={ty} className="inline-flex items-center gap-1.5 text-2xs text-ink-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_COLOR[ty] }} />{t(`type.${ty}`)}</span>
          ))}
          <span className="hidden sm:block w-px h-4 bg-line" />
          {(["scheduled", "en_route", "in_progress", "completed", "postponed"] as const).map((s) => <StatusBadge key={s} status={s} />)}
        </div>
      </Card>

      <Card title={t("schedule.unassigned")} bodyClass="p-0" actions={<Badge tone="warn">{unassignedOpen.length}</Badge>}>
        {unassignedOpen.length === 0 ? <EmptyState icon="check">{t("schedule.unassignedEmpty")}</EmptyState> : (
          <ul className="divide-y divide-line-subtle" data-testid="unassigned-list">
            {unassignedOpen.map((a) => (
              <li key={a.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.8125rem] font-medium truncate">{pick(customersById.get(a.customerId)!.name)}</span>
                  <span className="block text-2xs text-ink-3 num">{a.code} · {t(`type.${a.type}`)} · {fmtDate(a.date)} {time(a.startMin)}</span>
                </span>
                <Button size="sm" icon="user" onClick={() => setOpenId(a.id)}>{t("appt.assign")}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AppointmentDetail id={openId} onClose={() => setOpenId(null)} />
      <AppointmentDialog open={!!newOn} presetDate={newOn ?? undefined} onClose={() => setNewOn(null)} />
    </>
  );
}
