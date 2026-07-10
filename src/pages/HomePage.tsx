import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate } from "react-router-dom";
import type { Spot } from "../types";
import { LocationPicker } from "../components/LocationPicker";
import { listUpcomingRides, recentSearches, rememberSearch } from "../lib/store";
import { RideCard } from "../components/RideCard";
import { findNearest, type SearchOrigin } from "../data/gazetteer";
import { BD_BOUNDS } from "../lib/geo";
import { useTranslation } from "../i18n";

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [from, setFrom] = useState<Spot | null>(null);
  const [to, setTo] = useState<Spot | null>(null);
  const [currentOrigin, setCurrentOrigin] = useState<SearchOrigin | null>(null);
  const [date, setDate] = useState(tomorrow());
  const [seats, setSeats] = useState(1);

  const dateRef = useRef<HTMLInputElement>(null);

  // Ask for location up front and start the search from the nearest area.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (
          lat < BD_BOUNDS.minLat || lat > BD_BOUNDS.maxLat ||
          lng < BD_BOUNDS.minLng || lng > BD_BOUNDS.maxLng
        ) {
          return;
        }
        setCurrentOrigin({ lat, lng });
        setFrom((current) => {
          if (current) return current;
          const { place } = findNearest(lat, lng);
          return {
            name: place.name,
            district: place.district ?? place.name,
            lat: place.lat,
            lng: place.lng
          };
        });
      },
      () => undefined,
      { maximumAge: 600000, timeout: 8000 }
    );
  }, []);
  const previous = useMemo(() => recentSearches(), []);
  const upcoming = useMemo(() => listUpcomingRides(), []);
  const popular = useMemo(() => {
    const counts = new Map<string, { from: string; to: string; n: number }>();
    for (const r of upcoming) {
      const key = `${r.from.district}→${r.to.district}`;
      const cur = counts.get(key) ?? { from: r.from.district, to: r.to.district, n: 0 };
      cur.n += 1;
      counts.set(key, cur);
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 4);
  }, [upcoming]);

  function openCalendar() {
    const input = dateRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    try {
      input?.showPicker?.();
    } catch {
      // Sandboxed iframes disallow showPicker; the native input still opens on tap.
    }
  }

  function runSearch(fromDistrict?: string, toDistrict?: string, when?: string) {
    const params: Record<string, string> = { date: when ?? date, seats: String(seats) };
    if (fromDistrict) params.from = fromDistrict;
    if (toDistrict) params.to = toDistrict;
    rememberSearch({ from: fromDistrict, to: toDistrict, date: params.date });
    navigate({ pathname: "/results", search: createSearchParams(params).toString() });
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    runSearch(from?.district, to?.district);
  }

  return (
    <section className="page">
      <div className="hero">
        <div className="hero__copy">
          <span className="hero__label">{t('heroLabel')}</span>
          <h1>{t('heroTitle')}</h1>
          <p className="hero__lead">
            {t('heroLead1')} <span className="hero__lead-en">{t('heroLead2')}</span>
          </p>

          <form className="search-card" onSubmit={handleSearch}>
            <LocationPicker
              label={t('fromWhere')}
              value={from}
              onChange={setFrom}
              originHint={currentOrigin}
            />
            <LocationPicker
              label={t('toWhere')}
              value={to}
              onChange={setTo}
              originHint={currentOrigin}
            />
            <div className="search-card__row">
              <div className="field">
                <label className="field__label" htmlFor="search-date">
                  {t('dateOfJourney')}
                </label>
                <input
                  id="search-date"
                  ref={dateRef}
                  className="field__input"
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onClick={openCalendar}
                  onFocus={openCalendar}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="search-seats">
                  {t('seats')}
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
              {t('findRide')}
            </button>
          </form>

          {previous.length > 0 && (
            <div className="recent-searches">
              <span className="area-chips__label">{t('previousSearches')}</span>
              <div className="rule-grid">
                {previous.map((s, i) => (
                  <button
                    key={`${s.from}-${s.to}-${i}`}
                    type="button"
                    className="pill pill--toggle"
                    onClick={() => runSearch(s.from, s.to, s.date)}
                  >
                    {(s.from ?? t('anywhere')) + " → " + (s.to ?? t('anywhere'))}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="hero__post-cta">
            {t('postRidePrompt')}{" "}
            <Link className="secondary-link" to="/post">
              {t('postRideLink')}
            </Link>
          </p>
        </div>

        <div className="hero__side">
          {popular.length > 0 && (
            <div className="detail-panel">
              <h2>{t('popularRoutes')}</h2>
              <div className="rule-grid">
                {popular.map((route) => (
                  <button
                    key={`${route.from}-${route.to}`}
                    type="button"
                    className="pill pill--toggle"
                    onClick={() => runSearch(route.from, route.to)}
                  >
                    {route.from} → {route.to}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="detail-panel">
            <h2>{t('upcomingRides')}</h2>
            {upcoming.length === 0 ? (
              <p className="detail-note">{t('noUpcoming')}</p>
            ) : (
              <div className="stack">
                {upcoming.slice(0, 3).map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            )}
            {upcoming.length > 3 && (
              <Link className="secondary-link" to="/results">
                {t('seeAllRides')}
              </Link>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}
