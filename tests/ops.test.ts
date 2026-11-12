import { describe, expect, it } from "vitest";
import { generateDemoData } from "../src/data/seed";
import { applyOp, replay, type Op } from "../src/data/ops";

const TODAY = "2026-11-12";
const base = generateDemoData(TODAY);
const future = base.appointments.find((a) => a.date > TODAY && a.technicianId)!;
const at = "2026-11-12T08:00:00.000Z";

const ops: Op[] = [
  { k: "addCustomer", at, id: "c-new-1", code: "PH-N001", input: { name: " Demo Visitor ", phoneLast4: "1234", zoneId: "z-east", districtIndex: 1, systemId: "s-uv", cycleMonths: 6, installedOn: "2026-11-01", segment: "residential", notes: "" } },
  { k: "book", at, id: "a-new-1", code: "SV-99999", input: { customerId: "c-new-1", technicianId: "t-3", type: "inspection", date: "2026-11-16", startMin: 600, notes: "" } },
  { k: "move", at, id: future.id, to: { date: "2026-11-21", startMin: 900, technicianId: future.technicianId } },
  { k: "status", at, id: "a-new-1", status: "en_route" },
  { k: "step", at, id: "a-new-1", index: 0 },
];

describe("operation log", () => {
  const result = replay(base, ops);

  it("never mutates the base dataset", () => {
    expect(JSON.stringify(base)).toBe(JSON.stringify(generateDemoData(TODAY)));
  });

  it("replays deterministically", () => {
    expect(JSON.stringify(replay(generateDemoData(TODAY), ops))).toBe(JSON.stringify(result));
  });

  it("creates customers with masked phones and trimmed names", () => {
    const c = result.customers.find((x) => x.id === "c-new-1")!;
    expect(c.name.en).toBe("Demo Visitor");
    expect(c.phone).toBe("+966 5• ••• 1234");
    expect(c.createdOn).toBe(TODAY);
  });

  it("records reschedules in the visit history", () => {
    const moved = result.appointments.find((a) => a.id === future.id)!;
    expect(moved.date).toBe("2026-11-21");
    expect(moved.history.at(-1)).toMatchObject({ kind: "rescheduled", to: "2026-11-21 15:00" });
  });

  it("checklist progress drives status, completing on the last step", () => {
    let d = result;
    const a = () => d.appointments.find((x) => x.id === "a-new-1")!;
    expect(a().status).toBe("in_progress");
    for (let i = 1; i < a().checklist.length; i++) d = applyOp(d, { k: "step", at, id: "a-new-1", index: i });
    expect(a().status).toBe("completed");
    expect(a().history.map((h) => h.to).filter(Boolean)).toEqual(["en_route", "in_progress", "completed"]);
  });

  it("keeps the persisted log tiny compared with the dataset", () => {
    expect(JSON.stringify(ops).length).toBeLessThan(2_000);
    expect(JSON.stringify(base).length).toBeGreaterThan(1_000_000);
  });
});
