import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useI18n, type TKey } from "../i18n";
import { useDemo } from "../data/store";
import { BrandMark, Icon, type IconName } from "../ui/Icon";
import { Button, Dialog, cx } from "../ui/primitives";
import { useToast } from "../ui/Toast";
import { safeStorage } from "../lib/storage";

const NAV: { section: TKey; items: { to: string; label: TKey; icon: IconName }[] }[] = [
  {
    section: "nav.sectionOps",
    items: [
      { to: "/", label: "nav.overview", icon: "overview" },
      { to: "/customers", label: "nav.customers", icon: "customers" },
      { to: "/schedule", label: "nav.schedule", icon: "calendar" },
      { to: "/workforce", label: "nav.workforce", icon: "team" },
    ],
  },
  { section: "nav.sectionInsight", items: [{ to: "/reports", label: "nav.reports", icon: "chart" }] },
];

type Theme = "light" | "dark";
const THEME_KEY = "phs.theme";
function initialTheme(): Theme {
  const saved = safeStorage.get(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { data, today } = useDemo();
  const unassigned = data.appointments.filter((a) => !a.technicianId && a.status === "scheduled" && a.date >= today).length;
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4" aria-label={t("app.menu")}>
      {NAV.map((group) => (
        <div key={group.section}>
          <p className="px-2.5 mb-1 text-2xs font-semibold uppercase tracking-wider text-chrome-muted">{t(group.section)}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) => cx(
                    "relative flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[0.8125rem] transition-colors",
                    isActive
                      ? "bg-chrome-active text-ink font-semibold shadow-card before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:rounded-full before:bg-brand"
                      : "text-chrome-fg hover:bg-chrome-hover hover:text-ink",
                  )}
                >
                  <Icon name={item.icon} />
                  <span className="flex-1 truncate">{t(item.label)}</span>
                  {item.to === "/schedule" && unassigned > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-warn-bg text-warn-fg border border-warn-line text-2xs font-semibold inline-flex items-center justify-center num"
                      title={t("schedule.unassigned")}>{unassigned}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="border-t border-line-subtle pt-3">
        <NavLink to="/about" onClick={onNavigate}
          className={({ isActive }) => cx("flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[0.8125rem]",
            isActive ? "bg-chrome-active text-ink font-semibold shadow-card" : "text-chrome-fg hover:bg-chrome-hover hover:text-ink")}>
          <Icon name="info" />
          <span className="truncate">{t("nav.about")}</span>
        </NavLink>
      </div>
    </nav>
  );
}

function Brand() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2.5 px-4 h-14 border-b border-line-subtle flex-shrink-0">
      <BrandMark />
      <div className="min-w-0 leading-tight">
        <p className="text-[0.875rem] font-semibold text-ink" dir="ltr">Pure Home</p>
        <p className="text-2xs text-chrome-muted truncate">{t("app.tagline")}</p>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { reset } = useDemo();
  const toast = useToast();
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [drawer, setDrawer] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeStorage.set(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setDrawer(false);
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="h-full flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-3 focus:py-2 focus:bg-surface focus:rounded">{t("app.skip")}</a>

      {/* Persistent, tasteful demo disclosure. */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 h-8 bg-brand text-brand-fg text-xs text-center" data-testid="demo-notice">
        <Icon name="info" className="w-3.5 h-3.5" />
        <span className="truncate">{t("app.demoNotice")}</span>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Desktop rail */}
        <aside className="hidden lg:flex w-60 flex-col bg-chrome border-e border-line flex-shrink-0">
          <Brand />
          <NavItems />
          <p className="px-4 py-3 text-2xs text-chrome-muted border-t border-line-subtle">{t("chrome.localOnly")}</p>
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40 scrim-enter" onClick={() => setDrawer(false)} aria-hidden="true" />
            <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] flex flex-col bg-chrome shadow-pop pop-enter" aria-label={t("app.menu")}>
              <div className="flex items-center justify-between pe-2">
                <Brand />
                <button type="button" onClick={() => setDrawer(false)} aria-label={t("app.closeMenu")} className="w-9 h-9 inline-flex items-center justify-center rounded text-ink-2 hover:bg-chrome-hover">
                  <Icon name="x" />
                </button>
              </div>
              <NavItems onNavigate={() => setDrawer(false)} />
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex-shrink-0 flex items-center gap-2 h-12 px-3 sm:px-5 bg-surface border-b border-line">
            <button type="button" className="lg:hidden w-9 h-9 -ms-1 inline-flex items-center justify-center rounded text-ink-2 hover:bg-surface-hover"
              onClick={() => setDrawer(true)} aria-label={t("app.menu")} aria-expanded={drawer}>
              <Icon name="menu" className="w-5 h-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2 min-w-0">
              <BrandMark className="w-6 h-6" />
              <span className="font-semibold text-[0.8125rem]" dir="ltr">Pure Home</span>
            </div>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" icon="globe" onClick={() => setLocale(locale === "en" ? "ar" : "en")}
              aria-label={t("chrome.languageLabel")} data-testid="toggle-language">
              <span lang={locale === "en" ? "ar" : "en"}>{t("chrome.language")}</span>
            </Button>
            <Button variant="ghost" size="sm" icon={theme === "dark" ? "sun" : "moon"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? t("chrome.themeLight") : t("chrome.themeDark")} title={theme === "dark" ? t("chrome.themeLight") : t("chrome.themeDark")} data-testid="toggle-theme" />
            <Button variant="secondary" size="sm" icon="reset" onClick={() => setConfirmReset(true)} data-testid="reset-demo" aria-label={t("chrome.reset")}>
              <span className="hidden sm:inline">{t("chrome.reset")}</span>
            </Button>
          </header>

          <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none">
            <div key={location.pathname} className="view-enter mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-5">{children}</div>
          </main>
        </div>
      </div>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title={t("chrome.resetTitle")} width="max-w-md"
        footer={<>
          <Button onClick={() => setConfirmReset(false)}>{t("common.cancel")}</Button>
          <Button variant="primary" icon="reset" data-testid="confirm-reset" onClick={() => { reset(); setConfirmReset(false); toast(t("chrome.resetDone")); }}>
            {t("chrome.resetConfirm")}
          </Button>
        </>}>
        <p className="text-[0.8125rem] text-ink-2">{t("chrome.resetBody")}</p>
      </Dialog>
    </div>
  );
}
