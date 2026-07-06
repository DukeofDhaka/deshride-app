import { useState } from "react";
import { Link } from "react-router-dom";
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

function formatDeparture(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
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

export function MyRidesPage() {
  const { t } = useTranslation();
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
        <h1>আমার রাইড</h1>
        <p>আপনি যা চালাচ্ছেন আর যেখানে যাচ্ছেন — সব এক জায়গায়।</p>
      </div>

      {error && <div className="banner banner--warn">{error}</div>}

      <div className="detail-panel">
        <h2>আপনি চালাচ্ছেন</h2>
        {driving.length === 0 && (
          <p className="detail-note">
            এখনো কোনো রাইড পোস্ট করেননি। <Link className="secondary-link" to="/post">প্রথম রাইডটি দিন →</Link>
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
                        ? "ট্রিপ শেষ"
                        : `${seatsLeft(ride)}/${ride.seatsTotal} সিট খালি`}
                    </span>
                  </div>
                  <div className="manage-card__actions">
                    {done && <span className="chip chip--good">পেমেন্ট রিলিজড</span>}
                    <Link className="secondary-link" to={`/ride/${ride.id}`}>
                      দেখুন
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
                        রাইড বাতিল
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
                        — {b.seats}টি সিট · {b.payMethod} ·{" "}
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
                            ? "আপনাকে পরিশোধ করা হয়েছে"
                            : b.payStatus === "releasing"
                              ? "রিলিজ হচ্ছে — যাত্রী কনফার্ম বা ২৪ ঘণ্টায় অটো"
                              : "দেশরাইডের কাছে জমা"}
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
                    ট্রিপ শেষ — {formatBDT(heldTotal)} রিলিজ শুরু করুন
                  </button>
                )}

                {!done &&
                  (requests.length > 0 ? (
                    <div className="stack">
                      {requests.map((b) => (
                        <div key={b.id} className="request-row">
                          <span>
                            <strong>{b.guestName}</strong> চান {b.seats}টি সিট ·
                            {" "}{b.payMethod}-এ দেবেন
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
                              গ্রহণ করুন — ভাড়া এসক্রোতে যাবে
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => handleDecision(b.id, "declined")}
                            >
                              না
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="detail-note">এই মুহূর্তে কোনো রিকোয়েস্ট নেই।</p>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="detail-panel">
        <h2>আপনি যাচ্ছেন</h2>
        {requested.length === 0 && (
          <p className="detail-note">
            এখনো কোনো রিকোয়েস্ট করেননি। <Link className="secondary-link" to="/">রাইড খুঁজুন →</Link>
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
                      {formatDeparture(ride.departure)} · {booking.seats}টি সিট · {formatBDT(ride.pricePerSeat * booking.seats)}
                      {booking.payStatus === "held" && " · ভাড়া দেশরাইডের কাছে জমা"}
                      {booking.payStatus === "releasing" && " · ট্রিপ শেষ — ভাড়া রিলিজ হচ্ছে"}
                      {booking.payStatus === "released" && " · ভাড়া ড্রাইভারকে দেওয়া হয়েছে"}
                      {booking.payStatus === "refunded" &&
                        ` · ${booking.refundPct === 50 ? "৫০% " : ""}ফেরত পেয়েছেন`}
                    </span>
                    {booking.status === "accepted" && ride.driver.phone && (
                      <span>
                        ড্রাইভার: {ride.driver.name} ·{" "}
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
                      ? "ড্রাইভারের অপেক্ষায়"
                      : booking.status === "accepted"
                        ? "কনফার্মড"
                        : "হয়নি"}
                  </span>
                </div>
                <div className="manage-card__actions">
                  <Link className="secondary-link" to={`/ride/${ride.id}`}>
                    রাইড দেখুন
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
                      title={booking.payStatus === "held" ? policy.label : undefined}
                      onClick={() => {
                        cancelMyBooking(booking.id);
                        refresh();
                      }}
                    >
                      রিকোয়েস্ট বাতিল
                      {booking.payStatus === "held" ? ` (${policy.label})` : ""}
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
