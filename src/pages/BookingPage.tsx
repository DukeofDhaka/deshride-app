import { useState } from "react";
import { Link, createSearchParams, useParams, useSearchParams } from "react-router-dom";
import { RouteMap } from "../components/RouteMap";
import { getPaymentMethod } from "../data/paymentMethods";
import { formatMoney, getCorridor, getRide } from "../data/deshrideData";

export function BookingPage() {
  const { rideId } = useParams();
  const [searchParams] = useSearchParams();
  const [shareLabel, setShareLabel] = useState("Share this trip");
  const ride = rideId ? getRide(rideId) : undefined;

  async function handleShare() {
    const shareUrl = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: "DeshRide trip confirmation",
        text: "Here is my DeshRide booking preview.",
        url: shareUrl
      });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setShareLabel("Link copied");
  }

  if (!ride) {
    return (
      <section className="page">
        <div className="empty-state">
          <h1>Booking not found</h1>
          <p>The selected booking is not available in the current prototype.</p>
        </div>
      </section>
    );
  }

  const corridor = getCorridor(ride.corridorId);
  const date = searchParams.get("date") || ride.date;
  const seats = searchParams.get("seats") || "1";
  const payment = getPaymentMethod(searchParams.get("pay"));

  return (
    <section className="page">
      <div className="confirmation-shell">
        <div className="confirmation-shell__copy">
          <p className="section-kicker">Reservation confirmed</p>
          <h1>Your seat is held in app.</h1>
          <p className="hero__lead">
            This is a simulated confirmation flow, but it is designed to feel like the moment a
            rider actually books an intercity seat on DeshRide.
          </p>

          <div className="confirmation-grid">
            <div className="confirmation-card">
              <span>Route</span>
              <strong>
                {corridor.pickupLabel} → {corridor.dropoffLabel}
              </strong>
            </div>
            <div className="confirmation-card">
              <span>Date</span>
              <strong>{date}</strong>
            </div>
            <div className="confirmation-card">
              <span>Seats</span>
              <strong>{seats}</strong>
            </div>
            <div className="confirmation-card">
              <span>Total</span>
              <strong>{formatMoney(ride.price * Number(seats))}</strong>
            </div>
            <div className="confirmation-card">
              <span>Payment</span>
              <strong>{payment.label}</strong>
            </div>
          </div>

          <div className="detail-panel">
            <h2>Payment</h2>
            <p className="detail-note">{payment.confirmationNote}</p>
          </div>

          <div className="detail-panel">
            <h2>Pickup instructions</h2>
            <ul className="panel-list">
              <li>Head to {ride.pickupPoint} and keep the app open for the last confirmation step.</li>
              <li>Your booking stays on-platform so support can step in if plans change.</li>
              <li>The driver only receives payout after the trip is completed.</li>
            </ul>
          </div>

          <div className="confirmation-actions">
            <button className="primary-button" type="button" onClick={handleShare}>
              {shareLabel}
            </button>
            <Link
              className="secondary-link secondary-link--button"
              to={{
                pathname: "/search",
                search: createSearchParams({
                  from: corridor.from,
                  to: corridor.to,
                  date,
                  seats
                }).toString()
              }}
            >
              See more rides
            </Link>
          </div>
        </div>

        <div className="confirmation-shell__visual">
          <RouteMap corridorId={corridor.id} compact />
        </div>
      </div>
    </section>
  );
}
