import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import type { Booking, Ride } from "../types";
import { getPaymentMethod } from "../data/paymentMethods";
import { formatBDT } from "../lib/geo";
import {
  acceptedBookings,
  bookingFare,
  cancelMyBooking,
  cancelRide,
  cancelRideSeries,
  closeRideRequest,
  completeRide,
  confirmReleaseAndRate,
  getProfile,
  getRide,
  myBookings,
  myRideRequests,
  myRides,
  passengerRating,
  pendingRequests,
  ratePassenger,
  refundPolicy,
  reportNoShow,
  seatsLeft,
  updateBookingStatus,
  useStoreValue
} from "../lib/store";
import { useTranslation } from "../i18n";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icons";
import { ReportButton } from "../components/ReportDialog";
import { DriverTrustStats } from "../components/DriverTrustStats";
import { PayInAppNotice } from "../components/PayInAppNotice";

function formatDeparture(iso: string, language: string): string {
  return new Date(iso).toLocaleString(language === "bn" ? "bn-BD" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
}

function StarPicker({ onRate }: { onRate: (stars: number) => void }) {
  const [hover, setHover] = useState(0);
  const { t } = useTranslation();
  return (
    <span className="stars" role="radiogroup" aria-label={t("ratingLabel")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`stars__btn${hover >= n ? " stars__btn--lit" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onRate(n)}
          aria-label={t("starsLabel", { n })}
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

function segmentLabel(b: Booking, ride: Ride): string | null {
  if (b.pickupIdx === undefined || b.dropoffIdx === undefined) return null;
  const route = [ride.from, ...(ride.stops ?? []), ride.to];
  return `${route[b.pickupIdx]?.name} → ${route[b.dropoffIdx]?.name}`;
}

// Time left on an unanswered request: "11h 59m" / "১১ ঘ. ৫৯ মি.".
function useTimeLeft() {
  const { language } = useTranslation();
  return (iso?: string) => {
    if (!iso) return null;
    const mins = Math.max(0, Math.floor((Date.parse(iso) - Date.now()) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (language === "bn") {
      const bn = (n: number) => n.toLocaleString("bn-BD");
      return h > 0 ? `${bn(h)} ঘ. ${bn(m)} মি.` : `${bn(m)} মি.`;
    }
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };
}

function GuestRating({ guestId }: { guestId: string }) {
  const { t } = useTranslation();
  const r = passengerRating(guestId);
  return (
    <span className="chip chip--muted">
      {r.avg ? `${r.avg.toFixed(1)}★ · ${r.count}` : t("newPassenger")}
    </span>
  );
}

function DrivingRide({
  ride,
  onError
}: {
  ride: Ride;
  onError: (msg: string | null) => void;
}) {
  const { language, t } = useTranslation();
  const lang = language === "bn" ? "bn" : "en";
  const timeLeft = useTimeLeft();
  const requests = pendingRequests(ride.id);
  const confirmed = acceptedBookings(ride.id);
  const heldTotal = confirmed
    .filter((b) => b.payStatus === "held")
    .reduce((sum, b) => sum + b.seats * bookingFare(b, ride), 0);
  const done = ride.status === "completed";
  const departed = Date.now() >= Date.parse(ride.departure);

  return (
    <div className="manage-card">
      <div className="manage-card__head">
        <div>
          <strong>
            {ride.from.name} → {ride.to.name}
          </strong>
          <span>
            {formatDeparture(ride.departure, language)} · {formatBDT(ride.pricePerSeat, lang)}
            {t("perSeatShort")} ·{" "}
            {done ? t("tripDone") : t("seatsEmpty", { left: seatsLeft(ride), total: ride.seatsTotal })}
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
              }}
            >
              {t("cancelRide")}
            </button>
          )}
        </div>
      </div>

      {confirmed.map((b) => {
        const seg = segmentLabel(b, ride);
        return (
          <div key={b.id} className="guest-row">
            <span className="guest-row__who">
              <Avatar name={b.guestName} size="sm" accent="#476a8a" />
              <strong>✓ {b.guestName}</strong>
              <GuestRating guestId={b.guestId} />
              <span className="request-meta">
                {t("seatsCount", { count: b.seats })} · {paymentLabel(b.payMethod, t)}
                {seg && ` · ${seg}`}
              </span>
              <span
                className={`chip ${
                  b.noShow ? "chip--danger" : b.payStatus === "released" ? "chip--good" : b.payStatus === "releasing" ? "chip--wait" : "chip--held"
                }`}
              >
                {b.noShow === "guest"
                  ? t("noShowGuestChip")
                  : b.noShow === "driver"
                    ? t("refundedChip")
                    : b.payStatus === "released"
                      ? t("paidToYou")
                      : b.payStatus === "releasing"
                        ? t("paymentReleasing")
                        : b.payStatus === "refunded"
                          ? t("refundedChip")
                          : t("heldByDeshRide")}
              </span>
            </span>
            <span className="manage-card__actions">
              {!done && ride.status === "active" && (
                <Link className="primary-button" to={`/chat/${b.id}`}>
                  {t("message")}
                </Link>
              )}
              {departed && !b.noShow && b.payStatus === "held" && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onError(reportNoShow(b.id, "guest"))}
                >
                  {t("guestNoShow")}
                </button>
              )}
              {done && !b.noShow && !b.driverRating && (
                <span className="rate-release">
                  <span className="detail-note">{t("ratePassenger", { name: b.guestName })}</span>
                  <StarPicker onRate={(stars) => onError(ratePassenger(b.id, stars))} />
                </span>
              )}
              {b.driverRating && <span className="chip chip--muted">{t("youRated", { stars: b.driverRating })}</span>}
              <ReportButton targetId={b.guestId} targetName={b.guestName} bookingId={b.id} compact />
            </span>
          </div>
        );
      })}

      {!done && heldTotal > 0 && (
        <button type="button" className="primary-button" onClick={() => completeRide(ride.id)}>
          {t("completeTripRelease", { amount: formatBDT(heldTotal, lang) })}
        </button>
      )}

      {!done &&
        (requests.length > 0 ? (
          <div className="stack">
            {requests.map((b) => {
              const seg = segmentLabel(b, ride);
              return (
                <div key={b.id} className="request-row">
                  <span>
                    <span>
                      {t("wantsSeatsPay", {
                        name: b.guestName,
                        seats: b.seats,
                        method: paymentLabel(b.payMethod, t)
                      })}{" "}
                      <GuestRating guestId={b.guestId} />
                    </span>
                    {seg && (
                      <span className="request-meta">
                        {seg} · {formatBDT(bookingFare(b, ride), lang)}
                        {t("perSeatShort")}
                      </span>
                    )}
                    <DriverTrustStats userId={b.guestId} compact />
                    {b.message && (
                      <em className="request-note">
                        {t("passengerNote")} “{b.message}”
                      </em>
                    )}
                    <span className="request-meta">
                      <Icon name="clock" size={13} /> {t("expiresIn", { left: timeLeft(b.expiresAt) ?? "" })}
                    </span>
                    <PayInAppNotice compact />
                  </span>
                  <span className="request-row__actions">
                    <button
                      type="button"
                      className="ghost-button ghost-button--good"
                      onClick={() => onError(updateBookingStatus(b.id, "accepted"))}
                    >
                      {t("accept")}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onError(updateBookingStatus(b.id, "declined"))}
                    >
                      {t("decline")}
                    </button>
                    <ReportButton targetId={b.guestId} targetName={b.guestName} bookingId={b.id} compact />
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="detail-note">{t("noPendingRequests")}</p>
        ))}
    </div>
  );
}

export function MyRidesPage() {
  const { language, t } = useTranslation();
  const lang = language === "bn" ? "bn" : "en";
  const [error, setError] = useState<string | null>(null);
  // Re-render whenever rides, bookings or requests change.
  useStoreValue(
    () =>
      `${localStorage.getItem("deshride.bookings.v1")}|${localStorage.getItem("deshride.rides.v1")}|${localStorage.getItem("deshride.ride-requests.v1")}|${localStorage.getItem("deshride.guest-ratings.v1")}`
  );
  const timeLeft = useTimeLeft();
  // Store writes from elsewhere (another tab, a sweep) repaint immediately.
  const [, bump] = useState(0);
  useEffect(() => {
    const onChange = () => flushSync(() => bump((n) => n + 1));
    window.addEventListener("deshride-state-change", onChange);
    return () => window.removeEventListener("deshride-state-change", onChange);
  }, []);

  const me = getProfile().id;
  const driving = myRides();
  const requested = myBookings().filter((b) => getRide(b.rideId)?.driver.id !== me);
  const seatRequests = myRideRequests();

  // Group rides posted as a repeating series under one heading.
  const singles = driving.filter((r) => !r.seriesId);
  const series = new Map<string, Ride[]>();
  for (const r of driving) {
    if (r.seriesId) series.set(r.seriesId, [...(series.get(r.seriesId) ?? []), r]);
  }

  return (
    <section className="page">
      <div className="search-banner">
        <h1>{t("myRidesTitle")}</h1>
        <p>{t("myRidesSubtitle")}</p>
      </div>

      {error && <div className="banner banner--warn">{error}</div>}

      <div className="detail-panel">
        <div className="series-head">
          <h2>{t("drivingSection")}</h2>
          {driving.length > 0 && (
            <Link className="secondary-link" to="/earnings">
              <Icon name="coins" size={16} /> {t("earningsLink")}
            </Link>
          )}
        </div>
        {driving.length === 0 && (
          <p className="detail-note">
            {t("noDriving")} <Link className="secondary-link" to="/post">{t("firstRideLink")}</Link>
          </p>
        )}
        <div className="stack">
          {[...series.entries()].map(([id, rides]) => (
            <div key={id} className="stack">
              <div className="series-head">
                <h3>
                  <Icon name="repeat" size={16} /> {t("seriesTitle", { count: rides.length })}
                </h3>
                {rides.some((r) => r.status === "active" && Date.parse(r.departure) > Date.now()) && (
                  <button
                    type="button"
                    className="ghost-button ghost-button--danger"
                    onClick={() => cancelRideSeries(id)}
                  >
                    {t("cancelSeries")}
                  </button>
                )}
              </div>
              {rides.map((ride) => (
                <DrivingRide key={ride.id} ride={ride} onError={setError} />
              ))}
            </div>
          ))}
          {singles.map((ride) => (
            <DrivingRide key={ride.id} ride={ride} onError={setError} />
          ))}
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
            const fare = bookingFare(booking, ride);
            const departed = Date.now() >= Date.parse(ride.departure);
            const seg = segmentLabel(booking, ride);
            const hasMoney = ["held", "releasing", "released", "refunded"].includes(booking.payStatus);
            return (
              <div key={booking.id} className="manage-card">
                <div className="manage-card__head">
                  <div>
                    <strong>{seg ?? `${ride.from.name} → ${ride.to.name}`}</strong>
                    <span>
                      {formatDeparture(ride.departure, language)} · {t("seatsCount", { count: booking.seats })} ·{" "}
                      {formatBDT(fare * booking.seats, lang)}
                      {booking.payStatus === "held" && t("fareHeld")}
                      {booking.payStatus === "releasing" && t("fareReleasing")}
                      {booking.payStatus === "released" && t("fareReleased")}
                      {booking.payStatus === "refunded" &&
                        t("refunded", { pct: booking.refundPct && booking.refundPct < 100 ? `${booking.refundPct}% ` : "" })}
                    </span>
                    {booking.status === "accepted" && (
                      <span>
                        {t("driverPrefix")} {ride.driver.name}
                      </span>
                    )}
                    {booking.status === "pending" && booking.expiresAt && (
                      <span className="request-meta">
                        <Icon name="clock" size={13} /> {t("driverHasUntil", { left: timeLeft(booking.expiresAt) ?? "" })}
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
                        : booking.status === "expired"
                          ? t("expiredChip")
                          : t("notAccepted")}
                  </span>
                </div>
                <div className="manage-card__actions">
                  <Link className="secondary-link" to={`/ride/${ride.id}`}>
                    {t("viewRide")}
                  </Link>
                  {hasMoney && (
                    <Link className="secondary-link" to={`/receipt/${booking.id}`}>
                      <Icon name="receipt" size={15} /> {t("receipt")}
                    </Link>
                  )}
                  {booking.payStatus === "releasing" && !booking.noShow && (
                    <span className="rate-release">
                      <span className="detail-note">{t("confirmAndRate")}</span>
                      <StarPicker onRate={(stars) => confirmReleaseAndRate(booking.id, stars)} />
                    </span>
                  )}
                  {ride.status === "active" && booking.status === "accepted" && (
                    <Link className="primary-button" to={`/chat/${booking.id}`}>
                      {t("message")}
                    </Link>
                  )}
                  {booking.status === "accepted" &&
                    departed &&
                    !booking.noShow &&
                    (booking.payStatus === "held" || booking.payStatus === "releasing") && (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setError(reportNoShow(booking.id, "driver"))}
                      >
                        {t("driverNoShow")}
                      </button>
                    )}
                  {(booking.status === "pending" ||
                    (booking.status === "accepted" && booking.payStatus === "held" && !departed)) && (
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      title={booking.payStatus === "held" ? t(policy.labelKey) : undefined}
                      onClick={() => {
                        cancelMyBooking(booking.id);
                      }}
                    >
                      {t("cancelRequest")}
                      {booking.payStatus === "held" ? ` (${t(policy.labelKey)})` : ""}
                    </button>
                  )}
                  {booking.status === "expired" && (
                    <Link className="secondary-link" to={`/results?from=${encodeURIComponent(ride.from.district)}&to=${encodeURIComponent(ride.to.district)}`}>
                      {t("findAnotherRide")}
                    </Link>
                  )}
                  <ReportButton targetId={ride.driver.id} targetName={ride.driver.name} bookingId={booking.id} compact />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {seatRequests.length > 0 && (
        <div className="detail-panel">
          <h2>{t("mySeatRequests")}</h2>
          <div className="stack">
            {seatRequests.map((req) => (
              <div key={req.id} className="manage-card">
                <div className="manage-card__head">
                  <div>
                    <strong>
                      {req.from.name} → {req.to.name}
                    </strong>
                    <span>
                      {new Date(`${req.date}T12:00:00`).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short"
                      })}{" "}
                      · {t("seatsCount", { count: req.seats })}
                    </span>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => closeRideRequest(req.id)}>
                    {t("closeRequest")}
                  </button>
                </div>
                {req.offers.length === 0 ? (
                  <p className="detail-note">{t("noOffersYet")}</p>
                ) : (
                  <ul className="list-rows">
                    {req.offers.map((o) => {
                      const r = getRide(o.rideId);
                      if (!r) return null;
                      return (
                        <li key={o.rideId}>
                          <span>
                            <strong>{r.driver.name}</strong> · {formatDeparture(r.departure, language)} ·{" "}
                            {formatBDT(r.pricePerSeat, lang)}
                          </span>
                          <Link
                            className="primary-button"
                            to={`/ride/${r.id}?from=${encodeURIComponent(req.from.district)}&to=${encodeURIComponent(req.to.district)}`}
                          >
                            {t("viewOffer")}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
