import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DISTRICTS } from "../data/gazetteer";
import type { LuggageSize, Spot } from "../types";
import { LocationPicker } from "../components/LocationPicker";
import { busFareEstimate, estimateDuration, formatBDT, roadKm, suggestedFare } from "../lib/geo";
import {
  INSTANT_BOOK_SEATS,
  MAX_SERIES_DATES,
  containsContactInfo,
  createRide,
  createRideSeries,
  getProfile,
  getStats,
  instantBookUnlocked,
  saveProfile,
  saveRideDraft,
  weeklyDates
} from "../lib/store";
import { useTranslation } from "../i18n";
import { todayKey, tomorrowKey } from "../lib/time";

const RULE_OPTIONS = [
  "ruleNoSmoking",
  "ruleHighwayAc",
  "ruleMusicOk",
  "ruleMaxThreeBack",
  "ruleWomenFrontSeat"
];


export function PostRidePage() {
  const navigate = useNavigate();
  const profile = getProfile();
  const { language, t } = useTranslation();

  // A driver answering a seat request arrives with the route pre-filled.
  const [params] = useSearchParams();
  const districtSpot = (name: string | null): Spot | null => {
    const d = name ? DISTRICTS.find((p) => p.name === name) : undefined;
    return d ? { name: d.name, district: d.name, lat: d.lat, lng: d.lng } : null;
  };
  const [from, setFrom] = useState<Spot | null>(() => districtSpot(params.get("from")));
  const [to, setTo] = useState<Spot | null>(() => districtSpot(params.get("to")));
  const [repeat, setRepeat] = useState<"none" | "weekly" | "dates">("none");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [extraDraft, setExtraDraft] = useState("");
  const [stops, setStops] = useState<(Spot | null)[]>([]);
  const [withReturn, setWithReturn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("16:00");
  const [date, setDate] = useState(params.get("date") ?? tomorrowKey());
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
  const [showWarning, setShowWarning] = useState(false);

  const hasInstantBookUnlock = instantBookUnlocked();
  const [instantBook, setInstantBook] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const returnDateRef = useRef<HTMLInputElement>(null);

  const km = from && to ? roadKm(from, to) : null;
  const fare = useMemo(() => (km ? suggestedFare(km) : null), [km]);
  const effectivePrice = priceTouched && price !== "" ? Number(price) : (fare?.mid ?? "");

  // All the dates this post will create (one, or a repeating series).
  const seriesDates = useMemo(() => {
    if (repeat === "weekly" && repeatUntil && weekdays.length > 0) {
      return weeklyDates(date, repeatUntil, weekdays);
    }
    if (repeat === "dates") {
      return [...new Set([date, ...extraDates])].sort().slice(0, MAX_SERIES_DATES);
    }
    return [date];
  }, [repeat, repeatUntil, weekdays, date, extraDates]);

  function shortDate(key: string) {
    return new Date(`${key}T12:00:00`).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  }

  function toggleRule(rule: string) {
    setRules((current) =>
      current.includes(rule) ? current.filter((r) => r !== rule) : [...current, rule]
    );
  }

  function openCalendar(ref: React.RefObject<HTMLInputElement>) {
    const input = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    try {
      input?.showPicker?.();
    } catch {
      // The native date input still opens on direct tap in restricted contexts.
    }
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
    if (Date.parse(`${date}T${time}:00`) <= Date.now()) {
      setError(t("errorPastTime"));
      return;
    }

    if (repeat !== "none" && seriesDates.length < 2) {
      setError(t("errorSeriesDates"));
      return;
    }
    if (driverName.trim() !== profile.name) {
      saveProfile({ ...profile, name: driverName.trim() });
    }
    const series = seriesDates.length > 1 ? seriesDates : undefined;

    // First-time drivers finish their driver profile before the ride goes live.
    if (!profile.driver) {
      const cleanStops = stops.filter((s): s is Spot => Boolean(s));
      const departure = new Date(`${date}T${time}:00`).toISOString();
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
        note: note.trim() || undefined,
        instantBook
      };
      saveRideDraft({ ...rideInput, seriesDates: series });
      navigate("/driver-onboarding");
      return;
    }

    const departure = new Date(`${date}T${time}:00`).toISOString();
    const cleanStops = stops.filter((s): s is Spot => Boolean(s));
    const rideInput = {
      from: from!,
      to: to!,
      stops: cleanStops.length > 0 ? cleanStops : undefined,
      departure,
      seatsTotal,
      pricePerSeat: Number(effectivePrice),
      car: car.trim(),
      luggage,
      rules,
      note: note.trim() || undefined,
      instantBook
    };

    if (series) {
      createRideSeries(rideInput, series);
      navigate("/rides");
      return;
    }

    const ride = createRide(rideInput);
    if (withReturn && returnDate) {
      createRide({
        ...rideInput,
        from: to!,
        to: from!,
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
                ref={dateRef}
                className="field__input"
                type="date"
                value={date}
                min={todayKey()}
                onClick={() => openCalendar(dateRef)}
                onFocus={() => openCalendar(dateRef)}
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
              onChange={(e) => {
                const val = e.target.value;
                setNote(val);
                setShowWarning(containsContactInfo(val));
              }}
            />
            {showWarning && (
              <div className="banner banner--warn" style={{ marginTop: "8px" }}>
                {t("phoneWarning")}
              </div>
            )}
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

          <label className="check-row" style={{ alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={instantBook}
              disabled={!hasInstantBookUnlock}
              onChange={(e) => setInstantBook(e.target.checked)}
              style={{ marginTop: '3px' }}
            />
            <div>
              <span>{t("instantBook")}</span>
              <p className="field__hint" style={{ margin: 0 }}>
                {t("instantBookHint")}
                {!hasInstantBookUnlock && (
                  <>
                    {" "}{t("instantProgress")}: {getStats().seatsFilled}/{INSTANT_BOOK_SEATS}
                  </>
                )}
              </p>
            </div>
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={withReturn}
              onChange={(e) => setWithReturn(e.target.checked)}
            />
            <span>{t('returnTripLabel')}</span>
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={repeat !== "none"}
              onChange={(e) => setRepeat(e.target.checked ? "weekly" : "none")}
            />
            <span>{t("repeatRide")}</span>
          </label>

          {repeat !== "none" && (
            <div className="repeat-box">
              <div className="seg-control" role="radiogroup" aria-label={t("repeatRide")}>
                {(["weekly", "dates"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={repeat === mode}
                    className={`pill pill--toggle${repeat === mode ? " pill--active" : ""}`}
                    onClick={() => setRepeat(mode)}
                  >
                    {t(mode === "weekly" ? "repeatWeekly" : "repeatPickDates")}
                  </button>
                ))}
              </div>
              {repeat === "weekly" ? (
                <>
                  <div className="date-chips" role="group" aria-label={t("repeatOnDays")}>
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                      const label = new Date(2026, 0, 4 + d).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", { weekday: "short" });
                      const on = weekdays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          className={`pill pill--toggle${on ? " pill--active" : ""}`}
                          onClick={() => setWeekdays((cur) => (on ? cur.filter((x) => x !== d) : [...cur, d]))}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="post-repeat-until">
                      {t("repeatUntil")}
                    </label>
                    <input
                      id="post-repeat-until"
                      type="date"
                      className="field__input"
                      value={repeatUntil}
                      min={date}
                      onChange={(e) => setRepeatUntil(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="field">
                  <label className="field__label" htmlFor="post-extra-date">
                    {t("addDate")}
                  </label>
                  <div className="field__control">
                    <input
                      id="post-extra-date"
                      type="date"
                      className="field__input"
                      value={extraDraft}
                      min={todayKey()}
                      onChange={(e) => setExtraDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={!extraDraft || seriesDates.length >= MAX_SERIES_DATES}
                      onClick={() => {
                        setExtraDates((cur) => [...new Set([...cur, extraDraft])]);
                        setExtraDraft("");
                      }}
                    >
                      {t("add")}
                    </button>
                  </div>
                </div>
              )}
              <p className="field__hint">
                {seriesDates.length > 1
                  ? t("seriesPreview", { count: seriesDates.length, dates: seriesDates.map(shortDate).join(", ") })
                  : t("seriesNeedsDates", { max: MAX_SERIES_DATES })}
              </p>
            </div>
          )}

          {withReturn && (
            <div className="search-card__row">
              <div className="field">
                <label className="field__label" htmlFor="post-return-date">
                  {t('returnDate')}
                </label>
                <input
                  id="post-return-date"
                  ref={returnDateRef}
                  className="field__input"
                  type="date"
                  value={returnDate}
                  min={date}
                  onClick={() => openCalendar(returnDateRef)}
                  onFocus={() => openCalendar(returnDateRef)}
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

          {error && <p className="form-error" role="alert">{t("errorPrefix")} {error}</p>}

          <button className="cta-button cta-button--full" type="submit">
            {t("postRideSubmit")}
          </button>
        </form>
      </div>
    </section>
  );
}
