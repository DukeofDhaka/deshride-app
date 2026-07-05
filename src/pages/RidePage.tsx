import { useState } from "react";
import { Link, createSearchParams, useParams, useSearchParams } from "react-router-dom";
import { RouteMap } from "../components/RouteMap";
import { PAYMENT_METHODS, type PaymentMethodId } from "../data/paymentMethods";
import { formatMoney, getCorridor, getDriver, getRide } from "../data/deshrideData";

export function RidePage() {
  const { rideId } = useParams();
  const [searchParams] = useSearchParams();
  const [payMethod, setPayMethod] = useState<PaymentMethodId>("bkash");
  const ride = rideId ? getRide(rideId) : undefined;

  if (!ride) {
    return (
      <section className="page">
        <div className="empty-state">
          <h1>Ride not found</h1>
          <p>The selected ride is not available in the current prototype.</p>
        </div>
      </section>
    );
  }

  const corridor = getCorridor(ride.corridorId);
  const driver = getDriver(ride.driverId);
  const seats = searchParams.get("seats") || "1";
  const date = searchParams.get("date") || ride.date;

  return (
    <section className="page">
      <div className="detail-hero">
        <div>
          <Link
            className="back-link"
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
            ← Back to rides
          </Link>
          <p className="section-kicker">Ride details</p>
          <h1>
            {ride.departureTime} to {ride.arrivalTime}
          </h1>
          <p className="hero__lead">
            {corridor.pickupLabel} to {corridor.dropoffLabel} · {corridor.duration} ·{" "}
            {formatMoney(ride.price)}
          </p>
        </div>

        <div className="detail-hero__stats">
          <div>
            <strong>{ride.seatsLeft}</strong>
            <span>Seats left</span>
          </div>
          <div>
            <strong>{driver.rating.toFixed(1)}★</strong>
            <span>Driver rating</span>
          </div>
          <div>
            <strong>{driver.verifiedTrips}</strong>
            <span>Verified trips</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <RouteMap corridorId={corridor.id} compact />

          <div className="detail-panel">
            <h2>Trip timeline</h2>
            <ol className="timeline">
              <li>
                <strong>Meet at {ride.pickupPoint}</strong>
                <span>Arrive 10 minutes before departure so the driver can confirm everyone smoothly.</span>
              </li>
              <li>
                <strong>Ride with live support if plans change</strong>
                <span>DeshRide keeps the booking in app and makes it easier to step in when needed.</span>
              </li>
              <li>
                <strong>Driver is paid after the trip is completed</strong>
                <span>This keeps the flow fair for both sides and leaves room for post-trip issues to be handled.</span>
              </li>
            </ol>
          </div>

          <div className="detail-panel">
            <h2>Trip rules</h2>
            <ul className="panel-list">
              {ride.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <p className="detail-note">{ride.bookingNote}</p>
          </div>
        </div>

        <aside className="detail-aside">
          <div className="driver-card">
            <div className="avatar avatar--large" style={{ backgroundColor: driver.accent }}>
              {driver.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <h2>{driver.name}</h2>
            <p>
              {driver.age} · {driver.vehicle} · {driver.vehicleColor}
            </p>
            <p>{driver.bio}</p>
            <div className="driver-card__badges">
              {driver.badges.map((badge) => (
                <span key={badge} className="pill">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="booking-card">
            <div>
              <span className="booking-card__label">Book this seat</span>
              <strong>{formatMoney(ride.price)}</strong>
            </div>
            <p>
              Pickup: {ride.pickupPoint}
              <br />
              Dropoff: {ride.dropoffPoint}
              <br />
              Vehicle: {ride.vehicle}
            </p>
            <div className="pay-options" role="radiogroup" aria-label="Payment method">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  role="radio"
                  aria-checked={payMethod === method.id}
                  className={`pay-option${payMethod === method.id ? " pay-option--active" : ""}`}
                  onClick={() => setPayMethod(method.id)}
                >
                  <strong>{method.label}</strong>
                  <span>{method.hint}</span>
                </button>
              ))}
            </div>
            <Link
              className="primary-button primary-button--full"
              to={{
                pathname: `/book/${ride.id}`,
                search: createSearchParams({
                  date,
                  seats,
                  pay: payMethod
                }).toString()
              }}
            >
              Book seat
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
