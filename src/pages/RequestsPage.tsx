import { useMemo, useState } from "react";
import { Link, createSearchParams, useSearchParams } from "react-router-dom";
import type { RideRequest, Spot } from "../types";
import { DISTRICTS } from "../data/gazetteer";
import { LocationPicker } from "../components/LocationPicker";
import { Avatar } from "../components/Avatar";
import { DriverTrustStats } from "../components/DriverTrustStats";
import {
  getProfile,
  matchingRidesForRequest,
  offerRideToRequest,
  openRideRequests,
  postRideRequest,
  saveProfile,
  useStoreValue
} from "../lib/store";
import { formatBDT } from "../lib/geo";
import { todayKey, tomorrowKey } from "../lib/time";
import { useTranslation } from "../i18n";

function districtSpot(name: string | null): Spot | null {
  if (!name) return null;
  const d = DISTRICTS.find((p) => p.name === name);
  return d ? { name: d.name, district: d.name, lat: d.lat, lng: d.lng } : null;
}

function RequestCard({ req, onMessage }: { req: RideRequest; onMessage: (m: string | null) => void }) {
  const { language, t } = useTranslation();
  const lang = language === "bn" ? "bn" : "en";
  const me = getProfile().id;
  const mine = req.riderId === me;
  const matches = mine ? [] : matchingRidesForRequest(req);
  const offered = new Set(req.offers.map((o) => o.rideId));
  const postQuery = createSearchParams({ from: req.from.district, to: req.to.district, date: req.date }).toString();

  return (
    <div className="manage-card">
      <div className="manage-card__head">
        <div>
          <strong>
            {req.from.name} → {req.to.name}
          </strong>
          <span>
            {new Date(`${req.date}T12:00:00`).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
              weekday: "long",
              day: "numeric",
              month: "short"
            })}{" "}
            · {t("seatsCount", { count: req.seats })}
          </span>
        </div>
        <span className="guest-row__who">
          <Avatar name={req.riderName} size="sm" accent="#476a8a" />
          {req.riderName}
        </span>
      </div>
      {req.note && <em className="request-note">“{req.note}”</em>}
      <DriverTrustStats userId={req.riderId} compact />
      {mine ? (
        <p className="detail-note">{t("yourRequestOffers", { count: req.offers.length })}</p>
      ) : (
        <div className="manage-card__actions">
          {matches.map((ride) =>
            offered.has(ride.id) ? (
              <span key={ride.id} className="chip chip--good">
                ✓ {t("offerSent")}
              </span>
            ) : (
              <button
                key={ride.id}
                type="button"
                className="primary-button"
                onClick={() => onMessage(offerRideToRequest(req.id, ride.id) ?? t("offerSentBody", { name: req.riderName }))}
              >
                {t("offerMyRide", {
                  time: new Date(ride.departure).toLocaleTimeString(lang === "bn" ? "bn-BD" : "en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23"
                  }),
                  price: formatBDT(ride.pricePerSeat, lang)
                })}
              </button>
            )
          )}
          {matches.length === 0 && (
            <Link className="ghost-button" to={`/post?${postQuery}`}>
              {t("postMatchingRide")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function RequestsPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const profile = getProfile();
  useStoreValue(() => localStorage.getItem("deshride.ride-requests.v1") ?? "");

  const [from, setFrom] = useState<Spot | null>(() => districtSpot(params.get("from")));
  const [to, setTo] = useState<Spot | null>(() => districtSpot(params.get("to")));
  const [date, setDate] = useState(params.get("date") ?? tomorrowKey());
  const [seats, setSeats] = useState(Math.max(1, Number(params.get("seats")) || 1));
  const [note, setNote] = useState("");
  const [name, setName] = useState(profile.name);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");

  const board = openRideRequests();
  const districts = useMemo(() => [...new Set(board.map((r) => r.from.district))].sort(), [board]);
  const shown = filterFrom ? board.filter((r) => r.from.district === filterFrom) : board;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("errorGuestName"));
      return;
    }
    if (name.trim() !== profile.name) saveProfile({ ...getProfile(), name: name.trim() });
    try {
      postRideRequest({ from: from!, to: to!, date, seats, note });
      setNote("");
      setFlash(t("seatRequestPosted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="page">
      <div className="search-banner">
        <h1>{t("seatRequestsTitle")}</h1>
        <p>{t("seatRequestsSubtitle")}</p>
      </div>
      {flash && <div className="banner banner--good">{flash}</div>}

      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-panel">
            <div className="series-head">
              <h2>{t("ridersLooking")}</h2>
              {districts.length > 1 && (
                <select
                  className="field__input"
                  style={{ width: "auto" }}
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  aria-label={t("fromWhere")}
                >
                  <option value="">{t("anywhere")}</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {shown.length === 0 ? (
              <p className="detail-note">{t("noSeatRequests")}</p>
            ) : (
              <div className="stack">
                {shown.map((req) => (
                  <RequestCard key={req.id} req={req} onMessage={setFlash} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="detail-aside">
          <form className="booking-card" onSubmit={submit}>
            <div>
              <span className="booking-card__label">{t("needASeat")}</span>
            </div>
            <LocationPicker label={t("fromWhere")} value={from} onChange={setFrom} />
            <LocationPicker label={t("toWhere")} value={to} onChange={setTo} />
            <div className="search-card__row">
              <div className="field">
                <label className="field__label" htmlFor="rq-date">
                  {t("dateOfJourney")}
                </label>
                <input
                  id="rq-date"
                  type="date"
                  className="field__input"
                  value={date}
                  min={todayKey()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="rq-seats">
                  {t("seats")}
                </label>
                <select id="rq-seats" className="field__input" value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!profile.name && (
              <div className="field">
                <label className="field__label" htmlFor="rq-name">
                  {t("yourName")}
                </label>
                <input id="rq-name" className="field__input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label className="field__label" htmlFor="rq-note">
                {t("noteOptional")}
              </label>
              <textarea
                id="rq-note"
                className="field__input field__input--area"
                value={note}
                maxLength={300}
                placeholder={t("seatRequestNotePlaceholder")}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="cta-button cta-button--full" type="submit" disabled={!from || !to}>
              {t("postSeatRequest")}
            </button>
            <p className="detail-note">{t("seatRequestHint")}</p>
          </form>
        </aside>
      </div>
    </section>
  );
}
