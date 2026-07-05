import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LuggageSize, Spot } from "../types";
import { BDMap } from "../components/BDMap";
import { LocationPicker } from "../components/LocationPicker";
import { busFareEstimate, estimateDuration, formatBDT, roadKm, suggestedFare } from "../lib/geo";
import { createRide, getProfile, saveProfile, saveRideDraft } from "../lib/store";

const RULE_OPTIONS = ["ধূমপান নিষেধ", "হাইওয়েতে এসি", "গান চলবে", "পেছনে সর্বোচ্চ ৩ জন", "নারীদের সামনের সিট"];

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
  const [rules, setRules] = useState<string[]>(["ধূমপান নিষেধ"]);
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
      setError("পিকআপ ও ড্রপ-অফ — দুটোই বেছে নিন।");
      return;
    }
    if (from.district === to.district && Math.abs(from.lat - to.lat) < 0.05 && Math.abs(from.lng - to.lng) < 0.05) {
      setError("পিকআপ আর ড্রপ-অফ একই জায়গা মনে হচ্ছে — দেশরাইড শহর-থেকে-শহরের জন্য।");
      return;
    }
    if (!driverName.trim()) {
      setError("আপনার নাম দিন — নামহীন প্রোফাইলে কেউ রিকোয়েস্ট করবে না।");
      return;
    }
    if (!effectivePrice || Number(effectivePrice) <= 0) {
      setError("সিট প্রতি ভাড়া দিন।");
      return;
    }
    if (!car.trim()) {
      setError("কোন গাড়ি চালান লিখুন, যেমন: Toyota Axio · সিলভার।");
      return;
    }

    if (driverName.trim() !== profile.name) {
      saveProfile({ ...profile, name: driverName.trim() });
    }

    const departure = new Date(`${date}T${time}:00`).toISOString();
    const rideInput = {
      from,
      to,
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
    navigate(`/ride/${ride.id}?posted=1`);
  }

  return (
    <section className="page">
      <div className="search-banner">
        <h1>রাইড দিন</h1>
        <p>
          আপনি তো যাচ্ছেনই — খালি সিটগুলো পোস্ট করুন। যাত্রীরা রিকোয়েস্ট করবে,
          আপনি বেছে নেবেন।
        </p>
      </div>

      <div className="post-grid">
        <form className="post-form" onSubmit={handleSubmit}>
          <LocationPicker
            label="পিকআপ"
            value={from}
            onChange={setFrom}
            allowMapPick
            withNote
            notePlaceholder="ঠিক কোথা থেকে? যেমন: কলাবাগান বাসস্ট্যান্ড, গেট ২"
          />
          <LocationPicker
            label="ড্রপ-অফ"
            value={to}
            onChange={setTo}
            allowMapPick
            withNote
            notePlaceholder="ঠিক কোথায় নামবেন? যেমন: জিইসি মোড়"
          />

          <div className="search-card__row">
            <div className="field">
              <label className="field__label" htmlFor="post-date">
                যাত্রার তারিখ
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
                ছাড়ার সময়
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
                কয়টি সিট
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
                সিট প্রতি ভাড়া (৳)
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
              ~{km} কিমি · {estimateDuration(km)}। এই রুটে এসি বাস ≈
              {formatBDT(busFareEstimate(km))} — এর নিচে রাখলেই সিট ভরবে। পরামর্শ:{" "}
              {formatBDT(fare.low)}–{formatBDT(fare.high)}। দাম আপনার হাতে।
            </p>
          )}

          <div className="field">
            <label className="field__label" htmlFor="post-car">
              গাড়ি
            </label>
            <input
              id="post-car"
              className="field__input"
              value={car}
              placeholder="Toyota Axio · সিলভার"
              onChange={(e) => setCar(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="post-luggage">
              লাগেজ
            </label>
            <select
              id="post-luggage"
              className="field__input"
              value={luggage}
              onChange={(e) => setLuggage(e.target.value as LuggageSize)}
            >
              <option value="small">ছোট — শুধু ব্যাকপ্যাক</option>
              <option value="medium">মাঝারি — জনপ্রতি এক ব্যাগ</option>
              <option value="large">বড় — বুট খালি</option>
            </select>
          </div>

          <div className="field">
            <span className="field__label">রাইডের নিয়ম</span>
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
              আর কিছু (ঐচ্ছিক)
            </label>
            <textarea
              id="post-note"
              className="field__input field__input--area"
              value={note}
              placeholder="বিরতি, রুট, সহযাত্রী…"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {!profile.name && (
            <div className="field">
              <label className="field__label" htmlFor="post-name">
                আপনার নাম
              </label>
              <input
                id="post-name"
                className="field__input"
                value={driverName}
                placeholder="রাইডে দেখানো হবে"
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button primary-button--full" type="submit">
            রাইড পোস্ট করুন
          </button>
        </form>

        <aside className="post-map">
          <BDMap from={from} to={to} />
          <p className="map-caption">
            {from && to
              ? `${from.name} → ${to.name}`
              : "জায়গা বাছলেই রুটটি এখানে দেখা যাবে।"}
          </p>
        </aside>
      </div>
    </section>
  );
}
