import { useState } from "react";
import { Link } from "react-router-dom";
import { formatBDT } from "../lib/geo";
import {
  acceptedBookings,
  cancelRide,
  completeRide,
  getRide,
  myBookings,
  myRides,
  pendingRequests,
  seatsLeft,
  updateBookingStatus
} from "../lib/store";

function formatDeparture(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function MyRidesPage() {
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
        <h1>My rides</h1>
        <p>Everything you're driving and everything you've requested, in one place.</p>
      </div>

      {error && <div className="banner banner--warn">{error}</div>}

      <div className="detail-panel">
        <h2>You're driving</h2>
        {driving.length === 0 && (
          <p className="detail-note">
            No posted rides yet. <Link className="secondary-link" to="/post">Post your first ride →</Link>
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
                      {formatDeparture(ride.departure)} · {formatBDT(ride.pricePerSeat)}/seat ·{" "}
                      {done
                        ? "trip completed"
                        : `${seatsLeft(ride)}/${ride.seatsTotal} seats open`}
                    </span>
                  </div>
                  <div className="manage-card__actions">
                    {done && <span className="chip chip--good">Payments released</span>}
                    <Link className="secondary-link" to={`/ride/${ride.id}`}>
                      View
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
                        Cancel ride
                      </button>
                    )}
                  </div>
                </div>

                {confirmed.length > 0 && (
                  <ul className="panel-list">
                    {confirmed.map((b) => (
                      <li key={b.id}>
                        ✓ {b.guestName} — {b.seats} seat{b.seats > 1 ? "s" : ""} · paid by{" "}
                        {b.payMethod} ·{" "}
                        <span
                          className={`chip ${b.payStatus === "released" ? "chip--good" : "chip--wait"}`}
                        >
                          {b.payStatus === "released" ? "Paid out to you" : "Held by DeshRide"}
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
                    Mark trip completed — release {formatBDT(heldTotal)}
                  </button>
                )}

                {!done &&
                  (requests.length > 0 ? (
                    <div className="stack">
                      {requests.map((b) => (
                        <div key={b.id} className="request-row">
                          <span>
                            <strong>{b.guestName}</strong> wants {b.seats} seat
                            {b.seats > 1 ? "s" : ""} · pays by {b.payMethod}
                          </span>
                          <span className="request-row__actions">
                            <button
                              type="button"
                              className="ghost-button ghost-button--good"
                              onClick={() => handleDecision(b.id, "accepted")}
                            >
                              Accept — fare goes into escrow
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => handleDecision(b.id, "declined")}
                            >
                              Decline
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="detail-note">No pending requests right now.</p>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="detail-panel">
        <h2>You're travelling</h2>
        {requested.length === 0 && (
          <p className="detail-note">
            No seat requests yet. <Link className="secondary-link" to="/">Find a ride →</Link>
          </p>
        )}
        <div className="stack">
          {requested.map((booking) => {
            const ride = getRide(booking.rideId);
            if (!ride) return null;
            return (
              <div key={booking.id} className="manage-card">
                <div className="manage-card__head">
                  <div>
                    <strong>
                      {ride.from.name} → {ride.to.name}
                    </strong>
                    <span>
                      {formatDeparture(ride.departure)} · {booking.seats} seat
                      {booking.seats > 1 ? "s" : ""} · {formatBDT(ride.pricePerSeat * booking.seats)}
                      {booking.payStatus === "held" && " · fare held by DeshRide until the trip ends"}
                      {booking.payStatus === "released" && " · fare paid to driver"}
                      {booking.payStatus === "refunded" && " · fare refunded to you"}
                    </span>
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
                      ? "Waiting for driver"
                      : booking.status === "accepted"
                        ? "Confirmed"
                        : "Declined"}
                  </span>
                </div>
                <div className="manage-card__actions">
                  <Link className="secondary-link" to={`/ride/${ride.id}`}>
                    View ride
                  </Link>
                  {(booking.status === "pending" || booking.status === "accepted") && (
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      onClick={() => {
                        updateBookingStatus(booking.id, "cancelled");
                        refresh();
                      }}
                    >
                      Cancel request
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
