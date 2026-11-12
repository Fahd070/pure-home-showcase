import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { Card, EmptyState } from "../ui/primitives";

export function NotFound() {
  const { t } = useI18n();
  return (
    <Card>
      <EmptyState icon="search">
        <p className="text-base font-semibold text-ink mb-1">404</p>
        <Link to="/" className="text-brand hover:underline">{t("nav.overview")}</Link>
      </EmptyState>
    </Card>
  );
}
