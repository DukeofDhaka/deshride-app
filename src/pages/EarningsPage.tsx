import { Link } from "react-router-dom";
import { formatBDT } from "../lib/geo";
import { COMMISSION_RATE, driverEarnings, getProfile } from "../lib/store";
import { useTranslation } from "../i18n";

export function EarningsPage() {
  const { language, t } = useTranslation();
  const lang = language === "bn" ? "bn" : "en";
  const { held, releasing, paid, lines } = driverEarnings();
  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  const payout = getProfile().driver;

  return (
    <section className="page">
      <div className="search-banner">
        <h1>{t("earningsTitle")}</h1>
        <p>{t("earningsSubtitle", { pct: Math.round(COMMISSION_RATE * 100).toLocaleString(locale) })}</p>
      </div>

      <div className="money-tiles">
        <div className="money-tile">
          <span>{t("earnHeld")}</span>
          <strong>{formatBDT(held, lang)}</strong>
        </div>
        <div className="money-tile">
          <span>{t("earnReleasing")}</span>
          <strong>{formatBDT(releasing, lang)}</strong>
        </div>
        <div className="money-tile">
          <span>{t("earnPaid")}</span>
          <strong>{formatBDT(paid, lang)}</strong>
        </div>
      </div>

      <div className="detail-panel">
        <h2>{t("payoutTo")}</h2>
        <p className="detail-note">
          {payout?.payoutNumber
            ? t("payoutAccount", { method: payout.payoutMethod === "nagad" ? "Nagad" : "bKash", number: payout.payoutNumber })
            : t("payoutMissing")}{" "}
          <Link className="secondary-link" to="/driver-onboarding">
            {t("editPayout")}
          </Link>
        </p>
      </div>

      <div className="detail-panel">
        <h2>{t("perTrip")}</h2>
        {lines.length === 0 ? (
          <p className="detail-note">{t("noEarningsYet")}</p>
        ) : (
          <ul className="list-rows">
            {lines.map((l) => (
              <li key={l.booking.id}>
                <span>
                  <strong>
                    {l.ride.from.name} → {l.ride.to.name}
                  </strong>{" "}
                  · {new Date(l.ride.departure).toLocaleDateString(locale, { day: "numeric", month: "short" })} ·{" "}
                  {l.booking.guestName}
                  <br />
                  <span className="request-meta">
                    {t("earnLine", {
                      gross: formatBDT(l.gross, lang),
                      fee: formatBDT(l.commission, lang),
                      net: formatBDT(l.driverNet, lang)
                    })}
                  </span>
                </span>
                <span
                  className={`chip ${
                    l.booking.payStatus === "released" ? "chip--good" : l.booking.payStatus === "releasing" ? "chip--wait" : "chip--held"
                  }`}
                >
                  {l.booking.payStatus === "released"
                    ? t("paidToYou")
                    : l.booking.payStatus === "releasing"
                      ? t("paymentReleasing")
                      : t("heldByDeshRide")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
