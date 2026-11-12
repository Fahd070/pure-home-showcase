import { useI18n } from "../i18n";
import { useDemo } from "../data/store";
import { addDays, daysBetween, formatTime } from "../domain/dates";
import type { Appointment, AppointmentStatus, ISODate } from "../domain/types";

export function useFormat() {
  const i18n = useI18n();
  const { today, techById } = useDemo();
  const { t, fmtDate, pick } = i18n;

  const relDay = (d: ISODate) => {
    if (d === today) return t("common.today");
    if (d === addDays(today, 1)) return t("common.tomorrow");
    if (d === addDays(today, -1)) return t("common.yesterday");
    return fmtDate(d, "medium");
  };

  const relDistance = (d: ISODate) => {
    const n = daysBetween(today, d);
    if (n === 0) return t("common.today");
    return n > 0 ? t("common.inDays", { n }) : t("common.daysAgo", { n: -n });
  };

  const slot = (a: Pick<Appointment, "date" | "startMin" | "durationMin">) =>
    `${relDay(a.date)} · ${formatTime(a.startMin)}–${formatTime(a.startMin + a.durationMin)}`;

  const techName = (id: string | null) => (id ? pick(techById.get(id)?.name ?? { en: "—", ar: "—" }) : t("common.unassigned"));

  return { ...i18n, relDay, relDistance, slot, techName, time: formatTime };
}

/** Allowed manual status changes for the demo's simple visit lifecycle. */
export const NEXT_STATUSES: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["en_route", "postponed", "cancelled"],
  en_route: ["in_progress", "postponed"],
  in_progress: ["completed"],
  postponed: ["cancelled"],
  completed: [],
  cancelled: [],
};
