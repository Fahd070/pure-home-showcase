import type { ISODate } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Adds calendar months, clamping to the last day of the target month. */
export function addMonths(s: ISODate, months: number): ISODate {
  const d = parseISODate(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Start of week; Sunday by default (regional work week Sun–Thu). */
export function startOfWeek(s: ISODate, weekStartsOn: 0 | 1 | 6 = 0): ISODate {
  const d = parseISODate(s);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(s, -diff);
}

export function monthKey(s: ISODate): string {
  return s.slice(0, 7);
}

export function formatTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function compareSlot(a: { date: ISODate; startMin: number }, b: { date: ISODate; startMin: number }) {
  return a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1;
}
