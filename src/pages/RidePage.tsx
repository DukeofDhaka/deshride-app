import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BDMap } from "../components/BDMap";
import { PAYMENT_METHODS, getPaymentMethod, type PaymentMethodId } from "../data/paymentMethods";
import { estimateDuration, formatBDT, roadKm } from "../lib/geo";
import {
  getProfile,
  getRide,
  myBookingForRide,
  pendingRequests,
  requestBooking,
  saveProfile,
  seatsLeft
} from "../lib/store";

function formatDeparture(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function RidePage() {
  const { rideId } = useParams();
  const [params] = useSearchParams();
  const justPosted = params.get("posted") === "1";

  const [refresh, setRefresh] = useState(0);
  const [seats, setSeats] = useState(1);
  const [payMethod, setPayMethod] = useState<PaymentMethodId>("bkash");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ride = rideId ? getRide(rideId) : undefined;
  const profile = getProfile();

  if (!ride) {
    return (
      <section className="page">
        <div className="empty-state">
          <h1>Ride not found</h1>
          <p>This ride may have been cancelled or removed.</p>
          <Link className="primary-button" to="/">
            Back to search
          </Link>
        </div>
      </section>
    );
  }

  const isMine = ride.driver.id === profile.id;
  const left = seatsLeft(ride);
  const km = roadKm(ride.from, ride.to);
  const myBooking = myBookingForRide(ride.id);
  const requests = isMine ? pendingRequests(ride.id) : [];
  void refresh;

  function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!profile.name && !guestName.trim()) {
      setError("Add your name so the driver knows who is asking.");
      return;
    }
    if (seats > left) {
      setError("Not that many seats left on this ride.");
      return;
    }
    if (!profile.name && guestName.trim()) {
      saveProfile({ ...profile, name: guestName.trim() });
    }
    requestBooking(ride!.id, seats, payMethod);
    setRefresh((n) => n + 1);
  }

  return (
    <section className="page">
      {justPosted && (
        <div className="banner banner--good">
          Your ride is live. Travellers searching {ride.from.district} →{" "}
          {ride.to.district} will find it now.
        </div>
      )}

      <div className="detail-hero">
        <div>
          <p className="section-kicker">Ride details</p>
          <h1>
            {ride.from.name} → {ride.to.name}
          </h1>
          <p className="hero__lead">
            {formatDeparture(ride.departure)} · ~{km} km · {estimateDuration(km)}
          </p>
        </div>
        <div className="detail-hero__stats">
          <div>
            <strong>{left}</strong>
            <span>Seats left</span>
          </div>
          <div>
            <strong>{ride.driver.rating ? `${ride.driver.rating.toFixed(1)}★` : "New"}</strong>
            <span>Driver rating</span>
          </div>
          <div>
            <strong>{formatBDT(ride.pricePerSeat)}</strong>
            <span>Per seat</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <BDMap from={ride.from} to={ride.to} />

          <div className="detail-panel">
            <h2>Pickup and drop-off</h2>
            <ul className="panel-list">
              <li>
                <strong>Pickup — {ride.from.name}:</strong>{" "}
                {ride.from.note || "Exact point shared after booking."}
              </li>
              <li>
                <strong>Drop-off — {ride.to.name}:</strong>{" "}
                {ride.to.note || "Exact point shared after booking."}
              </li>
            </ul>
          </div>

          <div className="detail-panel">
            <h2>Trip rules</h2>
            <ul className="panel-list">
              <li>Car: {ride.car}</li>
              <li>Luggage: {ride.luggage}</li>
              {ride.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            {ride.note && <p className="detail-note">{ride.note}</p>}
          </div>
        </div>

        <aside className="detail-aside">
          <div className="driver-card">
            <div className="avatar avatar--large" style={{ backgroundColor: ride.driver.accent }}>
              {ride.driver.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <h2>{ride.driver.name}</h2>
            <p>
              {ride.driver.rating
                ? `${ride.driver.rating.toFixed(1)}★ · ${ride.driver.trips} trips`
                : "New driver on DeshRide"}
            </p>
          </div>

          {isMine ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">Your ride</span>
                <strong>{formatBDT(ride.pricePerSeat)}</strong>
              </div>
              <p>
                {requests.length > 0
                  ? `${requests.length} pending request${requests.length > 1 ? "s" : ""} waiting for you.`
                  : "No requests yet. Share the route with people travelling that day."}
              </p>
              <Link className="primary-button primary-button--full" to="/rides">
                Manage requests
              </Link>
            </div>
          ) : myBooking ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">Your request</span>
                <strong>
                  {myBooking.seats} seat{myBooking.seats > 1 ? "s" : ""}
                </strong>
              </div>
              <p>
                Status:{" "}
                <span
                  className={`chip ${
                    myBooking.status === "accepted"
                      ? "chip--good"
                      : myBooking.status === "pending"
                        ? "chip--wait"
                        : "chip--muted"
                  }`}
                >
                  {myBooking.status === "pending"
                    ? "Waiting for driver"
                    : myBooking.status === "accepted"
                      ? "Confirmed — you're in"
                      : myBooking.status}
                </span>
              </p>
              <p>{getPaymentMethod(myBooking.payMethod).confirmationNote}</p>
              <Link className="secondary-link secondary-link--button" to="/rides">
                View in My rides
              </Link>
            </div>
          ) : left === 0 ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">Ride full</span>
                <strong>0 seats</strong>
              </div>
              <p>All seats are taken. Check the same route on other dates.</p>
            </div>
          ) : (
            <form className="booking-card" onSubmit={handleRequest}>
              <div>
                <span className="booking-card__label">Request seats</span>
                <strong>{formatBDT(ride.pricePerSeat * seats)}</strong>
              </div>

              {!profile.name && (
                <div className="field">
                  <label className="field__label" htmlFor="guest-name">
                    Your name
                  </label>
                  <input
                    id="guest-name"
                    className="field__input"
                    value={guestName}
                    placeholder="So the driver knows who's asking"
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor="req-seats">
                  Seats
                </label>
                <select
                  id="req-seats"
                  className="field__input"
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                >
                  {Array.from({ length: left }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

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

              {error && <p className="form-error">{error}</p>}

              <button className="primary-button primary-button--full" type="submit">
                Request to book
              </button>
              <p className="detail-note">
                Nothing is charged until the driver accepts. DeshRide then holds your
                fare and only pays the driver after the trip completes.
              </p>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
