import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DATA_VERSION, DEFAULT_SEED, fingerprint, generateDemoData, todayISO } from "./seed";
import { SERVICE_DURATION } from "./catalog";
import { applyOp, replay, type BookingInput, type MoveTarget, type NewCustomerInput, type Op } from "./ops";
import { checkSlot, type SlotProblem } from "../domain/schedule";
import { summarizeAll, type CustomerServiceSummary } from "../domain/service";
import type { AppointmentStatus, Customer, DemoData, ISODate, Technician } from "../domain/types";
import { safeStorage } from "../lib/storage";

export type { BookingInput, NewCustomerInput } from "./ops";

/**
 * The entire "backend" of the showcase. The dataset is generated on the device
 * from a fixed seed; visitor changes are validated here, recorded as small
 * operations, and the operation log (only) is saved to localStorage. Reloading
 * regenerates the dataset and replays the log. Nothing leaves the browser.
 */

const STORAGE_KEY = "phs.ops";

interface Persisted { version: number; seed: number; generatedFor: ISODate; fingerprint: string; ops: Op[] }

function loadOps(today: ISODate, print: string): Op[] {
  const raw = safeStorage.get(STORAGE_KEY);
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as Persisted;
    // A new day, data version or dataset fingerprint starts fresh: "today" stays meaningful and
    // operations are never replayed onto records they were not recorded against.
    if (p.version === DATA_VERSION && p.seed === DEFAULT_SEED && p.generatedFor === today && p.fingerprint === print && Array.isArray(p.ops)) {
      return p.ops;
    }
  } catch {
    /* corrupted entry — start clean */
  }
  return [];
}

export type ActionResult = { ok: true; id: string } | { ok: false; problems: SlotProblem[] };

interface Store {
  data: DemoData;
  today: ISODate;
  changes: number;
  summaries: Map<string, CustomerServiceSummary>;
  customersById: Map<string, Customer>;
  techById: Map<string, Technician>;
  reset: () => void;
  addCustomer: (input: NewCustomerInput) => string;
  book: (input: BookingInput) => ActionResult;
  move: (id: string, to: MoveTarget) => ActionResult;
  setStatus: (id: string, status: AppointmentStatus) => void;
  toggleStep: (id: string, index: number) => void;
}

const Ctx = createContext<Store | null>(null);
const stamp = () => new Date().toISOString();

export function DemoStoreProvider({ children, today: todayProp }: { children: ReactNode; today?: ISODate }) {
  const today = todayProp ?? todayISO();
  const base = useMemo(() => generateDemoData(today), [today]);
  const print = useMemo(() => fingerprint(base), [base]);
  const [state, setState] = useState(() => {
    const ops = loadOps(today, print);
    return { ops, data: replay(base, ops) };
  });
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const persisted: Persisted = { version: DATA_VERSION, seed: DEFAULT_SEED, generatedFor: today, fingerprint: print, ops: state.ops };
    if (state.ops.length) safeStorage.set(STORAGE_KEY, JSON.stringify(persisted));
    else safeStorage.remove(STORAGE_KEY);
  }, [state.ops, today, print]);

  const dispatch = useCallback((op: Op) => {
    const s = ref.current;
    const next = { ops: [...s.ops, op], data: applyOp(s.data, op) };
    ref.current = next;
    setState(next);
  }, []);

  const reset = useCallback(() => {
    const next = { ops: [], data: base };
    ref.current = next;
    setState(next);
  }, [base]);

  const addCustomer = useCallback((input: NewCustomerInput) => {
    const n = ref.current.ops.filter((o) => o.k === "addCustomer").length + 1;
    const id = `c-new-${n}-${Date.now().toString(36)}`;
    dispatch({ k: "addCustomer", at: stamp(), id, code: `PH-N${String(n).padStart(3, "0")}`, input });
    return id;
  }, [dispatch]);

  const book = useCallback((input: BookingInput): ActionResult => {
    const d = ref.current.data;
    const problems = checkSlot({ ...input, durationMin: SERVICE_DURATION[input.type] }, d.appointments, today);
    if (problems.length) return { ok: false, problems };
    const seq = d.appointments.reduce((m, a) => Math.max(m, Number(a.code.slice(3)) || 0), 0) + 1;
    const id = `a-new-${seq}`;
    dispatch({ k: "book", at: stamp(), id, code: `SV-${seq}`, input });
    return { ok: true, id };
  }, [dispatch, today]);

  const move = useCallback((id: string, to: MoveTarget): ActionResult => {
    const appt = ref.current.data.appointments.find((a) => a.id === id);
    if (!appt) return { ok: false, problems: [] };
    const problems = checkSlot({ ...to, durationMin: appt.durationMin }, ref.current.data.appointments, today, id);
    if (problems.length) return { ok: false, problems };
    dispatch({ k: "move", at: stamp(), id, to });
    return { ok: true, id };
  }, [dispatch, today]);

  const setStatus = useCallback((id: string, status: AppointmentStatus) => dispatch({ k: "status", at: stamp(), id, status }), [dispatch]);
  const toggleStep = useCallback((id: string, index: number) => dispatch({ k: "step", at: stamp(), id, index }), [dispatch]);

  const { data, ops } = state;
  const derived = useMemo(() => ({
    summaries: summarizeAll(data.customers, data.appointments, today),
    customersById: new Map(data.customers.map((c) => [c.id, c])),
    techById: new Map(data.technicians.map((t) => [t.id, t])),
  }), [data, today]);

  const value = useMemo<Store>(
    () => ({ data, today, changes: ops.length, ...derived, reset, addCustomer, book, move, setStatus, toggleStep }),
    [data, today, ops.length, derived, reset, addCustomer, book, move, setStatus, toggleStep],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside DemoStoreProvider");
  return v;
}
