import { addDays, addMonths, monthKey } from "./dates";
import type { Appointment, Customer, ISODate, ServiceType, Technician } from "./types";

export interface ReportFilters {
  from: ISODate;
  to: ISODate;
  types: ServiceType[];
  zoneId: string | "all";
}

export function filterAppointments(
  appointments: Appointment[],
  customersById: Map<string, Customer>,
  f: ReportFilters,
): Appointment[] {
  return appointments.filter((a) => {
    if (a.date < f.from || a.date > f.to) return false;
    if (f.types.length && !f.types.includes(a.type)) return false;
    if (f.zoneId !== "all" && customersById.get(a.customerId)?.zoneId !== f.zoneId) return false;
    return true;
  });
}

export interface MonthBucket {
  month: string; // YYYY-MM
  maintenance: number;
  installation: number;
  inspection: number;
}

/** Completed visits per month and type, covering every month in the range (zeros included). */
export function monthlyCompleted(list: Appointment[], from: ISODate, to: ISODate): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const index = new Map<string, MonthBucket>();
  for (let d = `${monthKey(from)}-01`; monthKey(d) <= monthKey(to); d = addMonths(d, 1)) {
    const b = { month: monthKey(d), maintenance: 0, installation: 0, inspection: 0 };
    buckets.push(b);
    index.set(b.month, b);
  }
  for (const a of list) {
    if (a.status !== "completed") continue;
    const b = index.get(monthKey(a.date));
    if (b) b[a.type]++;
  }
  return buckets;
}

export interface OutcomeSummary {
  completed: number;
  cancelled: number;
  postponed: number;
  open: number;
  /** Completed ÷ (completed + cancelled + postponed); null when nothing has concluded. */
  completionRate: number | null;
}

export function outcomes(list: Appointment[]): OutcomeSummary {
  const s = { completed: 0, cancelled: 0, postponed: 0, open: 0 };
  for (const a of list) {
    if (a.status === "completed") s.completed++;
    else if (a.status === "cancelled") s.cancelled++;
    else if (a.status === "postponed") s.postponed++;
    else s.open++;
  }
  const concluded = s.completed + s.cancelled + s.postponed;
  return { ...s, completionRate: concluded ? s.completed / concluded : null };
}

export function countByZone(list: Appointment[], customersById: Map<string, Customer>) {
  const out = new Map<string, number>();
  for (const a of list) {
    if (a.status !== "completed") continue;
    const z = customersById.get(a.customerId)?.zoneId;
    if (z) out.set(z, (out.get(z) ?? 0) + 1);
  }
  return out;
}

export interface TechnicianStats {
  technician: Technician;
  completed: number;
  hours: number;
  cancelled: number;
}

export function technicianStats(list: Appointment[], technicians: Technician[]): TechnicianStats[] {
  return technicians
    .map((t) => {
      const own = list.filter((a) => a.technicianId === t.id);
      const done = own.filter((a) => a.status === "completed");
      return {
        technician: t,
        completed: done.length,
        hours: Math.round(done.reduce((s, a) => s + a.durationMin, 0) / 6) / 10,
        cancelled: own.filter((a) => a.status === "cancelled").length,
      };
    })
    .sort((a, b) => b.completed - a.completed);
}

/** Completed visits per day for the trailing `days` days ending `today` (inclusive). */
export function dailyCompleted(appointments: Appointment[], today: ISODate, days: number) {
  const out: { date: ISODate; count: number }[] = [];
  const counts = new Map<string, number>();
  for (const a of appointments) if (a.status === "completed") counts.set(a.date, (counts.get(a.date) ?? 0) + 1);
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    out.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return out;
}
