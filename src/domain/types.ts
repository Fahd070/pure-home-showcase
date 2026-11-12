/**
 * Showcase domain model.
 *
 * Written for this public demo only. It models a home water-treatment service
 * business at the level a visitor sees in the UI — it is not, and does not
 * mirror, any production schema.
 */

export type Locale = "en" | "ar";
export type Bilingual = Record<Locale, string>;

export type ServiceType = "maintenance" | "installation" | "inspection";

export type AppointmentStatus =
  | "scheduled"
  | "en_route"
  | "in_progress"
  | "completed"
  | "postponed"
  | "cancelled";

/** Calendar date as `YYYY-MM-DD` (local, no time zone). */
export type ISODate = string;

export interface Zone {
  id: string;
  name: Bilingual;
}

export interface SystemModel {
  id: string;
  name: Bilingual;
  stages: number;
}

export interface Technician {
  id: string;
  name: Bilingual;
  zoneId: string;
  skills: ServiceType[];
  joinedYear: number;
  /** Synthetic satisfaction score, 1–5. */
  rating: number;
  /** Synthetic on-time arrival rate, 0–1. */
  onTimeRate: number;
}

export interface Customer {
  id: string;
  code: string;
  name: Bilingual;
  /** Always masked; the demo never holds a full phone number. */
  phone: string;
  zoneId: string;
  district: Bilingual;
  systemId: string;
  /** Maintenance cycle in months. */
  cycleMonths: number;
  installedOn: ISODate;
  createdOn: ISODate;
  /** Free text entered in the demo. */
  notes: string;
  /** Index into the generated bilingual note catalogue, if any. */
  noteKey: number | null;
  segment: "residential" | "commercial";
}

export interface HistoryEntry {
  at: string; // ISO timestamp
  kind: "created" | "rescheduled" | "status" | "assigned";
  /** Status code, slot (`YYYY-MM-DD HH:mm`) or technician id, depending on kind. */
  from?: string;
  to?: string;
}

export interface Appointment {
  id: string;
  code: string;
  customerId: string;
  technicianId: string | null;
  type: ServiceType;
  status: AppointmentStatus;
  date: ISODate;
  /** Start time as minutes after midnight. */
  startMin: number;
  durationMin: number;
  notes: string;
  noteKey: number | null;
  /** Field checklist completion, one flag per step of the service type. */
  checklist: boolean[];
  history: HistoryEntry[];
}

export interface DemoData {
  version: number;
  generatedFor: ISODate;
  zones: Zone[];
  systems: SystemModel[];
  technicians: Technician[];
  customers: Customer[];
  appointments: Appointment[];
}

export const OPEN_STATUSES: AppointmentStatus[] = ["scheduled", "en_route", "in_progress"];
export const WORKDAY_START = 8 * 60;
export const WORKDAY_END = 18 * 60;
