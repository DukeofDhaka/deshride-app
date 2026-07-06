import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LuggageSize, Spot } from "../types";
import { LocationPicker } from "../components/LocationPicker";
import { busFareEstimate, estimateDuration, formatBDT, roadKm, suggestedFare } from "../lib/geo";
import { createRide, getProfile, saveProfile, saveRideDraft } from "../lib/store";
import { useTranslation } from "../i18n";

const RULE_OPTIONS = [
  "ruleNoSmoking",
  "ruleHighwayAc",
  "ruleMusicOk",
  "ruleMaxThreeBack",
  "ruleWomenFrontSeat"
];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function PostRidePage() {
  const navigate = useNavigate();
  const profile = getProfile();
  const { t } = useTranslation();

  const [from, setFrom] = useState<Spot | null>(null);
  const [to, setTo] = useState<Spot | null>(null);
  const [stops, setStops] = useState<(Spot | null)[]>([]);
  const [withReturn, setWithReturn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("16:00");
  const [date, setDate] = useState(tomorrow());
  const [time, setTime] = useState("07:30");
  const [seatsTotal, setSeatsTotal] = useState(3);
  const [price, setPrice] = useState<number | "">("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [car, setCar] = useState("");
  const [luggage, setLuggage] = useState<LuggageSize>("medium");
  const [rules, setRules] = useState<string[]>(["ruleNoSmoking"]);
  const [note, setNote] = useState("");
  const [driverName, setDriverName] = useState(profile.name);
  const [error, setError] = useState<string | null>(null);

  const km = from && to ? roadKm(from, to) : null;
  const fare = useMemo(() => (km ? suggestedFare(km) : null), [km]);
  const effectivePrice = priceTouched && price !== "" ? Number(price) : (fare?.mid ?? "");

  function toggleRule(rule: string) {
    setRules((current) =>
      current.includes(rule) ? current.filter((r) => r !== rule) : [...current, rule]
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!from || !to) {
      setError(t("errorPickBoth"));
      return;
    }
    if (from.district === to.district && Math.abs(from.lat - to.lat) < 0.05 && Math.abs(from.lng - to.lng) < 0.05) {
      setError(t("errorSamePlace"));
      return;
    }
    if (!driverName.trim()) {
      setError(t("errorDriverName"));
      return;
    }
    if (!effectivePrice || Number(effectivePrice) <= 0) {
      setError(t("errorFare"));
      return;
    }
    if (!car.trim()) {
      setError(t("errorCar"));
      return;
    }

    if (driverName.trim() !== profile.name) {
      saveProfile({ ...profile, name: driverName.trim() });
    }

    const departure = new Date(`${date}T${time}:00`).toISOString();
    const cleanStops = stops.filter((s): s is Spot => Boolean(s));
    const rideInput = {
      from,
      to,
      stops: cleanStops.length > 0 ? cleanStops : undefined,
      departure,
      seatsTotal,
      pricePerSeat: Number(effectivePrice),
      car: car.trim(),
      luggage,
      rules,
      note: note.trim() || undefined
    };

    // First-time drivers finish their driver profile before the ride goes live.
    if (!profile.driver) {
      saveRideDraft(rideInput);
      navigate("/driver-onboarding");
      return;
    }

    const ride = createRide(rideInput);
    if (withReturn && returnDate) {
      createRide({
        ...rideInput,
        from: to,
        to: from,
        stops: cleanStops.length > 0 ? [...cleanStops].reverse() : undefined,
        departure: new Date(`${returnDate}T${returnTime}:00`).toISOString()
      });
    }
    navigate(`/ride/${ride.id}?posted=1`);
  }

  return (
    <section className="page">
      <div className="search-banner">
        <h1>{t("postRideTitle")}</h1>
        <p>{t("postRideSubtitle")}</p>
      </div>

      <div className="post-grid">
        <form className="post-form" onSubmit={handleSubmit}>
          <LocationPicker
            label={t("pickup")}
            value={from}
            onChange={setFrom}
            withNote
            notePlaceholder={t("pickupNotePlaceholder")}
          />
          <LocationPicker
            label={t("dropoff")}
            value={to}
            onChange={setTo}
            withNote
            notePlaceholder={t("dropoffNotePlaceholder")}
          />

          <div className="field">
            <span className="field__label">{t('stopovers')}</span>
            {stops.map((stop, i) => (
              <div key={i} className="stop-row">
                <LocationPicker
                  label={`${i + 1}.`}
                  value={stop}
                  onChange={(s) => setStops((cur) => cur.map((c, j) => (j === i ? s : c)))}
                />
                <button
                  type="button"
                  className="ghost-button ghost-button--danger"
                  onClick={() => setStops((cur) => cur.filter((_, j) => j !== i))}
                >
                  {t('removeStop')}
                </button>
              </div>
            ))}
            {stops.length < 3 && (
              <button
                type="button"
                className="pill pill--toggle"
                onClick={() => setStops((cur) => [...cur, null])}
              >
                {t('addStop')}
              </button>
            )}
            <p className="field__hint">{t('stopHint')}</p>
          </div>

          <div className="search-card__row">
            <div className="field">
              <label className="field__label" htmlFor="post-date">
                {t("dateOfJourney")}
              </label>
              <input
                id="post-date"
                className="field__input"
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="post-time">
                {t("departureTime")}
              </label>
              <input
                id="post-time"
                className="field__input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="search-card__row">
            <div className="field">
              <label className="field__label" htmlFor="post-seats">
                {t("seatCount")}
              </label>
              <select
                id="post-seats"
                className="field__input"
                value={seatsTotal}
                onChange={(e) => setSeatsTotal(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="post-price">
                {t("pricePerSeatTaka")}
              </label>
              <input
                id="post-price"
                className="field__input"
                type="number"
                min={1}
                step={1}
                value={effectivePrice}
                onChange={(e) => {
                  setPriceTouched(true);
                  setPrice(e.target.value === "" ? "" : Number(e.target.value));
                }}
              />
            </div>
          </div>

          {fare && km && (
            <p className="field__hint">
              {t("fareSuggestion", {
                km,
                duration: estimateDuration(km),
                busFare: formatBDT(busFareEstimate(km)),
                low: formatBDT(fare.low),
                high: formatBDT(fare.high)
              })}
            </p>
          )}

          <div className="field">
            <label className="field__label" htmlFor="post-car">
              {t("car")}
            </label>
            <input
              id="post-car"
              className="field__input"
              value={car}
              placeholder={t("carPlaceholder")}
              onChange={(e) => setCar(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="post-luggage">
              {t("luggage")}
            </label>
            <select
              id="post-luggage"
              className="field__input"
              value={luggage}
              onChange={(e) => setLuggage(e.target.value as LuggageSize)}
            >
              <option value="small">{t("luggageSmall")}</option>
              <option value="medium">{t("luggageMedium")}</option>
              <option value="large">{t("luggageLarge")}</option>
            </select>
          </div>

          <div className="field">
            <span className="field__label">{t("rideRules")}</span>
            <div className="rule-grid">
              {RULE_OPTIONS.map((rule) => (
                <button
                  key={rule}
                  type="button"
                  className={`pill pill--toggle${rules.includes(rule) ? " pill--active" : ""}`}
                  aria-pressed={rules.includes(rule)}
                  onClick={() => toggleRule(rule)}
                >
                  {t(rule)}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="post-note">
              {t("noteOptional")}
            </label>
            <textarea
              id="post-note"
              className="field__input field__input--area"
              value={note}
              placeholder={t("rideNotePlaceholder")}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {!profile.name && (
            <div className="field">
              <label className="field__label" htmlFor="post-name">
                {t("yourName")}
              </label>
              <input
                id="post-name"
                className="field__input"
                value={driverName}
                placeholder={t("shownOnRide")}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
          )}

          <label className="check-row">
            <input
              type="checkbox"
              checked={withReturn}
              onChange={(e) => setWithReturn(e.target.checked)}
            />
            <span>{t('returnTripLabel')}</span>
          </label>

          {withReturn && (
            <div className="search-card__row">
              <div className="field">
                <label className="field__label" htmlFor="post-return-date">
                  {t('returnDate')}
                </label>
                <input
                  id="post-return-date"
                  className="field__input"
                  type="date"
                  value={returnDate}
                  min={date}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="post-return-time">
                  {t('returnTime')}
                </label>
                <input
                  id="post-return-time"
                  className="field__input"
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button primary-button--full" type="submit">
            {t("postRideSubmit")}
          </button>
        </form>
      </div>
    </section>
  );
}
