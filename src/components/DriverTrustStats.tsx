import { reliability, responseStats } from "../lib/store";
import { useTranslation } from "../i18n";

// Response rate and cancellation history, the two numbers that tell a rider
// whether a booking with this person is likely to actually happen.
export function DriverTrustStats({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const { t } = useTranslation();
  const resp = responseStats(userId);
  const rel = reliability(userId);
  const parts: string[] = [];
  if (resp.total > 0) parts.push(t("responseRate", { pct: Math.round(resp.rate * 100) }));
  if (rel.trips > 0) parts.push(t("cancelledOf", { n: rel.cancelled, total: rel.trips }));
  if (rel.noShows > 0) parts.push(t("noShowsCount", { n: rel.noShows }));
  if (parts.length === 0) return compact ? null : <p className="trust-stats">{t("noHistoryYet")}</p>;
  return <p className={`trust-stats${compact ? " trust-stats--compact" : ""}`}>{parts.join(" · ")}</p>;
}
