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
import { useTranslation } from "../i18n";

function localeFor(language: string): string {
  return language === "bn" ? "bn-BD" : "en-GB";
}

function formatDeparture(iso: string, language: string): string {
  return new Date(iso).toLocaleString(localeFor(language), {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function luggageLabel(luggage: string, t: (key: string) => string): string {
  const keyByValue: Record<string, string> = {
    small: "luggageValueSmall",
    medium: "luggageValueMedium",
    large: "luggageValueLarge"
  };
  const key = keyByValue[luggage];
  return key ? t(key) : luggage;
}

export function RidePage() {
  const { rideId } = useParams();
  const [params] = useSearchParams();
  const justPosted = params.get("posted") === "1";

  const { language, t } = useTranslation();
  const [refresh, setRefresh] = useState(0);
  const [seats, setSeats] = useState(1);
  const [payMethod, setPayMethod] = useState<PaymentMethodId>("bkash");
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ride = rideId ? getRide(rideId) : undefined;
  const profile = getProfile();

  if (!ride) {
    return (
      <section className="page">
        <div className="empty-state">
          <h1>{t("rideNotFound")}</h1>
          <p>{t("rideNotFoundBody")}</p>
          <Link className="primary-button" to="/">
            {t("backToSearch")}
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
      setError(t("errorGuestName"));
      return;
    }
    if (seats > left) {
      setError(t("errorSeatsLeft"));
      return;
    }
    if (!profile.name && guestName.trim()) {
      saveProfile({ ...profile, name: guestName.trim() });
    }
    requestBooking(ride!.id, seats, payMethod, message);
    setRefresh((n) => n + 1);
  }

  return (
    <section className="page">
      {justPosted && (
        <div className="banner banner--good">
          {t("rideLive", { from: ride.from.district, to: ride.to.district })}
        </div>
      )}

      <div className="detail-hero">
        <div>
          <p className="section-kicker">{t("rideDetails")}</p>
          <h1>
            {ride.from.name} → {ride.to.name}
          </h1>
          <p className="hero__lead">
            {formatDeparture(ride.departure, language)} · ~{km} km · {estimateDuration(km)}
            {ride.stops && ride.stops.length > 0 && (
              <> · {t('via')} {ride.stops.map((s) => s.name).join(" → ")}</>
            )}
          </p>
          {ride.instantBook && (
            <p>
              <span className="chip chip--flash">{t('instantBook')}</span>{" "}
              <span className="detail-note">{t('instantBookHint')}</span>
            </p>
          )}
        </div>
        <div className="detail-hero__stats">
          <div>
            <strong>{left}</strong>
            <span>{t("seatsLeft")}</span>
          </div>
          <div>
            <strong>{ride.driver.rating ? `${ride.driver.rating.toFixed(1)}★` : t("newDriver")}</strong>
            <span>{t("driverRating")}</span>
          </div>
          <div>
            <strong>{formatBDT(ride.pricePerSeat)}</strong>
            <span>{t("perSeat")}</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-panel">
            <h2>{t("pickupDropoff")}</h2>
            <ul className="panel-list">
              <li>
                <strong>{t("pickupDash", { place: ride.from.name })}</strong>{" "}
                {ride.from.note || t("sharedAfterBooking")}
              </li>
              <li>
                <strong>{t("dropoffDash", { place: ride.to.name })}</strong>{" "}
                {ride.to.note || t("sharedAfterBooking")}
              </li>
            </ul>
          </div>

          <div className="detail-panel">
            <h2>{t("tripRules")}</h2>
            <ul className="panel-list">
              <li>{t("carPrefix")} {ride.car}</li>
              <li>{t("luggagePrefix")} {luggageLabel(ride.luggage, t)}</li>
              {ride.rules.map((rule) => (
                <li key={rule}>{t(rule)}</li>
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
                ? `${ride.driver.rating.toFixed(1)}★ · ${t("tripsCount", { count: ride.driver.trips })}`
                : t("newDriverOnDeshRide")}
            </p>
          </div>

          {isMine ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">{t("yourRide")}</span>
                <strong>{formatBDT(ride.pricePerSeat)}</strong>
              </div>
              <p>
                {requests.length > 0
                  ? t("pendingRequestsWaiting", { count: requests.length })
                  : t("noRequestsYet")}
              </p>
              <Link className="primary-button primary-button--full" to="/rides">
                {t("manageRequests")}
              </Link>
            </div>
          ) : myBooking ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">{t("yourRequest")}</span>
                <strong>
                  {t("seatsCount", { count: myBooking.seats })}
                </strong>
              </div>
              <p>
                {t("status")}{" "}
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
                    ? t("waitingForDriver")
                    : myBooking.status === "accepted"
                      ? t("confirmedYouIn")
                      : myBooking.status}
                </span>
              </p>
              <p>{t(getPaymentMethod(myBooking.payMethod).confirmationNoteKey)}</p>
              {myBooking.status === "accepted" && ride.driver.phone && (
                <p>
                  {t("callDriver", { name: ride.driver.name })}{" "}
                  <a className="secondary-link" href={`tel:${ride.driver.phone}`}>
                    {ride.driver.phone}
                  </a>
                </p>
              )}
              <Link className="secondary-link secondary-link--button" to="/rides">
                {t("viewInMyRides")}
              </Link>
            </div>
          ) : left === 0 ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">{t("rideFull")}</span>
                <strong>{t("zeroSeats")}</strong>
              </div>
              <p>{t("allSeatsTaken")}</p>
            </div>
          ) : (
            <form className="booking-card" onSubmit={handleRequest}>
              <div>
                <span className="booking-card__label">{t("requestSeats")}</span>
                <strong>{formatBDT(ride.pricePerSeat * seats)}</strong>
              </div>

              {!profile.name && (
                <div className="field">
                  <label className="field__label" htmlFor="guest-name">
                    {t("yourName")}
                  </label>
                  <input
                    id="guest-name"
                    className="field__input"
                    value={guestName}
                    placeholder={t("guestNamePlaceholder")}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor="req-seats">
                  {t("seats")}
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

              <div className="field">
                <label className="field__label" htmlFor="req-msg">
                  {t('msgToDriver')}
                </label>
                <textarea
                  id="req-msg"
                  className="field__input field__input--area"
                  value={message}
                  placeholder={t('msgPlaceholder')}
                  onChange={(e) => setMessage(e.target.value)}
                />
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
                    <strong>{method.labelKey ? t(method.labelKey) : method.label}</strong>
                    <span>{t(method.hintKey)}</span>
                  </button>
                ))}
              </div>

              {error && <p className="form-error">{error}</p>}

              <button className="primary-button primary-button--full" type="submit">
                {ride.instantBook ? t('bookNow') : t('requestToBook')}
              </button>
              <p className="detail-note">
                {t("prototypePaymentNote")}
              </p>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
