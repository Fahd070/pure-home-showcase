import { CHECKLIST_STEPS, DISTRICTS, SERVICE_DURATION } from "./catalog";
import { slotLabel } from "../domain/schedule";
import type { Appointment, AppointmentStatus, Customer, DemoData, HistoryEntry, ISODate, ServiceType } from "../domain/types";

/**
 * Every change a visitor makes is recorded as a small operation. The browser
 * stores only this log (not the multi-megabyte dataset); on load the seeded
 * dataset is regenerated and the log is replayed on top of it. `applyOp` is
 * pure, so replay is deterministic and unit-testable.
 */

export interface NewCustomerInput {
  name: string;
  phoneLast4: string;
  zoneId: string;
  districtIndex: number;
  systemId: string;
  cycleMonths: number;
  installedOn: ISODate;
  segment: Customer["segment"];
  notes: string;
}

export interface BookingInput {
  customerId: string;
  technicianId: string | null;
  type: ServiceType;
  date: ISODate;
  startMin: number;
  notes: string;
}

export interface MoveTarget {
  date: ISODate;
  startMin: number;
  technicianId: string | null;
}

export type Op =
  | { k: "addCustomer"; at: string; id: string; code: string; input: NewCustomerInput }
  | { k: "book"; at: string; id: string; code: string; input: BookingInput }
  | { k: "move"; at: string; id: string; to: MoveTarget }
  | { k: "status"; at: string; id: string; status: AppointmentStatus }
  | { k: "step"; at: string; id: string; index: number };

function patch(data: DemoData, id: string, fn: (a: Appointment) => Appointment): DemoData {
  return { ...data, appointments: data.appointments.map((a) => (a.id === id ? fn(a) : a)) };
}

export function applyOp(data: DemoData, op: Op): DemoData {
  switch (op.k) {
    case "addCustomer": {
      const i = op.input;
      const districts = DISTRICTS[i.zoneId] ?? [];
      const customer: Customer = {
        id: op.id,
        code: op.code,
        name: { en: i.name.trim(), ar: i.name.trim() },
        phone: `+966 5• ••• ${i.phoneLast4}`,
        zoneId: i.zoneId,
        district: districts[i.districtIndex] ?? districts[0],
        systemId: i.systemId,
        cycleMonths: i.cycleMonths,
        installedOn: i.installedOn,
        createdOn: op.at.slice(0, 10),
        notes: i.notes.trim(),
        noteKey: null,
        segment: i.segment,
      };
      return { ...data, customers: [customer, ...data.customers] };
    }
    case "book": {
      const i = op.input;
      const appt: Appointment = {
        id: op.id,
        code: op.code,
        customerId: i.customerId,
        technicianId: i.technicianId,
        type: i.type,
        status: "scheduled",
        date: i.date,
        startMin: i.startMin,
        durationMin: SERVICE_DURATION[i.type],
        notes: i.notes.trim(),
        noteKey: null,
        checklist: CHECKLIST_STEPS[i.type].map(() => false),
        history: [{ at: op.at, kind: "created" }],
      };
      return { ...data, appointments: [...data.appointments, appt] };
    }
    case "move":
      return patch(data, op.id, (a) => {
        const { to } = op;
        const history: HistoryEntry[] = [...a.history];
        if (a.date !== to.date || a.startMin !== to.startMin) {
          history.push({ at: op.at, kind: "rescheduled", from: slotLabel(a.date, a.startMin), to: slotLabel(to.date, to.startMin) });
        }
        if (to.technicianId && a.technicianId !== to.technicianId) {
          history.push({ at: op.at, kind: "assigned", from: a.technicianId ?? undefined, to: to.technicianId });
        }
        const status: AppointmentStatus = a.status === "postponed" ? "scheduled" : a.status;
        if (status !== a.status) history.push({ at: op.at, kind: "status", from: a.status, to: status });
        return { ...a, ...to, status, history };
      });
    case "status":
      return patch(data, op.id, (a) =>
        a.status === op.status
          ? a
          : {
              ...a,
              status: op.status,
              checklist: op.status === "completed" ? a.checklist.map(() => true) : a.checklist,
              history: [...a.history, { at: op.at, kind: "status", from: a.status, to: op.status }],
            });
    case "step":
      return patch(data, op.id, (a) => {
        const checklist = a.checklist.map((v, i) => (i === op.index ? !v : v));
        // Ticking a field step means work is under way; ticking the last one completes the visit.
        const status: AppointmentStatus = checklist.every(Boolean)
          ? "completed"
          : a.status === "completed" || a.status === "scheduled" || a.status === "en_route" ? "in_progress" : a.status;
        const history = status !== a.status ? [...a.history, { at: op.at, kind: "status" as const, from: a.status, to: status }] : a.history;
        return { ...a, checklist, status, history };
      });
  }
}

export const replay = (data: DemoData, ops: Op[]) => ops.reduce(applyOp, data);
