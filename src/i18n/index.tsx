import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ar } from "./ar";
import { en, type Dict } from "./en";
import type { Bilingual, ISODate, Locale } from "../domain/types";
import { parseISODate } from "../domain/dates";
import { safeStorage } from "../lib/storage";

const DICTS: Record<Locale, Dict> = { en, ar };

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : T[K] extends readonly string[] ? never : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Leaves<Dict>;
type Vars = Record<string, string | number>;

export function translate(dict: Dict, key: TKey, vars?: Vars): string {
  let node: unknown = dict;
  for (const part of key.split(".")) node = (node as Record<string, unknown>)[part];
  let s = typeof node === "string" ? node : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Intl locale tags: Gregorian calendar and Latin digits in both languages. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", ar: "ar-u-nu-latn-ca-gregory" };

interface I18n {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  t: (key: TKey, vars?: Vars) => string;
  months: string[];
  /** Picks the current-language side of a bilingual value. */
  pick: (b: Bilingual) => string;
  fmtDate: (d: ISODate, style?: "short" | "medium" | "long" | "weekday") => string;
  fmtNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
}

const Ctx = createContext<I18n | null>(null);
const KEY = "phs.locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => (safeStorage.get(KEY) === "ar" ? "ar" : "en"));
  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    safeStorage.set(KEY, l);
  }, []);

  const value = useMemo<I18n>(() => {
    const dict = DICTS[locale];
    const tag = INTL_LOCALE[locale];
    const formats = {
      short: new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" }),
      medium: new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" }),
      long: new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      weekday: new Intl.DateTimeFormat(tag, { weekday: "short" }),
    };
    return {
      locale,
      dir,
      setLocale,
      t: (key, vars) => translate(dict, key, vars),
      months: dict.months,
      pick: (b) => b[locale],
      fmtDate: (d, style = "medium") => formats[style].format(parseISODate(d)),
      fmtNumber: (n, opts) => new Intl.NumberFormat(tag, opts).format(n),
    };
  }, [locale, dir, setLocale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
