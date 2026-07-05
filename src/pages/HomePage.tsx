import { useMemo, useState } from "react";
import { Link, createSearchParams, useNavigate } from "react-router-dom";
import type { Spot } from "../types";
import { BDMap } from "../components/BDMap";
import { LocationPicker } from "../components/LocationPicker";
import { listUpcomingRides } from "../lib/store";

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function HomePage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState<Spot | null>(null);
  const [to, setTo] = useState<Spot | null>(null);
  const [date, setDate] = useState(tomorrow());
  const [seats, setSeats] = useState(1);

  const upcoming = useMemo(() => listUpcomingRides().slice(0, 8), []);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const params: Record<string, string> = { date, seats: String(seats) };
    if (from) params.from = from.district;
    if (to) params.to = to.district;
    navigate({ pathname: "/results", search: createSearchParams(params).toString() });
  }

  return (
    <section className="page">
      <div className="hero hero--split">
        <div className="hero__copy">
          <span className="hero__label">Intercity carpooling · সারা বাংলাদেশ</span>
          <h1>Every empty seat between any two places in Bangladesh.</h1>
          <p className="hero__lead">
            Drivers post the trip they are already making. Travellers book the spare
            seats for less than a full car, with pickup points that beat any bus counter.
          </p>

          <form className="search-card" onSubmit={handleSearch}>
            <LocationPicker label="Leaving from" value={from} onChange={setFrom} />
            <LocationPicker label="Going to" value={to} onChange={setTo} />
            <div className="search-card__row">
              <div className="field">
                <label className="field__label" htmlFor="search-date">
                  Date
                </label>
                <input
                  id="search-date"
                  className="field__input"
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="search-seats">
                  Seats
                </label>
                <select
                  id="search-seats"
                  className="field__input"
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="primary-button primary-button--full" type="submit">
              Search rides
            </button>
          </form>

          <p className="hero__post-cta">
            Driving somewhere with empty seats?{" "}
            <Link className="secondary-link" to="/post">
              Post your ride →
            </Link>
          </p>
        </div>

        <div className="hero__map">
          <BDMap from={from} to={to} pins={upcoming.flatMap((r) => [r.from, r.to])} />
          <p className="map-caption">
            Live pins are pickup and drop-off points from upcoming rides.
          </p>
        </div>
      </div>

      <div className="info-stack info-stack--row">
        <div className="info-tile">
          <strong>1 · Drivers post a trip</strong>
          <p>
            Any pickup and drop-off in the country — a district town, a bus stand, or a
            pin dropped straight on the map.
          </p>
        </div>
        <div className="info-tile">
          <strong>2 · Travellers request seats</strong>
          <p>
            Pick your seats, choose bKash, Nagad or cash, and send the request. The
            driver confirms who rides.
          </p>
        </div>
        <div className="info-tile">
          <strong>3 · Meet and go</strong>
          <p>
            Verified profiles, exact meeting points and in-app trip details — the trust
            the Facebook khep groups never had.
          </p>
        </div>
      </div>
    </section>
  );
}
