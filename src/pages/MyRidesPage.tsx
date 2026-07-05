import { useState } from "react";
import { Link } from "react-router-dom";
import { formatBDT } from "../lib/geo";
import {
  acceptedBookings,
  cancelMyBooking,
  cancelRide,
  completeRide,
  confirmRelease,
  getRide,
  myBookings,
  myRides,
  pendingRequests,
  refundPolicy,
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
                        ✓ {b.guestName}
                        {b.guestPhone && (
                          <>
                            {" "}
                            (<a className="secondary-link" href={`tel:${b.guestPhone}`}>{b.guestPhone}</a>)
                          </>
                        )}{" "}
                        — {b.seats} seat{b.seats > 1 ? "s" : ""} · paid by {b.payMethod} ·{" "}
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
                            ? "Paid out to you"
                            : b.payStatus === "releasing"
                              ? "Releasing — rider confirms or auto in 24h"
                              : "Held by DeshRide"}
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
                    Mark trip completed — start releasing {formatBDT(heldTotal)}
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
            const policy = refundPolicy(ride.departure);
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
                      {booking.payStatus === "releasing" && " · trip done — fare releasing to driver"}
                      {booking.payStatus === "released" && " · fare paid to driver"}
                      {booking.payStatus === "refunded" &&
                        ` · ${booking.refundPct === 50 ? "50% " : ""}refunded to you`}
                    </span>
                    {booking.status === "accepted" && ride.driver.phone && (
                      <span>
                        Driver: {ride.driver.name} ·{" "}
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
                  {booking.payStatus === "releasing" && (
                    <button
                      type="button"
                      className="ghost-button ghost-button--good"
                      onClick={() => {
                        confirmRelease(booking.id);
                        refresh();
                      }}
                    >
                      Confirm ride went well — release now
                    </button>
                  )}
                  {(booking.status === "pending" ||
                    (booking.status === "accepted" && booking.payStatus === "held")) && (
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      title={booking.payStatus === "held" ? policy.label : undefined}
                      onClick={() => {
                        cancelMyBooking(booking.id);
                        refresh();
                      }}
                    >
                      Cancel request
                      {booking.payStatus === "held" ? ` (${policy.label.toLowerCase()})` : ""}
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
