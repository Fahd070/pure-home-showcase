import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDemo } from "../data/store";
import { CUSTOMER_NOTES } from "../data/catalog";
import { addDays } from "../domain/dates";
import { customerAppointments, summarizeCustomer } from "../domain/service";
import { AppointmentDetail } from "../features/AppointmentDetail";
import { AppointmentDialog } from "../features/AppointmentDialog";
import { useFormat } from "../features/useFormat";
import { Icon } from "../ui/Icon";
import { Avatar, Badge, Button, Card, EmptyState, HealthBadge, StatusBadge, TypeTag, cx } from "../ui/primitives";

export function CustomerProfile() {
  const { id = "" } = useParams();
  const { data, today, customersById } = useDemo();
  const { t, pick, fmtDate, relDistance, slot, techName, fmtNumber } = useFormat();
  const [openId, setOpenId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [explain, setExplain] = useState(false);

  const customer = customersById.get(id);
  const view = useMemo(() => {
    if (!customer) return null;
    return {
      summary: summarizeCustomer(customer, data.appointments, today),
      history: customerAppointments(customer.id, data.appointments).reverse(),
    };
  }, [customer, data.appointments, today]);

  if (!customer || !view) {
    return (
      <Card>
        <EmptyState icon="customers">
          <p>{t("customer.notFound")}</p>
          <Link to="/customers" className="text-brand hover:underline mt-2 inline-block">{t("customer.back")}</Link>
        </EmptyState>
      </Card>
    );
  }

  const { summary: s, history } = view;
  const zone = data.zones.find((z) => z.id === customer.zoneId)!;
  const system = data.systems.find((x) => x.id === customer.systemId)!;
  const nextAppt = s.next.kind === "booked" ? s.next.appointment : null;
  const nextDate = nextAppt ? nextAppt.date : (s.next as { date: string }).date;

  return (
    <>
      <nav className="mb-3 text-xs" aria-label="breadcrumb">
        <Link to="/customers" className="inline-flex items-center gap-1 text-ink-3 hover:text-brand">
          <Icon name="chevron" className="w-3.5 h-3.5 rotate-180 rtl:rotate-0" />{t("customer.back")}
        </Link>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={customer.name.en} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate" data-testid="customer-title">{pick(customer.name)}</h1>
            <p className="text-xs text-ink-3 num flex flex-wrap items-center gap-x-2">
              <span>{customer.code}</span><span>·</span><span>{t(`segment.${customer.segment}`)}</span><span>·</span>
              <span>{t("customer.since", { date: fmtDate(customer.createdOn) })}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge health={s.health} />
          <Button variant="primary" icon="plus" onClick={() => setBooking(true)} data-testid="profile-book">{t("customer.schedule")}</Button>
        </div>
      </div>

      {/* Previous vs Next service */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" data-testid="service-compare">
        <section className="card p-4" aria-labelledby="prev-h">
          <div className="flex items-center justify-between mb-3">
            <h2 id="prev-h" className="text-xs font-semibold uppercase tracking-wide text-ink-3">{t("customer.previousService")}</h2>
            <span className="text-2xs text-ink-3">{t("customer.previousHint")}</span>
          </div>
          {s.previous ? (
            <>
              <p className="text-2xl font-semibold num" data-testid="previous-date">{fmtDate(s.previous.date, "medium")}</p>
              <p className="text-xs text-ink-3 num mt-0.5">{relDistance(s.previous.date)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
                <TypeTag type={s.previous.type} />
                <span className="inline-flex items-center gap-1"><Icon name="user" className="w-3.5 h-3.5" />{t("customer.by", { name: techName(s.previous.technicianId) })}</span>
                <button type="button" onClick={() => setOpenId(s.previous!.id)} className="text-brand hover:underline num">{s.previous.code}</button>
              </div>
            </>
          ) : (
            <p className="text-[0.8125rem] text-ink-3">{t("customer.noPrevious")}</p>
          )}
        </section>

        <section className={cx("card p-4 border-s-4", s.health === "overdue" ? "border-s-bad-solid" : nextAppt ? "border-s-brand" : "border-s-warn-solid")} aria-labelledby="next-h">
          <div className="flex items-center justify-between mb-3">
            <h2 id="next-h" className="text-xs font-semibold uppercase tracking-wide text-ink-3">{t("customer.nextService")}</h2>
            {nextAppt ? <Badge tone="brand">{t("health.booked")}</Badge> : <Badge tone="warn">{t("customers.projected")}</Badge>}
          </div>
          <p className="text-2xl font-semibold num" data-testid="next-date">{fmtDate(nextDate, "medium")}</p>
          <p className={cx("text-xs num mt-0.5", s.health === "overdue" ? "text-bad-fg font-medium" : "text-ink-3")}>
            {s.health === "overdue" ? t("common.overdueBy", { n: -s.daysToNext }) : relDistance(nextDate)}
          </p>
          <p className="text-2xs text-ink-3 mt-1">{nextAppt ? t("customer.nextBookedHint") : t("customer.nextProjectedHint", { n: customer.cycleMonths })}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {nextAppt ? (
              <>
                <span className="text-xs text-ink-2 num">{slot(nextAppt)} · {techName(nextAppt.technicianId)}</span>
                {nextAppt.status === "scheduled" && <Button size="sm" icon="calendar" onClick={() => setMoving(nextAppt.id)}>{t("customer.reschedule")}</Button>}
              </>
            ) : (
              <Button size="sm" variant="primary" icon="plus" onClick={() => setBooking(true)} data-testid="book-next">{t("customer.schedule")}</Button>
            )}
          </div>
        </section>
      </div>

      <div className="mb-4">
        <button type="button" onClick={() => setExplain((x) => !x)} aria-expanded={explain} className="text-xs text-brand inline-flex items-center gap-1 hover:underline">
          <Icon name="info" className="w-3.5 h-3.5" />{t("customer.explainTitle")}
        </button>
        {explain && <p className="mt-2 text-xs text-ink-2 max-w-3xl leading-relaxed bg-brand-soft border border-brand-line rounded-md px-3 py-2">{t("customer.explainBody")}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title={t("customers.colCustomer")}>
          <dl className="space-y-3 text-[0.8125rem]">
            <div className="flex justify-between gap-3"><dt className="text-ink-3">{t("customer.zone")}</dt><dd className="text-end">{pick(zone.name)}<span className="block text-2xs text-ink-3">{pick(customer.district)}</span></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-3">{t("customer.phone")}</dt><dd className="num" dir="ltr">{customer.phone}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-3">{t("customer.system")}</dt><dd className="text-end">{pick(system.name)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-3">{t("customer.cycle")}</dt><dd>{t("customer.cycleValue", { n: customer.cycleMonths })}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-3">{t("customer.installed")}</dt><dd className="num">{fmtDate(customer.installedOn)}</dd></div>
            {(customer.notes || customer.noteKey !== null) && (
              <div className="pt-3 border-t border-line-subtle"><dt className="text-ink-3 mb-1">{t("common.notes")}</dt><dd className="text-ink-2">{customer.notes || pick(CUSTOMER_NOTES[customer.noteKey!])}</dd></div>
            )}
          </dl>
        </Card>

        <Card title={t("customer.history")} className="lg:col-span-2" bodyClass="p-0" actions={<span className="text-2xs text-ink-3 num">{t("customer.visits", { n: fmtNumber(s.visits) })}</span>}>
          {history.length === 0 ? <EmptyState>{t("customer.historyEmpty")}</EmptyState> : (
            <ol className="relative py-2" data-testid="service-history">
              {history.map((a) => (
                <li key={a.id} className="relative ps-10 pe-4 py-2 hover:bg-surface-hover">
                  <span className="absolute start-[19px] top-0 bottom-0 w-px bg-line" aria-hidden="true" />
                  <span className={cx("absolute start-[14px] top-4 w-[11px] h-[11px] rounded-full border-2 border-surface",
                    a.status === "completed" ? "bg-ok-solid" : a.status === "cancelled" ? "bg-bad-solid" : a.status === "postponed" ? "bg-mute-solid" : "bg-info-solid")} aria-hidden="true" />
                  <button type="button" onClick={() => setOpenId(a.id)} className="w-full text-start flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[0.8125rem] font-medium num min-w-[7.5rem]">{fmtDate(a.date)}</span>
                    <TypeTag type={a.type} />
                    <StatusBadge status={a.status} />
                    <span className="text-2xs text-ink-3 num ms-auto">{a.code} · {techName(a.technicianId)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <AppointmentDetail id={openId} onClose={() => setOpenId(null)} />
      <AppointmentDialog open={booking} presetCustomerId={customer.id} presetDate={s.health === "overdue" || nextDate <= today ? addDays(today, 1) : nextDate} onClose={() => setBooking(false)} />
      <AppointmentDialog open={!!moving} appointment={data.appointments.find((a) => a.id === moving) ?? null} onClose={() => setMoving(null)} />
    </>
  );
}
