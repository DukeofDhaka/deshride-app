import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LuggageSize, Spot } from "../types";
import { BDMap } from "../components/BDMap";
import { LocationPicker } from "../components/LocationPicker";
import { estimateDuration, formatBDT, roadKm, suggestedFare } from "../lib/geo";
import { createRide, getProfile, saveProfile } from "../lib/store";

const RULE_OPTIONS = ["No smoking", "AC on highway", "Music ok", "Max 3 in the back", "Ladies-priority front seat"];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function PostRidePage() {
  const navigate = useNavigate();
  const profile = getProfile();

  const [from, setFrom] = useState<Spot | null>(null);
  const [to, setTo] = useState<Spot | null>(null);
  const [date, setDate] = useState(tomorrow());
  const [time, setTime] = useState("07:30");
  const [seatsTotal, setSeatsTotal] = useState(3);
  const [price, setPrice] = useState<number | "">("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [car, setCar] = useState("");
  const [luggage, setLuggage] = useState<LuggageSize>("medium");
  const [rules, setRules] = useState<string[]>(["No smoking"]);
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
      setError("Choose both a pickup and a drop-off location.");
      return;
    }
    if (from.district === to.district && Math.abs(from.lat - to.lat) < 0.05 && Math.abs(from.lng - to.lng) < 0.05) {
      setError("Pickup and drop-off look like the same place — DeshRide is for intercity trips.");
      return;
    }
    if (!driverName.trim()) {
      setError("Add your name — travellers won't request a ride from a blank profile.");
      return;
    }
    if (!effectivePrice || Number(effectivePrice) <= 0) {
      setError("Set a price per seat.");
      return;
    }
    if (!car.trim()) {
      setError("Tell travellers what car you drive, e.g. Toyota Axio · Silver.");
      return;
    }

    if (driverName.trim() !== profile.name) {
      saveProfile({ ...profile, name: driverName.trim() });
    }

    const departure = new Date(`${date}T${time}:00`).toISOString();
    const ride = createRide({
      from,
      to,
      departure,
      seatsTotal,
      pricePerSeat: Number(effectivePrice),
      car: car.trim(),
      luggage,
      rules,
      note: note.trim() || undefined
    });
    navigate(`/ride/${ride.id}?posted=1`);
  }

  return (
    <section className="page">
      <div className="search-banner">
        <h1>Post a ride</h1>
        <p>
          You're driving anyway — publish the empty seats. Travellers request, you
          approve who rides.
        </p>
      </div>

      <div className="post-grid">
        <form className="post-form" onSubmit={handleSubmit}>
          <LocationPicker
            label="Pickup"
            value={from}
            onChange={setFrom}
            allowMapPick
            withNote
            notePlaceholder="Exact pickup point, e.g. Kalabagan bus stand gate 2"
          />
          <LocationPicker
            label="Drop-off"
            value={to}
            onChange={setTo}
            allowMapPick
            withNote
            notePlaceholder="Exact drop-off point, e.g. GEC Circle"
          />

          <div className="search-card__row">
            <div className="field">
              <label className="field__label" htmlFor="post-date">
                Date
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
                Departure
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
                Seats to sell
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
                Price per seat (৳)
              </label>
              <input
                id="post-price"
                className="field__input"
                type="number"
                min={50}
                step={50}
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
              ~{km} km · {estimateDuration(km)}. Suggested {formatBDT(fare.low)}–
              {formatBDT(fare.high)} per seat — under the AC bus for door-to-door.
            </p>
          )}

          <div className="field">
            <label className="field__label" htmlFor="post-car">
              Car
            </label>
            <input
              id="post-car"
              className="field__input"
              value={car}
              placeholder="Toyota Axio · Silver"
              onChange={(e) => setCar(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="post-luggage">
              Luggage space
            </label>
            <select
              id="post-luggage"
              className="field__input"
              value={luggage}
              onChange={(e) => setLuggage(e.target.value as LuggageSize)}
            >
              <option value="small">Small — backpack only</option>
              <option value="medium">Medium — one bag each</option>
              <option value="large">Large — boot free</option>
            </select>
          </div>

          <div className="field">
            <span className="field__label">Trip rules</span>
            <div className="rule-grid">
              {RULE_OPTIONS.map((rule) => (
                <button
                  key={rule}
                  type="button"
                  className={`pill pill--toggle${rules.includes(rule) ? " pill--active" : ""}`}
                  aria-pressed={rules.includes(rule)}
                  onClick={() => toggleRule(rule)}
                >
                  {rule}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="post-note">
              Anything else (optional)
            </label>
            <textarea
              id="post-note"
              className="field__input field__input--area"
              value={note}
              placeholder="Breaks, route preference, co-driver…"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {!profile.name && (
            <div className="field">
              <label className="field__label" htmlFor="post-name">
                Your name
              </label>
              <input
                id="post-name"
                className="field__input"
                value={driverName}
                placeholder="Shown on your ride"
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button primary-button--full" type="submit">
            Publish ride
          </button>
        </form>

        <aside className="post-map">
          <BDMap from={from} to={to} />
          <p className="map-caption">
            {from && to
              ? `${from.name} → ${to.name}`
              : "Your route appears here as you choose locations."}
          </p>
        </aside>
      </div>
    </section>
  );
}
