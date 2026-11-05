import { Link, Navigate, useParams } from "react-router-dom";
import { getPaymentMethod } from "../data/paymentMethods";
import { formatBDT } from "../lib/geo";
import { bookingFare, getBooking, getProfile, getRide } from "../lib/store";
import { useTranslation } from "../i18n";
import { PayInAppNotice } from "../components/PayInAppNotice";

// What the rider paid, where the money sits now, and what came back.
export function ReceiptPage() {
  const { bookingId } = useParams();
  const { language, t } = useTranslation();
  const lang = language === "bn" ? "bn" : "en";
  const booking = bookingId ? getBooking(bookingId) : undefined;
  const ride = booking ? getRide(booking.rideId) : undefined;
  const me = getProfile().id;
  if (!booking || !ride || (booking.guestId !== me && ride.driver.id !== me)) {
    return <Navigate to="/rides" replace />;
  }

  const fare = bookingFare(booking, ride);
  const total = fare * booking.seats;
  const refundPct = booking.payStatus === "refunded" ? booking.refundPct ?? 100 : 0;
  const refund = Math.round((total * refundPct) / 100);
  const route = [ride.from, ...(ride.stops ?? []), ride.to];
  const from = booking.pickupIdx !== undefined ? route[booking.pickupIdx] : ride.from;
  const to = booking.dropoffIdx !== undefined ? route[booking.dropoffIdx] : ride.to;
  const method = getPaymentMethod(booking.payMethod);
  const locale = lang === "bn" ? "bn-BD" : "en-GB";

  const steps: { key: string; done: boolean }[] = [
    { key: "stepHeld", done: ["held", "releasing", "released", "refunded"].includes(booking.payStatus) },
    { key: "stepTripDone", done: ["releasing", "released"].includes(booking.payStatus) || ride.status === "completed" },
    {
      key: booking.payStatus === "refunded" ? "stepRefunded" : "stepReleased",
      done: booking.payStatus === "released" || booking.payStatus === "refunded"
    }
  ];

  return (
    <section className="page">
      <div className="search-banner">
        <h1>{t("receiptTitle")}</h1>
        <p>
          {t("bookingRef")} <span className="mono">{booking.id.toUpperCase()}</span>
        </p>
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-panel">
            <h2>
              {from.name} → {to.name}
            </h2>
            <p className="detail-note">
              {new Date(ride.departure).toLocaleString(locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
              })}{" "}
              · {t("driverPrefix")} {ride.driver.name} · {ride.car}
            </p>
            <dl className="price-breakdown">
              <dt>{t("fareLine", { price: formatBDT(fare, lang), seats: booking.seats })}</dt>
              <dd>{formatBDT(total, lang)}</dd>
              <dt>{t("bookingFeeLine")}</dt>
              <dd>{formatBDT(0, lang)}</dd>
              <dt className="total">{t("totalPaid", { method: method.labelKey ? t(method.labelKey) : method.label })}</dt>
              <dd className="total">{formatBDT(total, lang)}</dd>
              {refund > 0 && (
                <>
                  <dt>{t("refundLine", { pct: refundPct })}</dt>
                  <dd>−{formatBDT(refund, lang)}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
        <aside className="detail-aside">
          <div className="detail-panel">
            <h2>{t("whereMoneyIs")}</h2>
            <ol className="status-steps">
              {steps.map((s) => (
                <li key={s.key} className={s.done ? "done" : ""}>
                  {t(s.key)}
                </li>
              ))}
            </ol>
            {booking.noShow === "driver" && <p className="detail-note">{t("driverNoShowRefund")}</p>}
            <PayInAppNotice />
            <Link className="secondary-link" to="/rides">
              {t("viewInMyRides")}
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
