import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PAYMENT_METHODS, getPaymentMethod, type PaymentMethodId } from "../data/paymentMethods";
import { estimateDuration, formatBDT, routeKm, segmentFare, stopTimes } from "../lib/geo";
import {
  containsContactInfo,
  getProfile,
  getRide,
  liveDriverRating,
  myBookingForRide,
  pendingRequests,
  requestBooking,
  routeIndices,
  saveProfile,
  seatsLeft
} from "../lib/store";
import { useTranslation } from "../i18n";
import { Icon, type IconName } from "../components/Icons";
import { RouteTimeline } from "../components/RouteTimeline";
import { TripSafety } from "../components/TripSafety";
import { localeFor, timeOf } from "../components/RideCard";
import { DriverProfileCard } from "../components/DriverProfileCard";
import { PayInAppNotice } from "../components/PayInAppNotice";

function formatDeparture(iso: string, language: string): string {
  return new Date(iso).toLocaleString(localeFor(language), {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const RULE_ICONS: Record<string, IconName> = {
  ruleNoSmoking: "nosmoke",
  ruleHighwayAc: "snow",
  ruleMusicOk: "music",
  ruleMaxThreeBack: "seat",
  ruleWomenFrontSeat: "women"
};

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
  const lang = language === "bn" ? "bn" : "en";
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const handleStateChange = () => setRefresh((n) => n + 1);
    window.addEventListener("deshride-state-change", handleStateChange);
    return () => window.removeEventListener("deshride-state-change", handleStateChange);
  }, []);
  const [seats, setSeats] = useState(1);
  const [payMethod, setPayMethod] = useState<PaymentMethodId>("bkash");
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showMsgWarning, setShowMsgWarning] = useState(false);

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

  const myBooking = myBookingForRide(ride.id);
  const isMine = ride.driver.id === profile.id && !myBooking;
  const left = seatsLeft(ride);
  const rating = liveDriverRating(ride);
  const route = [ride.from, ...(ride.stops ?? []), ride.to];
  const km = routeKm(route);
  const requests = isMine ? pendingRequests(ride.id) : [];
  void refresh;

  // A search for part of the route (e.g. Cumilla → Chattogram on a Dhaka →
  // Chattogram ride) books just that stretch at a proportional fare.
  const wanted = routeIndices(ride, params.get("from") ?? undefined, params.get("to") ?? undefined);
  const segment =
    wanted && (wanted.pickupIdx > 0 || wanted.dropoffIdx < route.length - 1) ? wanted : null;
  const farePerSeat = segment ? segmentFare(ride, segment.pickupIdx, segment.dropoffIdx) : ride.pricePerSeat;

  const times = stopTimes(ride);

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
    try {
      requestBooking(ride!.id, seats, payMethod, message, segment ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    setRefresh((n) => n + 1);
  }

  const showBookBar = !isMine && !myBooking && left > 0;
  const confirmed = myBooking?.status === "accepted";

  return (
    <section className={`page page--ride${showBookBar ? " page--with-bookbar" : ""}`}>
      {justPosted && (
        <div className="banner banner--good">
          {t("rideLive", { from: ride.from.district, to: ride.to.district })}
        </div>
      )}

      <div className="ride-head">
        <span className="section-kicker">{t("rideDetails")}</span>
        <h1>
          {ride.from.name} → {ride.to.name}
        </h1>
        <p className="hero__lead">
          {formatDeparture(ride.departure, language)} · {t("kmApprox", { km: km.toLocaleString(localeFor(language)) })} ·{" "}
          {estimateDuration(km, lang)}
        </p>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-panel">
            <h2>{t("pickupDropoff")}</h2>
            <RouteTimeline
              size="full"
              stops={route.map((spot, i) => ({
                time: timeOf(times[i], language),
                place: spot.name,
                note: spot.note || (i === 0 || i === route.length - 1 ? t("sharedAfterBooking") : undefined),
                badge:
                  segment && i === segment.pickupIdx
                    ? t("yourPickup")
                    : segment && i === segment.dropoffIdx
                      ? t("yourDropoff")
                      : undefined
              }))}
            />
          </div>

          <div className="facts-row">
            <div>
              <strong>{left.toLocaleString(localeFor(language))}</strong>
              <span>{t("seatsLeftShort")}</span>
            </div>
            <div>
              <strong>{rating ? `${rating.toFixed(1)}★` : t("newDriver")}</strong>
              <span>{t("tripsCount", { count: ride.driver.trips })}</span>
            </div>
            <div>
              <strong>{formatBDT(farePerSeat, lang)}</strong>
              <span>{segment ? t("yourSegment") : t("perSeat")}</span>
            </div>
          </div>

          <DriverProfileCard ride={ride} showPlate={confirmed} />

          {ride.note && (
            <p className="driver-quote">
              <strong>{ride.driver.name.split(" ")[0]}:</strong> “{ride.note}”
            </p>
          )}

          <div className="detail-panel">
            <h2>{t("tripRules")}</h2>
            <ul className="rule-list">
              <li>
                <Icon name="car" />
                {ride.car}
              </li>
              <li>
                <Icon name="bag" />
                {t("luggagePrefix")} {luggageLabel(ride.luggage, t)}
              </li>
              {ride.rules.map((rule) => (
                <li key={rule}>
                  <Icon name={RULE_ICONS[rule] ?? "tick"} />
                  {t(rule)}
                </li>
              ))}
            </ul>
            {ride.instantBook && (
              <p className="detail-note">
                <span className="chip chip--flash">
                  <Icon name="bolt" size={12} /> {t("instantBook")}
                </span>{" "}
                {t("instantBookHint")}
              </p>
            )}
          </div>
        </div>

        <aside className="detail-aside">
          {isMine ? (
            <div className="booking-card">
              <div>
                <span className="booking-card__label">{t("yourRide")}</span>
                <strong>{formatBDT(ride.pricePerSeat, lang)}</strong>
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
                <strong>{t("seatsCount", { count: myBooking.seats })}</strong>
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
                      : t("notAccepted")}
                </span>
              </p>
              <p>{t(getPaymentMethod(myBooking.payMethod).confirmationNoteKey)}</p>
              <PayInAppNotice />
              {confirmed && ride.status === "active" && (
                <Link className="primary-button primary-button--full" to={`/chat/${myBooking.id}`}>
                  {t("message")}
                </Link>
              )}
              {confirmed && ride.status === "active" && <TripSafety ride={ride} />}
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
            <form className="booking-card" id="book" onSubmit={handleRequest}>
              <div>
                <span className="booking-card__label">{t("requestSeats")}</span>
                <strong>{formatBDT(farePerSeat * seats, lang)}</strong>
              </div>
              {segment && (
                <p className="segment-note">
                  {t("segmentNote", {
                    from: route[segment.pickupIdx].name,
                    to: route[segment.dropoffIdx].name,
                    price: formatBDT(farePerSeat, lang)
                  })}
                </p>
              )}

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
                  {t("msgToDriver")}
                </label>
                <textarea
                  id="req-msg"
                  className="field__input field__input--area"
                  value={message}
                  placeholder={t("msgPlaceholder")}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMessage(val);
                    setShowMsgWarning(containsContactInfo(val));
                  }}
                />
                {showMsgWarning && <div className="banner banner--warn">{t("phoneWarning")}</div>}
              </div>

              <div className="pay-options" role="radiogroup" aria-label={t("paymentMethodLabel")}>
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

              <PayInAppNotice />
              <button className="cta-button cta-button--full" type="submit">
                {ride.instantBook && <Icon name="bolt" size={16} />}
                {ride.instantBook ? t("bookNow") : t("requestToBook")}
              </button>
              <p className="detail-note">{t("prototypePaymentNote")}</p>
            </form>
          )}
        </aside>
      </div>

      {showBookBar && (
        <div className="bookbar">
          <div>
            <strong>{formatBDT(farePerSeat * seats, lang)}</strong>
            <span>{t("seatsForPrice", { seats, method: getPaymentMethod(payMethod).label })}</span>
          </div>
          <button
            type="button"
            className="cta-button"
            onClick={() => {
              const form = document.getElementById("book");
              form?.scrollIntoView?.({ behavior: "smooth", block: "start" });
              form?.querySelector<HTMLElement>("select, input, textarea")?.focus({ preventScroll: true });
            }}
          >
            {t("bookSeat")}
          </button>
        </div>
      )}
    </section>
  );
}
