/** Tailwind is bound to CSS custom properties (src/styles/tokens.css), so the
 *  light/dark theme switches every surface without class changes. */
const tone = (n) => ({
  bg: `var(--${n}-bg)`, fg: `var(--${n}-fg)`, line: `var(--${n}-line)`, solid: `var(--${n}-solid)`,
});
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font)"], mono: ["var(--font-mono)"] },
      fontSize: { "2xs": ["0.6875rem", "1rem"] },
      colors: {
        canvas: "var(--canvas)",
        surface: { DEFAULT: "var(--surface)", sunken: "var(--surface-sunken)", hover: "var(--surface-hover)", active: "var(--surface-active)" },
        chrome: { DEFAULT: "var(--chrome)", fg: "var(--chrome-fg)", muted: "var(--chrome-muted)", hover: "var(--chrome-hover)", active: "var(--chrome-active)" },
        line: { DEFAULT: "var(--line)", subtle: "var(--line-subtle)", strong: "var(--line-strong)" },
        ink: { DEFAULT: "var(--ink)", 2: "var(--ink-2)", 3: "var(--ink-3)", inverse: "var(--ink-inverse)" },
        brand: { DEFAULT: "var(--brand)", hover: "var(--brand-hover)", fg: "var(--brand-fg)", soft: "var(--brand-soft)", softfg: "var(--brand-soft-fg)", line: "var(--brand-line)" },
        ok: tone("ok"), warn: tone("warn"), bad: tone("bad"), info: tone("info"), prog: tone("prog"), mute: tone("mute"),
        series: { 1: "var(--series-1)", 2: "var(--series-2)", 3: "var(--series-3)" },
      },
      boxShadow: { card: "var(--shadow-card)", pop: "var(--shadow-pop)" },
      borderRadius: { DEFAULT: "6px" },
    },
  },
  plugins: [],
};
