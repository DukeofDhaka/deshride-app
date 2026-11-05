import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createSearchParams, useNavigate } from "react-router-dom";
import type { Spot } from "../types";
import { LocationPicker } from "../components/LocationPicker";
import {
  alertMatches,
  dataVersion,
  listUpcomingRides,
  markAlertRidesSeen,
  recentSearches,
  rememberSearch,
  useStoreValue
} from "../lib/store";
import { RideCard } from "../components/RideCard";
import { Icon, type IconName } from "../components/Icons";
import { findNearest, type SearchOrigin } from "../data/gazetteer";
import { BD_BOUNDS, formatBDT } from "../lib/geo";
import { useTranslation } from "../i18n";
import { todayKey, tomorrowKey } from "../lib/time";

function HeroArt({ label }: { label: string }) {
  return (
    <svg className="hero-art" viewBox="0 0 340 120" role="img" aria-label={label}>
      <rect width="340" height="120" className="hero-art__sky" />
      <path d="M0 70 Q60 52 120 64 T240 58 T340 62 V120 H0Z" className="hero-art__field hero-art__field--far" />
      <path d="M0 84 Q80 70 170 80 T340 76 V120 H0Z" className="hero-art__field" />
      <circle cx="282" cy="30" r="14" className="hero-art__sun" />
      <path d="M0 100 H340" className="hero-art__road" />
      <path d="M8 100 H332" className="hero-art__lane" />
      <g transform="translate(150 78)" className="hero-art__car">
        <path d="M2 16 L6 6 Q8 2 12 2 H34 Q38 2 41 6 L46 12 H52 Q56 12 56 16 V20 H2Z" className="hero-art__body" />
        <path d="M11 6 H22 V12 H8Z M25 6 H34 L39 12 H25Z" className="hero-art__glass" />
        <circle cx="14" cy="21" r="4.5" className="hero-art__wheel" />
        <circle cx="44" cy="21" r="4.5" className="hero-art__wheel" />
      </g>
      <g className="hero-art__trees">
        <rect x="40" y="56" width="3" height="18" />
        <circle cx="41.5" cy="54" r="8" />
        <rect x="74" y="60" width="3" height="14" />
        <circle cx="75.5" cy="58" r="6" />
      </g>
    </svg>
  );
}

const TRUST: { icon: IconName; title: string; body: string }[] = [
  { icon: "shield", title: "trustNidTitle", body: "trustNidBody" },
  { icon: "wallet", title: "trustPayTitle", body: "trustPayBody" },
  { icon: "split", title: "trustShareTitle", body: "trustShareBody" }
];

export function HomePage() {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const lang = language === "bn" ? "bn" : "en";
  const [from, setFrom] = useState<Spot | null>(null);
  const [to, setTo] = useState<Spot | null>(null);
  const [currentOrigin, setCurrentOrigin] = useState<SearchOrigin | null>(null);
  const [date, setDate] = useState(tomorrowKey());
  const [seats, setSeats] = useState(1);
  const [swapped, setSwapped] = useState(false);

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
  // Re-read when the shared data changes (another phone posts a ride).
  const version = useStoreValue(dataVersion);
  const previous = useMemo(() => recentSearches(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const alerts = useMemo(() => alertMatches(), [version]);
  const alertRideCount = alerts.reduce((n, m) => n + m.rides.length, 0);
  const upcoming = useMemo(() => listUpcomingRides(), [version]);
  const popular = useMemo(() => {
    const routes = new Map<string, { from: string; to: string; n: number; min: number }>();
    for (const r of upcoming) {
      const key = `${r.from.district}→${r.to.district}`;
      const cur = routes.get(key) ?? { from: r.from.district, to: r.to.district, n: 0, min: Infinity };
      cur.n += 1;
      cur.min = Math.min(cur.min, r.pricePerSeat);
      routes.set(key, cur);
    }
    return [...routes.values()].sort((a, b) => b.n - a.n).slice(0, 4);
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

  function swap() {
    setFrom(to);
    setTo(from);
    setSwapped((v) => !v);
  }

  return (
    <section className="page page--home">
      <div className="home">
        <div className="home__main">
          {alertRideCount > 0 && (
            <button
              type="button"
              className="banner banner--info"
              onClick={() => {
                const first = alerts[0].alert;
                markAlertRidesSeen(alerts.flatMap((m) => m.rides.map((r) => r.id)));
                const params: Record<string, string> = { seats: "1" };
                if (first.from) params.from = first.from;
                if (first.to) params.to = first.to;
                navigate({ pathname: "/results", search: createSearchParams(params).toString() });
              }}
            >
              <Icon name="bell" />
              <span>
                {t("alertBanner", {
                  count: alertRideCount,
                  route: `${alerts[0].alert.from ?? t("anywhere")} → ${alerts[0].alert.to ?? t("anywhere")}`
                })}
              </span>
            </button>
          )}

          <div className="home-hero">
            <span className="hero__label">{t("heroLabel")}</span>
            <h1>{t("homeHeadline")}</h1>
            <p className="hero__lead">{t("homeLead")}</p>
            <HeroArt label={t("heroArt")} />
          </div>

          <form className="search-card" onSubmit={handleSearch}>
            <div className="search-card__where">
              <LocationPicker label={t("fromWhere")} value={from} onChange={setFrom} originHint={currentOrigin} />
              <LocationPicker label={t("toWhere")} value={to} onChange={setTo} originHint={currentOrigin} />
              <button
                type="button"
                className={`swap-button${swapped ? " swap-button--spun" : ""}`}
                onClick={swap}
                aria-label={t("swapPlaces")}
                title={t("swapPlaces")}
              >
                <Icon name="swap" size={18} />
              </button>
            </div>
            <div className="search-card__row">
              <div className="field">
                <label className="field__label" htmlFor="search-date">
                  {t("dateOfJourney")}
                </label>
                <input
                  id="search-date"
                  ref={dateRef}
                  className="field__input"
                  type="date"
                  value={date}
                  min={todayKey()}
                  onClick={openCalendar}
                  onFocus={openCalendar}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="search-seats">
                  {t("seats")}
                </label>
                <select
                  id="search-seats"
                  className="field__input"
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n.toLocaleString(lang === "bn" ? "bn-BD" : "en")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="cta-button cta-button--full" type="submit">
              <Icon name="search" size={18} />
              {t("findRide")}
            </button>
          </form>

          {previous.length > 0 && (
            <div className="recent-searches">
              <span className="area-chips__label">{t("previousSearches")}</span>
              <div className="rule-grid">
                {previous.map((s, i) => (
                  <button
                    key={`${s.from}-${s.to}-${i}`}
                    type="button"
                    className="pill pill--toggle"
                    onClick={() => runSearch(s.from, s.to, s.date)}
                  >
                    {(s.from ?? t("anywhere")) + " → " + (s.to ?? t("anywhere"))}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="hero__post-cta">
            {t("postRidePrompt")}{" "}
            <Link className="secondary-link" to="/post">
              {t("postRideLink")}
            </Link>
          </p>
          <p className="hero__post-cta">
            {t("needSeatPrompt")}{" "}
            <Link className="secondary-link" to="/requests">
              {t("seatRequestsLink")}
            </Link>
          </p>

          <section className="home-section">
            <h2>{t("trustTitle")}</h2>
            <div className="trust-list">
              {TRUST.map((item) => (
                <div key={item.title} className="trust-item">
                  <span className="trust-item__icon">
                    <Icon name={item.icon} />
                  </span>
                  <span>
                    <strong>{t(item.title)}</strong>
                    <span>{t(item.body)}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="home-section">
            <h2>{t("howTitle")}</h2>
            <ol className="how-steps">
              {["howStep1", "howStep2", "howStep3"].map((key, i) => (
                <li key={key}>
                  <span className="how-steps__n">{(i + 1).toLocaleString(lang === "bn" ? "bn-BD" : "en")}</span>
                  {t(key)}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="home__side">
          {popular.length > 0 && (
            <section className="home-section">
              <h2>{t("popularRoutes")}</h2>
              <div className="route-tiles">
                {popular.map((route) => (
                  <button
                    key={`${route.from}-${route.to}`}
                    type="button"
                    className="route-tile"
                    onClick={() => runSearch(route.from, route.to)}
                  >
                    <strong>
                      {route.from} → {route.to}
                    </strong>
                    <span>{t("fromPrice", { price: formatBDT(route.min, lang) })}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="home-section">
            <h2>{t("upcomingRides")}</h2>
            {upcoming.length === 0 ? (
              <p className="detail-note">{t("noUpcoming")}</p>
            ) : (
              <div className="stack">
                {upcoming.slice(0, 3).map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            )}
            {upcoming.length > 3 && (
              <Link className="secondary-link" to="/results">
                {t("seeAllRides")}
              </Link>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
