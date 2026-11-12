import { addMonths, compareSlot, daysBetween } from "./dates";
import { OPEN_STATUSES, type Appointment, type Customer, type ISODate } from "./types";

/**
 * "Previous service" vs "next service", as the showcase defines them:
 *
 *  - Previous service: the most recent visit that was actually COMPLETED on or
 *    before today. Cancelled or postponed visits never count as service.
 *  - Next service: the earliest OPEN visit (scheduled, en route or in progress)
 *    from today onward. If nothing is booked, the next service is only a
 *    PROJECTION — last completed service (or installation) plus the customer's
 *    maintenance cycle — and the UI labels it as such rather than presenting a
 *    date nobody has committed to.
 */

export type NextService =
  | { kind: "booked"; appointment: Appointment }
  | { kind: "projected"; date: ISODate };

export type ServiceHealth = "booked" | "overdue" | "due_soon" | "on_track";

export const DUE_SOON_DAYS = 30;

export function customerAppointments(customerId: string, appointments: Appointment[]) {
  return appointments.filter((a) => a.customerId === customerId).sort(compareSlot);
}

export function previousService(own: Appointment[], today: ISODate): Appointment | null {
  let best: Appointment | null = null;
  for (const a of own) {
    if (a.status !== "completed" || a.date > today) continue;
    if (!best || compareSlot(a, best) > 0) best = a;
  }
  return best;
}

export function nextService(customer: Customer, own: Appointment[], today: ISODate): NextService {
  let booked: Appointment | null = null;
  for (const a of own) {
    if (!OPEN_STATUSES.includes(a.status) || a.date < today) continue;
    if (!booked || compareSlot(a, booked) < 0) booked = a;
  }
  if (booked) return { kind: "booked", appointment: booked };
  const prev = previousService(own, today);
  const anchor = prev ? prev.date : customer.installedOn;
  return { kind: "projected", date: addMonths(anchor, customer.cycleMonths) };
}

export function serviceHealth(next: NextService, today: ISODate): ServiceHealth {
  if (next.kind === "booked") return "booked";
  const days = daysBetween(today, next.date);
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "due_soon";
  return "on_track";
}

export interface CustomerServiceSummary {
  previous: Appointment | null;
  next: NextService;
  health: ServiceHealth;
  /** Days until (positive) or since (negative) the next service date. */
  daysToNext: number;
  visits: number;
}

function summarizeOwn(customer: Customer, own: Appointment[], today: ISODate): CustomerServiceSummary {
  const next = nextService(customer, own, today);
  const nextDate = next.kind === "booked" ? next.appointment.date : next.date;
  return {
    previous: previousService(own, today),
    next,
    health: serviceHealth(next, today),
    daysToNext: daysBetween(today, nextDate),
    visits: own.filter((a) => a.status === "completed").length,
  };
}

export function summarizeCustomer(customer: Customer, appointments: Appointment[], today: ISODate) {
  return summarizeOwn(customer, customerAppointments(customer.id, appointments), today);
}

/** Summaries for every customer, computed in one pass over the appointments. */
export function summarizeAll(customers: Customer[], appointments: Appointment[], today: ISODate) {
  const byCustomer = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const list = byCustomer.get(a.customerId);
    if (list) list.push(a);
    else byCustomer.set(a.customerId, [a]);
  }
  const out = new Map<string, CustomerServiceSummary>();
  for (const c of customers) out.set(c.id, summarizeOwn(c, (byCustomer.get(c.id) ?? []).sort(compareSlot), today));
  return out;
}
