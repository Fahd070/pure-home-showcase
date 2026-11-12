import { useState } from "react";
import { Link } from "react-router-dom";
import { useDemo } from "../data/store";
import { CHECKLIST_STEPS, VISIT_NOTES } from "../data/catalog";
import type { AppointmentStatus, HistoryEntry } from "../domain/types";
import { Badge, Button, Dialog, StatusBadge, TypeTag } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { AppointmentDialog } from "./AppointmentDialog";
import { NEXT_STATUSES, useFormat } from "./useFormat";
import type { TKey } from "../i18n";

export function AppointmentDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, customersById, setStatus } = useDemo();
  const { t, pick, slot, techName, fmtDate } = useFormat();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const appt = id ? data.appointments.find((a) => a.id === id) : null;
  if (!appt) return null;
  const customer = customersById.get(appt.customerId);
  const steps = CHECKLIST_STEPS[appt.type];
  const canMove = appt.status === "scheduled" || appt.status === "postponed";

  const historyText = (h: HistoryEntry) => {
    const s = (v?: string) => (v ? t(`status.${v as AppointmentStatus}`) : "");
    switch (h.kind) {
      case "created": return t("appt.h_created");
      case "rescheduled": return t("appt.h_rescheduled", { from: h.from ?? "", to: h.to ?? "" });
      case "status": return t("appt.h_status", { from: s(h.from), to: s(h.to) });
      case "assigned": return t("appt.h_assigned", { to: techName(h.to ?? null) });
    }
  };

  const change = (s: AppointmentStatus) => {
    setStatus(appt.id, s);
    toast(t("appt.statusChanged", { status: t(`status.${s}`) }));
  };

  return (
    <>
      <Dialog open={!editing} onClose={onClose} title={`${t("appt.code")} ${appt.code}`} width="max-w-xl"
        footer={<>
          {canMove && <Button icon="calendar" onClick={() => setEditing(true)} data-testid="detail-reschedule">{t("customer.reschedule")}</Button>}
          <Button variant="primary" onClick={onClose}>{t("common.close")}</Button>
        </>}>
        <div className="space-y-4" data-testid="appointment-detail">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={appt.status} />
            <TypeTag type={appt.type} />
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[0.8125rem]">
            <div>
              <dt className="text-2xs text-ink-3 mb-0.5">{t("appt.customer")}</dt>
              <dd>{customer ? <Link to={`/customers/${customer.id}`} onClick={onClose} className="font-medium text-brand hover:underline">{pick(customer.name)}</Link> : "—"}
                {customer && <span className="block text-2xs text-ink-3">{pick(customer.district)} · {customer.code}</span>}</dd>
            </div>
            <div>
              <dt className="text-2xs text-ink-3 mb-0.5">{t("appt.technician")}</dt>
              <dd className={appt.technicianId ? "" : "text-warn-fg font-medium"}>{techName(appt.technicianId)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-2xs text-ink-3 mb-0.5">{t("appt.date")}</dt>
              <dd className="num">{fmtDate(appt.date, "long")} · {slot(appt).split(" · ")[1]}</dd>
            </div>
            {(appt.notes || appt.noteKey !== null) && (
              <div className="sm:col-span-2">
                <dt className="text-2xs text-ink-3 mb-0.5">{t("appt.notes")}</dt>
                <dd className="text-ink-2">{appt.notes || pick(VISIT_NOTES[appt.noteKey!])}</dd>
              </div>
            )}
          </dl>

          <div>
            <h3 className="text-xs font-semibold text-ink-2 mb-1.5">{t("workforce.checklist")}</h3>
            <ol className="space-y-1">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2 text-[0.8125rem]">
                  <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center border ${appt.checklist[i] ? "bg-ok-solid border-ok-solid text-white" : "border-line-strong"}`}>
                    {appt.checklist[i] && <Icon name="check" className="w-3 h-3" />}
                  </span>
                  <span className={appt.checklist[i] ? "text-ink-2" : "text-ink"}>{t(`steps.${s}` as TKey)}</span>
                </li>
              ))}
            </ol>
          </div>

          {NEXT_STATUSES[appt.status].length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-ink-2 mb-1.5">{t("appt.setStatus")}</h3>
              <div className="flex flex-wrap gap-2">
                {NEXT_STATUSES[appt.status].map((s) => (
                  <Button key={s} size="sm" variant={s === "cancelled" ? "ghost" : "secondary"} onClick={() => change(s)} data-testid={`status-${s}`}>
                    {t(`status.${s}`)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-ink-2 mb-1.5">{t("appt.history")}</h3>
            <ul className="space-y-1 text-xs text-ink-2">
              {[...appt.history].reverse().map((h, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <Badge tone="mute" dot={false}><span className="num">{fmtDate(h.at.slice(0, 10), "short")}</span></Badge>
                  <span className="num" dir="auto">{historyText(h)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Dialog>
      <AppointmentDialog open={editing} appointment={appt} onClose={() => setEditing(false)} />
    </>
  );
}
