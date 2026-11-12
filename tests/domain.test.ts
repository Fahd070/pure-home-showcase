import { describe, expect, it } from "vitest";
import { generateDemoData } from "../src/data/seed";
import { addDays, addMonths, daysBetween, startOfWeek } from "../src/domain/dates";
import { nextService, previousService, serviceHealth, summarizeAll, summarizeCustomer } from "../src/domain/service";
import { checkSlot } from "../src/domain/schedule";
import { filterAppointments, monthlyCompleted, outcomes } from "../src/domain/reports";
import { toCSV } from "../src/domain/csv";
import type { Appointment, Customer } from "../src/domain/types";

const TODAY = "2026-11-12"; // a Thursday
const data = generateDemoData(TODAY);

function appt(p: Partial<Appointment>): Appointment {
  return {
    id: "x", code: "SV-1", customerId: "c", technicianId: "t-1", type: "maintenance", status: "scheduled",
    date: TODAY, startMin: 600, durationMin: 60, notes: "", noteKey: null, checklist: [], history: [], ...p,
  };
}
const customer: Customer = {
  id: "c", code: "PH-1", name: { en: "Test", ar: "اختبار" }, phone: "+966 5• ••• 0000", zoneId: "z-north",
  district: { en: "d", ar: "د" }, systemId: "s-ro5", cycleMonths: 6, installedOn: "2026-01-10", createdOn: "2026-01-01",
  notes: "", noteKey: null, segment: "residential",
};

describe("date helpers", () => {
  it("adds months with end-of-month clamping", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-08-15", 6)).toBe("2027-02-15");
  });
  it("counts days and weeks", () => {
    expect(daysBetween("2026-11-01", "2026-11-12")).toBe(11);
    expect(startOfWeek(TODAY)).toBe("2026-11-08"); // Sunday
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("mock data generator", () => {
  it("is deterministic for a given seed and date, including after JIT warm-up", () => {
    // Replaying the saved operation log depends on regenerating byte-identical data.
    const expected = JSON.stringify(data);
    for (let i = 0; i < 8; i++) expect(JSON.stringify(generateDemoData(TODAY))).toBe(expected);
  });

  it("produces referentially consistent records", () => {
    const customers = new Set(data.customers.map((c) => c.id));
    const techs = new Set(data.technicians.map((t) => t.id));
    for (const a of data.appointments) {
      expect(customers.has(a.customerId)).toBe(true);
      if (a.technicianId) expect(techs.has(a.technicianId)).toBe(true);
    }
    expect(new Set(data.appointments.map((a) => a.id)).size).toBe(data.appointments.length);
    expect(new Set(data.customers.map((c) => c.code)).size).toBe(data.customers.length);
  });

  it("never double-books a technician", () => {
    const live = data.appointments.filter((a) => a.technicianId && a.status !== "cancelled" && a.status !== "postponed");
    for (const a of live) {
      const problems = checkSlot(a, live, "1900-01-01", a.id).filter((p) => p.kind === "conflict");
      expect(problems, `${a.code} overlaps`).toEqual([]);
    }
  });

  it("schedules no visits on the weekly rest day (Friday)", () => {
    const fridays = data.appointments.filter((a) => new Date(`${a.date}T12:00:00`).getDay() === 5);
    expect(fridays).toEqual([]);
  });

  it("keeps the future free of completed visits and the past free of open ones", () => {
    for (const a of data.appointments) {
      if (a.date > TODAY) expect(a.status).toBe("scheduled");
      if (a.date < TODAY) expect(["completed", "cancelled", "postponed"]).toContain(a.status);
    }
  });

  it("only stores masked phone numbers", () => {
    for (const c of data.customers) expect(c.phone).toMatch(/^\+966 5• ••• \d{4}$/);
  });

  it("has a realistic spread of service health", () => {
    const counts: Record<string, number> = {};
    for (const s of summarizeAll(data.customers, data.appointments, TODAY).values()) counts[s.health] = (counts[s.health] ?? 0) + 1;
    for (const h of ["booked", "overdue", "due_soon", "on_track"]) expect(counts[h] ?? 0).toBeGreaterThan(0);
  });

  it("generates quickly enough to rebuild on every page load", () => {
    const t0 = performance.now();
    generateDemoData(TODAY);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});

describe("previous vs next service", () => {
  it("previous service ignores cancelled, postponed and future visits", () => {
    const own = [
      appt({ id: "1", date: "2026-05-01", status: "completed" }),
      appt({ id: "2", date: "2026-10-01", status: "cancelled" }),
      appt({ id: "3", date: "2026-10-05", status: "postponed" }),
      appt({ id: "4", date: "2026-12-01", status: "scheduled" }),
    ];
    expect(previousService(own, TODAY)?.id).toBe("1");
  });

  it("next service is the earliest open booking from today", () => {
    const own = [
      appt({ id: "a", date: "2026-12-20" }),
      appt({ id: "b", date: "2026-11-20" }),
      appt({ id: "c", date: "2026-11-15", status: "cancelled" }),
      appt({ id: "d", date: "2026-11-01" }), // stale open visit in the past is not "next"
    ];
    const next = nextService(customer, own, TODAY);
    expect(next.kind).toBe("booked");
    expect(next.kind === "booked" && next.appointment.id).toBe("b");
  });

  it("falls back to a projection from the last completed visit", () => {
    const own = [appt({ date: "2026-04-02", status: "completed" })];
    expect(nextService(customer, own, TODAY)).toEqual({ kind: "projected", date: "2026-10-02" });
    expect(serviceHealth(nextService(customer, own, TODAY), TODAY)).toBe("overdue");
  });

  it("projects from installation when there is no completed visit", () => {
    const fresh = { ...customer, installedOn: "2026-09-01" };
    const next = nextService(fresh, [], TODAY);
    expect(next).toEqual({ kind: "projected", date: "2027-03-01" });
    expect(serviceHealth(next, TODAY)).toBe("on_track");
  });

  it("flags due-soon within 30 days", () => {
    const s = summarizeCustomer({ ...customer, installedOn: "2026-05-20" }, [], TODAY);
    expect(s.health).toBe("due_soon");
    expect(s.daysToNext).toBe(8);
  });
});

describe("slot validation", () => {
  const existing = [appt({ id: "busy", technicianId: "t-1", date: "2026-11-15", startMin: 600, durationMin: 60, code: "SV-9" })];
  it("rejects overlaps for the same technician only", () => {
    expect(checkSlot({ date: "2026-11-15", startMin: 630, durationMin: 60, technicianId: "t-1" }, existing, TODAY)
      .map((p) => p.kind)).toEqual(["conflict"]);
    expect(checkSlot({ date: "2026-11-15", startMin: 630, durationMin: 60, technicianId: "t-2" }, existing, TODAY)).toEqual([]);
    expect(checkSlot({ date: "2026-11-15", startMin: 660, durationMin: 60, technicianId: "t-1" }, existing, TODAY)).toEqual([]);
  });
  it("ignores the visit being moved and non-blocking statuses", () => {
    expect(checkSlot({ date: "2026-11-15", startMin: 600, durationMin: 60, technicianId: "t-1" }, existing, TODAY, "busy")).toEqual([]);
    const cancelled = [{ ...existing[0], status: "cancelled" as const }];
    expect(checkSlot({ date: "2026-11-15", startMin: 600, durationMin: 60, technicianId: "t-1" }, cancelled, TODAY)).toEqual([]);
  });
  it("rejects past dates, Fridays and out-of-hours slots", () => {
    const kinds = (d: string, s: number) => checkSlot({ date: d, startMin: s, durationMin: 60, technicianId: null }, [], TODAY).map((p) => p.kind);
    expect(kinds("2026-11-10", 600)).toEqual(["past"]);
    expect(kinds("2026-11-13", 600)).toEqual(["rest_day"]);
    expect(kinds("2026-11-15", 17 * 60 + 30)).toEqual(["outside_hours"]);
  });
});

describe("reports", () => {
  const byId = new Map(data.customers.map((c) => [c.id, c]));
  it("monthly buckets cover every month and sum to completed visits", () => {
    const from = addDays(TODAY, -181);
    const list = filterAppointments(data.appointments, byId, { from, to: TODAY, types: [], zoneId: "all" });
    const months = monthlyCompleted(list, from, TODAY);
    expect(months.length).toBe(7);
    const sum = months.reduce((s, b) => s + b.maintenance + b.installation + b.inspection, 0);
    expect(sum).toBe(list.filter((a) => a.status === "completed").length);
  });
  it("filters by zone and type", () => {
    const list = filterAppointments(data.appointments, byId, { from: "2000-01-01", to: "2100-01-01", types: ["installation"], zoneId: "z-east" });
    expect(list.length).toBeGreaterThan(0);
    for (const a of list) {
      expect(a.type).toBe("installation");
      expect(byId.get(a.customerId)!.zoneId).toBe("z-east");
    }
  });
  it("computes completion rate over concluded visits only", () => {
    const o = outcomes([appt({ status: "completed" }), appt({ status: "completed" }), appt({ status: "cancelled" }), appt({ status: "scheduled" })]);
    expect(o.completionRate).toBeCloseTo(2 / 3);
    expect(outcomes([appt({})]).completionRate).toBeNull();
  });
});

describe("CSV export", () => {
  it("escapes quotes/commas, keeps Arabic, and neutralises formulas", () => {
    const csv = toCSV(["a", "b"], [["x,y", 'say "hi"'], ["=SUM(A1)", "نورة"]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"x,y","say ""hi"""');
    expect(csv).toContain("'=SUM(A1),نورة");
  });
});
