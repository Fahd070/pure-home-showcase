import { useMemo, useState } from "react";
import { useDemo } from "../data/store";
import { SERVICE_DURATION } from "../data/catalog";
import { formatTime, parseTime } from "../domain/dates";
import type { SlotProblem } from "../domain/schedule";
import type { Appointment, ISODate, ServiceType } from "../domain/types";
import { Button, Dialog } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { useFormat } from "./useFormat";

const TIMES = Array.from({ length: 20 }, (_, i) => 8 * 60 + i * 30); // 08:00 – 17:30

export function useProblemText() {
  const { t, techName, time } = useFormat();
  return (p: SlotProblem) =>
    p.kind === "conflict"
      ? t("appt.problem_conflict", { tech: techName(p.with.technicianId), code: p.with.code, time: time(p.with.startMin) })
      : t(`appt.problem_${p.kind}`);
}

/**
 * Book a new visit, or reschedule an existing one (date, time, technician).
 * Validation runs against the local dataset: working hours, rest day, past
 * dates and overlapping visits for the same technician.
 */
export function AppointmentDialog({
  open, onClose, appointment, presetCustomerId, presetDate, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  presetCustomerId?: string;
  presetDate?: ISODate;
  onSaved?: (id: string) => void;
}) {
  if (!open) return null;
  return <Inner onClose={onClose} appointment={appointment ?? null} presetCustomerId={presetCustomerId} presetDate={presetDate} onSaved={onSaved} />;
}

function Inner({ onClose, appointment, presetCustomerId, presetDate, onSaved }: {
  onClose: () => void; appointment: Appointment | null; presetCustomerId?: string; presetDate?: ISODate; onSaved?: (id: string) => void;
}) {
  const { data, today, book, move, customersById } = useDemo();
  const { t, pick, fmtNumber } = useFormat();
  const toast = useToast();
  const problemText = useProblemText();
  const editing = !!appointment;

  const [customerId, setCustomerId] = useState(appointment?.customerId ?? presetCustomerId ?? "");
  const [type, setType] = useState<ServiceType>(appointment?.type ?? "maintenance");
  const [techId, setTechId] = useState<string>(() => {
    if (appointment) return appointment.technicianId ?? "";
    const c = customersById.get(presetCustomerId ?? "");
    return c ? data.technicians.find((x) => x.zoneId === c.zoneId)?.id ?? "" : "";
  });
  const [date, setDate] = useState<ISODate>(appointment && appointment.date >= today ? appointment.date : presetDate ?? today);
  const [start, setStart] = useState<number>(appointment?.startMin ?? 9 * 60);
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [problems, setProblems] = useState<SlotProblem[]>([]);
  const [touched, setTouched] = useState(false);

  const customers = useMemo(
    () => [...data.customers].sort((a, b) => pick(a.name).localeCompare(pick(b.name))),
    [data.customers, pick],
  );
  const qualified = data.technicians.filter((x) => x.skills.includes(type));
  const customer = customersById.get(customerId);
  const duration = appointment?.durationMin ?? SERVICE_DURATION[type];

  const submit = () => {
    setTouched(true);
    if (!customerId) return;
    const technicianId = techId || null;
    const res = editing
      ? move(appointment!.id, { date, startMin: start, technicianId })
      : book({ customerId, technicianId, type, date, startMin: start, notes });
    if (!res.ok) {
      setProblems(res.problems);
      return;
    }
    toast(editing ? t("appt.moved", { slot: `${date} ${formatTime(start)}` }) : t("appt.booked"));
    onSaved?.(res.id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={editing ? `${t("appt.editTitle")} · ${appointment!.code}` : t("appt.newTitle")}
      footer={<>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="primary" icon="check" onClick={submit} data-testid="appt-submit">{editing ? t("appt.saveChanges") : t("appt.book")}</Button>
      </>}>
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <label className="sm:col-span-2">
          <span className="label">{t("appt.customer")}</span>
          {editing || presetCustomerId ? (
            <div className="field flex items-center bg-surface-sunken">{customer ? `${pick(customer.name)} · ${customer.code}` : "—"}</div>
          ) : (
            <select className="field" value={customerId} onChange={(e) => {
              setCustomerId(e.target.value);
              const c = customersById.get(e.target.value);
              if (c && !techId) setTechId(data.technicians.find((x) => x.zoneId === c.zoneId && x.skills.includes(type))?.id ?? "");
            }} aria-invalid={touched && !customerId} data-testid="appt-customer">
              <option value="">{t("appt.pickCustomer")}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{pick(c.name)} · {c.code}</option>)}
            </select>
          )}
          {touched && !customerId && <span className="text-2xs text-bad-fg mt-1 block">{t("common.required")}</span>}
        </label>

        <label>
          <span className="label">{t("appt.type")}</span>
          <select className="field" value={type} disabled={editing} onChange={(e) => {
            const nt = e.target.value as ServiceType;
            setType(nt);
            if (techId && !data.technicians.find((x) => x.id === techId)?.skills.includes(nt)) setTechId("");
          }}>
            {(["maintenance", "installation", "inspection"] as const).map((x) => <option key={x} value={x}>{t(`type.${x}`)}</option>)}
          </select>
        </label>

        <label>
          <span className="label">{t("appt.technician")}</span>
          <select className="field" value={techId} onChange={(e) => { setTechId(e.target.value); setProblems([]); }} data-testid="appt-tech">
            <option value="">{t("common.unassigned")}</option>
            {qualified.map((x) => <option key={x.id} value={x.id}>{pick(x.name)}</option>)}
          </select>
        </label>

        <label>
          <span className="label">{t("appt.date")}</span>
          <input type="date" className="field" value={date} min={today} onChange={(e) => { setDate(e.target.value); setProblems([]); }} data-testid="appt-date" />
        </label>

        <label>
          <span className="label">{t("appt.time")}</span>
          <select className="field" value={formatTime(start)} onChange={(e) => { setStart(parseTime(e.target.value)); setProblems([]); }} data-testid="appt-time">
            {TIMES.map((m) => <option key={m} value={formatTime(m)}>{formatTime(m)}</option>)}
          </select>
        </label>

        <p className="sm:col-span-2 text-2xs text-ink-3 -mt-1 inline-flex items-center gap-1">
          <Icon name="clock" className="w-3.5 h-3.5" />
          {t("appt.duration")}: {t("common.min", { n: fmtNumber(duration) })} · {formatTime(start)}–{formatTime(start + duration)}
        </p>

        {!editing && (
          <label className="sm:col-span-2">
            <span className="label">{t("appt.notes")}</span>
            <textarea className="field" rows={2} value={notes} maxLength={240} onChange={(e) => setNotes(e.target.value)} />
          </label>
        )}

        {problems.length > 0 && (
          <div className="sm:col-span-2 rounded-md border border-bad-line bg-bad-bg text-bad-fg px-3 py-2 text-xs space-y-1" role="alert" data-testid="appt-problems">
            {problems.map((p, i) => (
              <p key={i} className="flex items-start gap-1.5"><Icon name="alert" className="w-3.5 h-3.5 mt-0.5" />{problemText(p)}</p>
            ))}
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  );
}
