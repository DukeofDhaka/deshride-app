import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
          <h1>রাইডটি পাওয়া গেল না</h1>
          <p>রাইডটি বাতিল বা সরিয়ে ফেলা হয়ে থাকতে পারে।</p>
          <Link className="primary-button" to="/">
            খোঁজায় ফিরে যান
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
      setError("আপনার নামটি লিখুন — ড্রাইভার জানবেন কে যাচ্ছেন।");
      return;
    }
    if (seats > left) {
      setError("এতগুলো সিট বাকি নেই।");
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
          আপনার রাইড লাইভ! {ride.from.district} → {ride.to.district} খুঁজলেই যাত্রীরা এটি পাবে।
        </div>
      )}

      <div className="detail-hero">
        <div>
          <p className="section-kicker">রাইডের বিস্তারিত</p>
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
            <span>সিট বাকি</span>
          </div>
          <div>
            <strong>{ride.driver.rating ? `${ride.driver.rating.toFixed(1)}★` : "নতুন"}</strong>
            <span>ড্রাইভার রেটিং</span>
          </div>
          <div>
            <strong>{formatBDT(ride.pricePerSeat)}</strong>
            <span>প্রতি সিট</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-panel">
            <h2>পিকআপ ও ড্রপ-অফ</h2>
            <ul className="panel-list">
              <li>
                <strong>পিকআপ — {ride.from.name}:</strong>{" "}
                {ride.from.note || "বুকিংয়ের পর জানানো হবে।"}
              </li>
              <li>
                <strong>ড্রপ-অফ — {ride.to.name}:</strong>{" "}
                {ride.to.note || "বুকিংয়ের পর জানানো হবে।"}
              </li>
            </ul>
          </div>

          <div className="detail-panel">
            <h2>রাইডের নিয়ম</h2>
            <ul className="panel-list">
              <li>গাড়ি: {ride.car}</li>
              <li>লাগেজ: {ride.luggage}</li>
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
                ? `${ride.driver.rating.toFixed(1)}★ · ${ride.driver.trips}টি ট্রিপ`
                : "দেশরাইডে নতুন ড্রাইভার"}
            </p>
          </div>

          {isMine ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">আপনার রাইড</span>
                <strong>{formatBDT(ride.pricePerSeat)}</strong>
              </div>
              <p>
                {requests.length > 0
                  ? `${requests.length}টি রিকোয়েস্ট আপনার অপেক্ষায়।`
                  : "এখনো রিকোয়েস্ট আসেনি। রুটটি শেয়ার করুন।"}
              </p>
              <Link className="primary-button primary-button--full" to="/rides">
                রিকোয়েস্ট দেখুন
              </Link>
            </div>
          ) : myBooking ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">আপনার রিকোয়েস্ট</span>
                <strong>
                  {myBooking.seats}টি সিট
                </strong>
              </div>
              <p>
                অবস্থা:{" "}
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
                    ? "ড্রাইভারের অপেক্ষায়"
                    : myBooking.status === "accepted"
                      ? "কনফার্মড — আপনি যাচ্ছেন!"
                      : myBooking.status}
                </span>
              </p>
              <p>{getPaymentMethod(myBooking.payMethod).confirmationNote}</p>
              {myBooking.status === "accepted" && ride.driver.phone && (
                <p>
                  {ride.driver.name}-কে কল করুন:{" "}
                  <a className="secondary-link" href={`tel:${ride.driver.phone}`}>
                    {ride.driver.phone}
                  </a>
                </p>
              )}
              <Link className="secondary-link secondary-link--button" to="/rides">
                আমার রাইডে দেখুন
              </Link>
            </div>
          ) : left === 0 ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">রাইড ফুল</span>
                <strong>০ সিট</strong>
              </div>
              <p>সব সিট বুকড। অন্য তারিখে একই রুট দেখুন।</p>
            </div>
          ) : (
            <form className="booking-card" onSubmit={handleRequest}>
              <div>
                <span className="booking-card__label">সিট রিকোয়েস্ট করুন</span>
                <strong>{formatBDT(ride.pricePerSeat * seats)}</strong>
              </div>

              {!profile.name && (
                <div className="field">
                  <label className="field__label" htmlFor="guest-name">
                    আপনার নাম
                  </label>
                  <input
                    id="guest-name"
                    className="field__input"
                    value={guestName}
                    placeholder="ড্রাইভার জানবেন কে যাচ্ছেন"
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor="req-seats">
                  সিট
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
                বুকিং রিকোয়েস্ট পাঠান
              </button>
              <p className="detail-note">
                ড্রাইভার গ্রহণ করার আগে কোনো টাকা কাটা হবে না। এরপর ভাড়াটি দেশরাইডের
                কাছে জমা থাকবে — ট্রিপ শেষ হলেই ড্রাইভার পাবেন।
              </p>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
