import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate } from "react-router-dom";
import type { Spot } from "../types";
import { BDMap } from "../components/BDMap";
import { LocationPicker } from "../components/LocationPicker";
import { listUpcomingRides, recentSearches, rememberSearch } from "../lib/store";
import { findNearest } from "../data/gazetteer";
import { BD_BOUNDS } from "../lib/geo";

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

  const dateRef = useRef<HTMLInputElement>(null);
  const upcoming = useMemo(() => listUpcomingRides().slice(0, 8), []);

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
      <div className="hero hero--split">
        <div className="hero__copy">
          <span className="hero__label">ইন্টারসিটি কারপুলিং · সমগ্র বাংলাদেশ</span>
          <h1>আর নয় খালি সিট।</h1>
          <p className="hero__lead">
            ড্রাইভার যাচ্ছেনই — খালি সিটগুলো পাচ্ছেন আপনি। বাসের ভাড়ায়, দরজা থেকে
            দরজায়। <span className="hero__lead-en">Share the ride, share the cost.</span>
          </p>

          <form className="search-card" onSubmit={handleSearch}>
            <LocationPicker label="কোথা থেকে" value={from} onChange={setFrom} />
            <LocationPicker label="কোথায় যাবেন" value={to} onChange={setTo} />
            <div className="search-card__row">
              <div className="field">
                <label className="field__label" htmlFor="search-date">
                  যাত্রার তারিখ
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
                  সিট
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
              রাইড খুঁজুন
            </button>
          </form>

          {previous.length > 0 && (
            <div className="recent-searches">
              <span className="area-chips__label">আগের খোঁজ</span>
              <div className="rule-grid">
                {previous.map((s, i) => (
                  <button
                    key={`${s.from}-${s.to}-${i}`}
                    type="button"
                    className="pill pill--toggle"
                    onClick={() => runSearch(s.from, s.to, s.date)}
                  >
                    {(s.from ?? "যেকোনো জায়গা") + " → " + (s.to ?? "যেকোনো জায়গা")}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="hero__post-cta">
            গাড়িতে খালি সিট আছে?{" "}
            <Link className="secondary-link" to="/post">
              রাইড পোস্ট করুন →
            </Link>
          </p>
        </div>

        <div className="hero__map">
          <BDMap from={from} to={to} pins={upcoming.flatMap((r) => [r.from, r.to])} />
          <p className="map-caption">আসন্ন রাইডগুলোর পিকআপ ও ড্রপ-অফ পয়েন্ট।</p>
        </div>
      </div>

    </section>
  );
}
