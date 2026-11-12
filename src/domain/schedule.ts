import { formatTime } from "./dates";
import { WORKDAY_END, WORKDAY_START, type Appointment, type ISODate } from "./types";

export interface SlotRequest {
  date: ISODate;
  startMin: number;
  durationMin: number;
  technicianId: string | null;
}

export type SlotProblem =
  | { kind: "outside_hours" }
  | { kind: "past" }
  | { kind: "rest_day" }
  | { kind: "conflict"; with: Appointment };

const blocksTime = (a: Appointment) => a.status !== "cancelled" && a.status !== "postponed";

/** Validates a proposed slot. An empty list means the slot can be booked. */
export function checkSlot(
  req: SlotRequest,
  appointments: Appointment[],
  today: ISODate,
  ignoreId?: string,
): SlotProblem[] {
  const problems: SlotProblem[] = [];
  if (req.date < today) problems.push({ kind: "past" });
  const [y, m, d] = req.date.split("-").map(Number);
  if (new Date(y, m - 1, d).getDay() === 5) problems.push({ kind: "rest_day" });
  if (req.startMin < WORKDAY_START || req.startMin + req.durationMin > WORKDAY_END) {
    problems.push({ kind: "outside_hours" });
  }
  if (req.technicianId) {
    const end = req.startMin + req.durationMin;
    for (const a of appointments) {
      if (a.id === ignoreId || a.technicianId !== req.technicianId || a.date !== req.date || !blocksTime(a)) continue;
      if (req.startMin < a.startMin + a.durationMin && a.startMin < end) {
        problems.push({ kind: "conflict", with: a });
      }
    }
  }
  return problems;
}

export const slotLabel = (date: ISODate, startMin: number) => `${date} ${formatTime(startMin)}`;

/** Snaps minutes to the nearest 30-minute grid line. */
export const snap30 = (min: number) => Math.round(min / 30) * 30;
