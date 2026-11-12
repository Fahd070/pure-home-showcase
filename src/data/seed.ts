import {
  BUSINESS_NAMES, CHECKLIST_STEPS, CUSTOMER_NOTES, DISTRICTS, FAMILY_NAMES, GIVEN_NAMES,
  SERVICE_DURATION, SYSTEMS, TECHNICIAN_ROSTER, VISIT_NOTES, ZONES,
} from "./catalog";
import { addDays, addMonths, parseISODate, toISODate } from "../domain/dates";
import type {
  Appointment, AppointmentStatus, Customer, DemoData, ISODate, ServiceType, Technician,
} from "../domain/types";

export const DATA_VERSION = 4;
export const DEFAULT_SEED = 20261112;

/** Small, fast, deterministic PRNG (mulberry32). */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
    /** Seeded Fisher–Yates shuffle (returns a new array). */
    shuffle: <T,>(arr: readonly T[]): T[] => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}
type Rng = ReturnType<typeof createRng>;

const isFriday = (d: ISODate) => parseISODate(d).getDay() === 5;
/** Moves a date off the weekly rest day so visits land on working days. */
const workday = (d: ISODate) => (isFriday(d) ? addDays(d, 1) : d);

function maskedPhone(rng: Rng): string {
  // Only the last four digits are ever shown, and they are random.
  return `+966 5• ••• ${String(rng.int(0, 9999)).padStart(4, "0")}`;
}

/**
 * Builds the complete demo dataset relative to `today`, so the calendar,
 * dashboard and "next service" views always look current. The same seed and
 * date always produce identical data, which keeps tests and screenshots stable.
 */
export function generateDemoData(today: ISODate, seed = DEFAULT_SEED): DemoData {
  const rng = createRng(seed);

  const technicians: Technician[] = TECHNICIAN_ROSTER.map((t, i) => ({
    id: `t-${i + 1}`,
    ...t,
    rating: Math.round((4.2 + rng.next() * 0.75) * 10) / 10,
    onTimeRate: Math.round((0.86 + rng.next() * 0.12) * 100) / 100,
  }));

  // Per-technician, per-day occupied minutes — keeps generated visits free of overlaps.
  const busy = new Map<string, [number, number][]>();
  const fits = (techId: string, date: ISODate, start: number, dur: number) =>
    !(busy.get(`${techId}|${date}`) ?? []).some(([s, e]) => start < e && s < start + dur);
  const occupy = (techId: string, date: ISODate, start: number, dur: number) => {
    const k = `${techId}|${date}`;
    busy.set(k, [...(busy.get(k) ?? []), [start, start + dur]]);
  };

  const SLOTS = [8 * 60, 9 * 60 + 30, 11 * 60, 12 * 60 + 30, 14 * 60, 15 * 60 + 30, 16 * 60 + 30];

  function placeVisit(date: ISODate, type: ServiceType, zoneId: string) {
    const dur = SERVICE_DURATION[type];
    const local = technicians.filter((t) => t.zoneId === zoneId && t.skills.includes(type));
    const pool = [...local, ...technicians.filter((t) => !local.includes(t) && t.skills.includes(type))];
    for (let attempt = 0; attempt < 3; attempt++) {
      const d = addDays(date, attempt);
      if (isFriday(d)) continue;
      const order = rng.shuffle(SLOTS);
      for (const tech of pool) {
        for (const start of order) {
          if (start + dur <= 18 * 60 && fits(tech.id, d, start, dur)) {
            occupy(tech.id, d, start, dur);
            return { date: d, startMin: start, technicianId: tech.id, durationMin: dur };
          }
        }
      }
    }
    return null;
  }

  const customers: Customer[] = [];
  const appointments: Appointment[] = [];
  let apptSeq = 4100;

  function pushAppt(
    customer: Customer, type: ServiceType, status: AppointmentStatus,
    slot: { date: ISODate; startMin: number; technicianId: string | null; durationMin: number },
  ) {
    const steps = CHECKLIST_STEPS[type].length;
    const done = status === "completed" ? steps : status === "in_progress" ? rng.int(1, steps - 1) : status === "en_route" ? 0 : 0;
    const created = `${addDays(slot.date, -rng.int(3, 20))}T09:00:00.000Z`;
    appointments.push({
      id: `a-${apptSeq}`,
      code: `SV-${apptSeq}`,
      customerId: customer.id,
      technicianId: slot.technicianId,
      type,
      status,
      date: slot.date,
      startMin: slot.startMin,
      durationMin: slot.durationMin,
      notes: "",
      noteKey: rng.chance(0.3) ? rng.int(0, VISIT_NOTES.length - 1) : null,
      checklist: Array.from({ length: steps }, (_, i) => i < done),
      history: [{ at: created, kind: "created" }],
    });
    apptSeq += rng.int(1, 3);
  }

  const CUSTOMER_COUNT = 2400;
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const zone = rng.pick(ZONES);
    const commercial = rng.chance(0.12);
    const name = commercial
      ? rng.pick(BUSINESS_NAMES)
      : (() => {
          const g = rng.pick(GIVEN_NAMES);
          const f = rng.pick(FAMILY_NAMES);
          return { en: `${g.en} ${f.en}`, ar: `${g.ar} ${f.ar}` };
        })();
    // Skew installs toward recent months so the growth trend reads naturally.
    const monthsAgo = Math.floor(Math.pow(rng.next(), 1.6) * 30) + 1;
    const installedOn = workday(addDays(addMonths(today, -monthsAgo), rng.int(-12, 12)));
    const cycleMonths = commercial ? rng.pick([3, 3, 6]) : rng.pick([3, 4, 6, 6, 12]);
    const customer: Customer = {
      id: `c-${i + 1}`,
      code: `PH-${10400 + i * 3}`,
      name,
      phone: maskedPhone(rng),
      zoneId: zone.id,
      district: rng.pick(DISTRICTS[zone.id]),
      systemId: rng.pick(SYSTEMS).id,
      cycleMonths,
      installedOn,
      createdOn: addDays(installedOn, -rng.int(2, 14)),
      notes: "",
      noteKey: rng.chance(0.25) ? rng.int(0, CUSTOMER_NOTES.length - 1) : null,
      segment: commercial ? "commercial" : "residential",
    };
    customers.push(customer);

    // Installation visit.
    const install = placeVisit(installedOn, "installation", zone.id);
    if (install && install.date < today) pushAppt(customer, "installation", "completed", install);

    // Maintenance history, one visit per cycle until today.
    let due = addMonths(installedOn, cycleMonths);
    // Some customers drift: they are overdue and have nothing booked (a realistic follow-up queue).
    const lapsed = rng.chance(0.14);
    while (due < today) {
      const target = workday(addDays(due, rng.int(-4, 9)));
      if (target >= today) break;
      const slot = placeVisit(target, "maintenance", zone.id);
      if (slot && slot.date < today) {
        const roll = rng.next();
        if (roll < 0.06) {
          pushAppt(customer, "maintenance", "cancelled", slot);
        } else if (roll < 0.11) {
          pushAppt(customer, "maintenance", "postponed", slot);
          const retry = placeVisit(addDays(slot.date, rng.int(3, 8)), "maintenance", zone.id);
          if (retry && retry.date < today) pushAppt(customer, "maintenance", "completed", retry);
        } else {
          pushAppt(customer, "maintenance", "completed", slot);
        }
      }
      if (rng.chance(0.07)) {
        const insp = placeVisit(addDays(due, rng.int(20, 50)), "inspection", zone.id);
        if (insp && insp.date < today) pushAppt(customer, "inspection", "completed", insp);
      }
      due = addMonths(due, cycleMonths);
    }

    // Book the upcoming visit for most customers whose next cycle falls within ~5 weeks.
    const daysToDue = (parseISODate(due).getTime() - parseISODate(today).getTime()) / 86_400_000;
    if (!lapsed && daysToDue <= 35) {
      const slot = placeVisit(workday(due < today ? addDays(today, rng.int(1, 6)) : due), "maintenance", zone.id);
      if (slot && slot.date > today) pushAppt(customer, "maintenance", "scheduled", slot);
    }
  }

  // A busy "today" for the field team, with a realistic spread of progress.
  if (!isFriday(today)) {
    const shuffled = rng.shuffle(customers);
    let placed = 0;
    for (const c of shuffled) {
      if (placed >= 26) break;
      const type: ServiceType = rng.chance(0.75) ? "maintenance" : rng.chance(0.5) ? "installation" : "inspection";
      const slot = placeVisit(today, type, c.zoneId);
      if (!slot || slot.date !== today) continue;
      const end = slot.startMin + slot.durationMin;
      const status: AppointmentStatus =
        end <= 11 * 60 ? "completed"
          : slot.startMin <= 11 * 60 ? "in_progress"
            : slot.startMin <= 12 * 60 + 30 ? (rng.chance(0.6) ? "en_route" : "scheduled")
              : "scheduled";
      pushAppt(c, type, status, slot);
      placed++;
    }
  }

  // A few unassigned requests waiting for dispatch.
  for (let i = 0; i < 4; i++) {
    const c = rng.pick(customers);
    const type: ServiceType = rng.chance(0.5) ? "inspection" : "installation";
    const date = workday(addDays(today, rng.int(1, 6)));
    pushAppt(c, type, "scheduled", {
      date, startMin: rng.pick([9 * 60, 11 * 60, 14 * 60]), technicianId: null, durationMin: SERVICE_DURATION[type],
    });
  }

  appointments.sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1));

  return {
    version: DATA_VERSION,
    generatedFor: today,
    zones: ZONES,
    systems: SYSTEMS,
    technicians,
    customers,
    appointments,
  };
}

/** Cheap identity check that a regenerated dataset matches the one a saved operation log was recorded against. */
export function fingerprint(d: DemoData): string {
  let h = 0;
  for (const a of d.appointments) for (let i = 0; i < a.id.length; i++) h = (Math.imul(h, 31) + a.id.charCodeAt(i) + a.startMin) | 0;
  return `${d.customers.length}.${d.appointments.length}.${(h >>> 0).toString(36)}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}
