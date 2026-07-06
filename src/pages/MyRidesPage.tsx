import { useState } from "react";
import { Link } from "react-router-dom";
import { getPaymentMethod } from "../data/paymentMethods";
import { formatBDT } from "../lib/geo";
import {
  acceptedBookings,
  cancelMyBooking,
  cancelRide,
  completeRide,
  confirmReleaseAndRate,
  getRide,
  myBookings,
  myRides,
  pendingRequests,
  refundPolicy,
  seatsLeft,
  updateBookingStatus
} from "../lib/store";
import { useTranslation } from "../i18n";

function formatDeparture(iso: string, language: string): string {
  return new Date(iso).toLocaleString(language === "bn" ? "bn-BD" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function StarPicker({ onRate }: { onRate: (stars: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`stars__btn${hover >= n ? " stars__btn--lit" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onRate(n)}
          aria-label={`${n}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

function paymentLabel(methodId: string, t: (key: string) => string): string {
  const method = getPaymentMethod(methodId);
  return method.labelKey ? t(method.labelKey) : method.label;
}

export function MyRidesPage() {
  const { language, t } = useTranslation();
  const [, bump] = useState(0);
  const refresh = () => bump((n) => n + 1);
  const [error, setError] = useState<string | null>(null);

  const driving = myRides();
  const requested = myBookings();

  function handleDecision(bookingId: string, status: "accepted" | "declined") {
    const problem = updateBookingStatus(bookingId, status);
    setError(problem);
    refresh();
  }

  return (
    <section className="page">
      <div className="search-banner">
        <h1>{t("myRidesTitle")}</h1>
        <p>{t("myRidesSubtitle")}</p>
      </div>

      {error && <div className="banner banner--warn">{error}</div>}

      <div className="detail-panel">
        <h2>{t("drivingSection")}</h2>
        {driving.length === 0 && (
          <p className="detail-note">
            {t("noDriving")} <Link className="secondary-link" to="/post">{t("firstRideLink")}</Link>
          </p>
        )}
        <div className="stack">
          {driving.map((ride) => {
            const requests = pendingRequests(ride.id);
            const confirmed = acceptedBookings(ride.id);
            const heldTotal = confirmed
              .filter((b) => b.payStatus === "held")
              .reduce((sum, b) => sum + b.seats * ride.pricePerSeat, 0);
            const done = ride.status === "completed";
            return (
              <div key={ride.id} className="manage-card">
                <div className="manage-card__head">
                  <div>
                    <strong>
                      {ride.from.name} → {ride.to.name}
                    </strong>
                    <span>
                      {formatDeparture(ride.departure, language)} · {formatBDT(ride.pricePerSeat)}/seat ·{" "}
                      {done
                        ? t("tripDone")
                        : t("seatsEmpty", { left: seatsLeft(ride), total: ride.seatsTotal })}
                    </span>
                  </div>
                  <div className="manage-card__actions">
                    {done && <span className="chip chip--good">{t("paymentReleased")}</span>}
                    <Link className="secondary-link" to={`/ride/${ride.id}`}>
                      {t("view")}
                    </Link>
                    {!done && (
                      <button
                        type="button"
                        className="ghost-button ghost-button--danger"
                        onClick={() => {
                          cancelRide(ride.id);
                          refresh();
                        }}
                      >
                        {t("cancelRide")}
                      </button>
                    )}
                  </div>
                </div>

                {confirmed.length > 0 && (
                  <ul className="panel-list">
                    {confirmed.map((b) => (
                      <li key={b.id}>
                        ✓ {b.guestName}
                        {b.guestPhone && (
                          <>
                            {" "}
                            (<a className="secondary-link" href={`tel:${b.guestPhone}`}>{b.guestPhone}</a>)
                          </>
                        )}{" "}
                        — {t("seatsCount", { count: b.seats })} · {paymentLabel(b.payMethod, t)} ·{" "}
                        <span
                          className={`chip ${
                            b.payStatus === "released"
                              ? "chip--good"
                              : b.payStatus === "releasing"
                                ? "chip--wait"
                                : "chip--wait"
                          }`}
                        >
                          {b.payStatus === "released"
                            ? t("paidToYou")
                            : b.payStatus === "releasing"
                              ? t("paymentReleasing")
                              : t("heldByDeshRide")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {!done && heldTotal > 0 && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      completeRide(ride.id);
                      refresh();
                    }}
                  >
                    {t("completeTripRelease", { amount: formatBDT(heldTotal) })}
                  </button>
                )}

                {!done &&
                  (requests.length > 0 ? (
                    <div className="stack">
                      {requests.map((b) => (
                        <div key={b.id} className="request-row">
                          <span>
                            {t("wantsSeatsPay", {
                              name: b.guestName,
                              seats: b.seats,
                              method: paymentLabel(b.payMethod, t)
                            })}
                            {b.message && (
                              <em className="request-note">
                                {t('passengerNote')} “{b.message}”
                              </em>
                            )}
                          </span>
                          <span className="request-row__actions">
                            <button
                              type="button"
                              className="ghost-button ghost-button--good"
                              onClick={() => handleDecision(b.id, "accepted")}
                            >
                              {t("acceptEscrow")}
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => handleDecision(b.id, "declined")}
                            >
                              {t("decline")}
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="detail-note">{t("noPendingRequests")}</p>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="detail-panel">
        <h2>{t("ridingSection")}</h2>
        {requested.length === 0 && (
          <p className="detail-note">
            {t("noBookings")} <Link className="secondary-link" to="/">{t("findRideLink")}</Link>
          </p>
        )}
        <div className="stack">
          {requested.map((booking) => {
            const ride = getRide(booking.rideId);
            if (!ride) return null;
            const policy = refundPolicy(ride.departure);
            return (
              <div key={booking.id} className="manage-card">
                <div className="manage-card__head">
                  <div>
                    <strong>
                      {ride.from.name} → {ride.to.name}
                    </strong>
                    <span>
                      {formatDeparture(ride.departure, language)} · {t("seatsCount", { count: booking.seats })} · {formatBDT(ride.pricePerSeat * booking.seats)}
                      {booking.payStatus === "held" && t("fareHeld")}
                      {booking.payStatus === "releasing" && t("fareReleasing")}
                      {booking.payStatus === "released" && t("fareReleased")}
                      {booking.payStatus === "refunded" &&
                        t("refunded", { pct: booking.refundPct === 50 ? "50% " : "" })}
                    </span>
                    {booking.status === "accepted" && ride.driver.phone && (
                      <span>
                        {t("driverPrefix")} {ride.driver.name} ·{" "}
                        <a className="secondary-link" href={`tel:${ride.driver.phone}`}>
                          {ride.driver.phone}
                        </a>
                      </span>
                    )}
                  </div>
                  <span
                    className={`chip ${
                      booking.status === "accepted"
                        ? "chip--good"
                        : booking.status === "pending"
                          ? "chip--wait"
                          : "chip--muted"
                    }`}
                  >
                    {booking.status === "pending"
                      ? t("waitingForDriver")
                      : booking.status === "accepted"
                        ? t("confirmed")
                        : t("notAccepted")}
                  </span>
                </div>
                <div className="manage-card__actions">
                  <Link className="secondary-link" to={`/ride/${ride.id}`}>
                    {t("viewRide")}
                  </Link>
                  {booking.payStatus === "releasing" && (
                    <span className="rate-release">
                      <span className="detail-note">{t('confirmAndRate')}</span>
                      <StarPicker
                        onRate={(stars) => {
                          confirmReleaseAndRate(booking.id, stars);
                          refresh();
                        }}
                      />
                    </span>
                  )}
                  {(booking.status === "pending" ||
                    (booking.status === "accepted" && booking.payStatus === "held")) && (
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      title={booking.payStatus === "held" ? t(policy.labelKey) : undefined}
                      onClick={() => {
                        cancelMyBooking(booking.id);
                        refresh();
                      }}
                    >
                      {t("cancelRequest")}
                      {booking.payStatus === "held" ? ` (${t(policy.labelKey)})` : ""}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
