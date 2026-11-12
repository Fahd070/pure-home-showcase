import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { cx } from "./primitives";

type ToastKind = "ok" | "bad";
interface ToastItem { id: number; text: string; kind: ToastKind }

const Ctx = createContext<(text: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: ToastKind = "ok") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, text, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-4 z-[60] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none" role="status" aria-live="polite">
        {items.map((x) => (
          <div key={x.id} className={cx("pop-enter pointer-events-auto flex items-center gap-2 rounded-md border px-3 py-2 text-[0.8125rem] shadow-pop bg-surface sm:max-w-sm",
            x.kind === "ok" ? "border-ok-line" : "border-bad-line")}>
            <span className={x.kind === "ok" ? "text-ok-fg" : "text-bad-fg"}><Icon name={x.kind === "ok" ? "check" : "alert"} /></span>
            <span>{x.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
