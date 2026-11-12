import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";

/*
 * Hand-built SVG charts — no chart library. Marks follow one spec: thin bars,
 * 4px rounded data ends anchored to the baseline, 2px surface gaps between
 * stacked segments, recessive grid, a legend for multi-series charts, and a
 * per-mark hover tooltip. Every series colour comes from validated tokens.
 */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Rect with only the top corners rounded (the data end). */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
/** Rect with only the end corners rounded, for horizontal bars (direction-aware). */
function endRounded(x: number, y: number, w: number, h: number, r: number, rtl: boolean) {
  if (w <= 0) return "";
  const rr = Math.min(r, h / 2, w);
  return rtl
    ? `M${x + w},${y}H${x + rr}Q${x},${y} ${x},${y + rr}V${y + h - rr}Q${x},${y + h} ${x + rr},${y + h}H${x + w}Z`
    : `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}

/** Axis maximum that splits into four whole, "nice" steps (1·2·5 × 10ⁿ). */
function niceMax(v: number) {
  const raw = Math.max(1, v) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
  return step * 4;
}

export interface Series { key: string; name: string; color: string }

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  // Keep the tooltip inside the plot horizontally.
  const left = Math.max(0, Math.min(x - 80, width - 160));
  return (
    <div className="pointer-events-none absolute z-10 w-40 rounded-md border border-line bg-surface shadow-pop px-2.5 py-2 text-xs"
      style={{ left, top: Math.max(0, y - 8), transform: "translateY(-100%)" }} dir="auto">
      {children}
    </div>
  );
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {series.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

/** Vertical bars, optionally stacked. Categories run right-to-left in Arabic. */
export function BarChart({
  categories, series, values, height = 220, ariaLabel, formatCategory = (c) => c,
}: {
  categories: string[];
  series: Series[];
  /** values[categoryIndex][seriesIndex] */
  values: number[][];
  height?: number;
  ariaLabel: string;
  formatCategory?: (c: string, i: number) => string;
}) {
  const { dir, fmtNumber } = useI18n();
  const rtl = dir === "rtl";
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 10, bottom: 24, side: 34 };
  const plotW = Math.max(0, width - pad.side - 8);
  const plotH = height - pad.top - pad.bottom;
  const totals = values.map((v) => v.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(1, ...totals));
  const n = categories.length;
  const band = n ? plotW / n : 0;
  const barW = Math.max(4, Math.min(28, band * 0.56));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const plotX0 = rtl ? 8 : pad.side;
  const xOf = (i: number) => (rtl ? plotX0 + plotW - (i + 1) * band : plotX0 + i * band) + (band - barW) / 2;
  const yOf = (v: number) => pad.top + plotH - (v / max) * plotH;
  const labelEvery = Math.ceil(n / Math.max(1, Math.floor(plotW / 44)));

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={plotX0} x2={plotX0 + plotW} y1={yOf(tk)} y2={yOf(tk)} stroke="var(--chart-grid)" strokeWidth={tk === 0 ? 1.25 : 1} />
              <text x={rtl ? plotX0 + plotW + 4 : pad.side - 6} y={yOf(tk)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--ink-3)" className="num">{fmtNumber(tk)}</text>
            </g>
          ))}
          {values.map((vals, i) => {
            let acc = 0;
            const x = xOf(i);
            const topIndex = vals.reduce((last, v, si) => (v > 0 ? si : last), -1);
            return (
              <g key={categories[i]} opacity={hover === null || hover === i ? 1 : 0.45}>
                {vals.map((v, si) => {
                  if (v <= 0) return null;
                  const y0 = yOf(acc);
                  acc += v;
                  const y1 = yOf(acc);
                  const gap = si > 0 && acc - v > 0 ? 2 : 0;
                  const h = Math.max(0, y0 - y1 - gap);
                  return si === topIndex
                    ? <path key={series[si].key} d={topRounded(x, y1, barW, h, 4)} fill={series[si].color} />
                    : <rect key={series[si].key} x={x} y={y1} width={barW} height={h} fill={series[si].color} />;
                })}
                {/* Generous hit target across the whole band. */}
                <rect x={x - (band - barW) / 2} y={pad.top} width={band} height={plotH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
                  aria-label={`${formatCategory(categories[i], i)}: ${fmtNumber(totals[i])}`} />
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{formatCategory(categories[i], i)}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip x={xOf(hover) + barW / 2} y={yOf(totals[hover])} width={width}>
          <div className="font-semibold text-ink mb-1">{formatCategory(categories[hover], hover)}</div>
          {series.length > 1 && series.map((s, si) => (
            <div key={s.key} className="flex items-center justify-between gap-2 text-ink-2">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />{s.name}</span>
              <span className="num text-ink">{fmtNumber(values[hover][si])}</span>
            </div>
          ))}
          {series.length === 1 && <div className="num text-ink">{fmtNumber(totals[hover])} {series[0].name}</div>}
        </Tooltip>
      )}
    </div>
  );
}

/** Donut for part-to-whole with ≤6 slices; the legend carries labels and values. */
export function Donut({ slices, ariaLabel, centerLabel }: {
  slices: { key: string; label: string; value: number; color: string }[];
  ariaLabel: string;
  centerLabel: string;
}) {
  const { fmtNumber } = useI18n();
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 52, r = 36, C = 64;
  let angle = -Math.PI / 2;
  const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 0.03 : 0;
  const arcs = slices.filter((s) => s.value > 0).map((s) => {
    const sweep = (s.value / total) * Math.PI * 2;
    const a0 = angle + gap / 2, a1 = angle + sweep - gap / 2;
    angle += sweep;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad: number, rr: number) => `${C + rr * Math.cos(rad)},${C + rr * Math.sin(rad)}`;
    const d = sweep >= Math.PI * 2 - 0.001
      ? `M${C},${C - R}A${R},${R} 0 1 1 ${C - 0.01},${C - R}L${C - 0.01},${C - r}A${r},${r} 0 1 0 ${C},${C - r}Z`
      : `M${p(a0, R)}A${R},${R} 0 ${large} 1 ${p(a1, R)}L${p(a1, r)}A${r},${r} 0 ${large} 0 ${p(a0, r)}Z`;
    return { ...s, d };
  });
  const shown = hover ? slices.find((s) => s.key === hover) : null;
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg viewBox="0 0 128 128" className="w-32 h-32 flex-shrink-0" role="img" aria-label={ariaLabel}>
        {total === 0 && <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="var(--chart-grid)" strokeWidth={R - r} />}
        {arcs.map((a) => (
          <path key={a.key} d={a.d} fill={a.color} opacity={!hover || hover === a.key ? 1 : 0.35}
            onMouseEnter={() => setHover(a.key)} onMouseLeave={() => setHover(null)} />
        ))}
        <text x={C} y={C - 2} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--ink)" className="num">{fmtNumber(shown ? shown.value : total)}</text>
        <text x={C} y={C + 14} textAnchor="middle" fontSize="9" fill="var(--ink-3)">{shown ? shown.label : centerLabel}</text>
      </svg>
      <ul className="flex-1 min-w-[150px] space-y-1.5 text-xs">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3" onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}>
            <span className="inline-flex items-center gap-2 text-ink-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>
            <span className="num font-medium text-ink">{fmtNumber(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked horizontal bars with direct value labels (single series — no legend needed). */
export function HBars({ rows, ariaLabel, color = "var(--series-1)" }: {
  rows: { key: string; label: string; value: number }[];
  ariaLabel: string;
  color?: string;
}) {
  const { dir, fmtNumber } = useI18n();
  const rtl = dir === "rtl";
  const [ref, width] = useWidth<HTMLDivElement>();
  const max = Math.max(1, ...rows.map((r) => r.value));
  const labelW = Math.min(130, width * 0.38);
  const valueW = 36;
  const barArea = Math.max(0, width - labelW - valueW - 12);
  const rowH = 30;
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={rows.length * rowH} role="img" aria-label={ariaLabel}>
          {rows.map((r, i) => {
            const w = (r.value / max) * barArea;
            const y = i * rowH;
            const bx = rtl ? width - labelW - 6 - w : labelW + 6;
            return (
              <g key={r.key}>
                <text x={rtl ? width : 0} y={y + rowH / 2} dy="0.32em" textAnchor="start" fontSize="11.5" fill="var(--ink-2)">{r.label}</text>
                <path d={endRounded(bx, y + 9, w, rowH - 18, 4, rtl)} fill={color} />
                <text x={rtl ? bx - 6 : bx + w + 6} y={y + rowH / 2} dy="0.32em" textAnchor="start" fontSize="11.5" fontWeight="600" fill="var(--ink)" className="num">{fmtNumber(r.value)}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
