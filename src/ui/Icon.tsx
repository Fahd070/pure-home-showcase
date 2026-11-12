/** Minimal stroke icon set drawn for the showcase (24×24 grid, 1.75 stroke). */
const PATHS = {
  overview: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  customers: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  team: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0M19 8l2 2-2 2M5 8l-2 2 2 2",
  chart: "M4 20h16M7 16V10M12 16V5M17 16v-4",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-5M12 8h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  plus: "M12 5v14M5 12h14",
  chevron: "M9 6l6 6-6 6",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20",
  reset: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  x: "M6 6l12 12M18 6 6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 7v5l3 2",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  phone: "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  wrench: "M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L4 12l2.3-2.3a4 4 0 0 0 5-5L14 2.4",
  drop: "M12 3c4 5 6 8.3 6 11a6 6 0 0 1-12 0c0-2.7 2-6 6-11Z",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a3 3 0 0 1 3-3h7M18 9v6a3 3 0 0 1-3 3H8",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z",
  alert: "M12 3 2 20h20L12 3ZM12 10v4M12 17h.01",
  table: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "w-4 h-4", flipRtl = false }: { name: IconName; className?: string; flipRtl?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} flex-shrink-0 ${flipRtl ? "rtl:-scale-x-100" : ""}`}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function BrandMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--brand)" />
      <path d="M14 31 32 16l18 15" fill="none" stroke="var(--brand-fg)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 26c5.5 7 8.5 11.6 8.5 15.5a8.5 8.5 0 0 1-17 0C23.5 37.6 26.5 33 32 26Z" fill="var(--brand-fg)" opacity="0.85" />
    </svg>
  );
}
