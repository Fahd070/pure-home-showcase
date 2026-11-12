import { Link } from "react-router-dom";
import { useI18n, type TKey } from "../i18n";
import { BrandMark, Icon } from "../ui/Icon";
import { Card } from "../ui/primitives";

const TRY: { key: TKey; to: string }[] = [
  { key: "about.try1", to: "/schedule" },
  { key: "about.try2", to: "/customers?health=overdue" },
  { key: "about.try3", to: "/workforce" },
  { key: "about.try4", to: "/" },
  { key: "about.try5", to: "/reports" },
];

export function About() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <BrandMark className="w-10 h-10" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("about.title")}</h1>
          <p className="text-xs text-ink-3">{t("app.demoShort")}</p>
        </div>
      </div>
      <p className="text-[0.9375rem] leading-relaxed text-ink-2 mb-5">{t("about.lead")}</p>
      <div className="grid gap-4">
        <Card title={t("about.whatTitle")}><p className="text-[0.8125rem] leading-relaxed text-ink-2">{t("about.what")}</p></Card>
        <Card title={t("about.dataTitle")}><p className="text-[0.8125rem] leading-relaxed text-ink-2">{t("about.data")}</p></Card>
        <Card title={t("about.tryTitle")} bodyClass="p-0">
          <ul className="divide-y divide-line-subtle">
            {TRY.map((x) => (
              <li key={x.key}>
                <Link to={x.to} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] hover:bg-surface-hover group">
                  <Icon name="chevron" className="w-4 h-4 text-brand" flipRtl />
                  <span className="flex-1 text-ink-2 group-hover:text-ink">{t(x.key)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("about.notTitle")}><p className="text-[0.8125rem] leading-relaxed text-ink-2">{t("about.not")}</p></Card>
      </div>
    </div>
  );
}
