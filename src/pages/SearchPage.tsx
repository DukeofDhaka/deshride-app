import { useMemo, useState } from "react";
import { Link, createSearchParams, useSearchParams } from "react-router-dom";
import { RideCard } from "../components/RideCard";
import { Icon } from "../components/Icons";
import {
  addAlert,
  findAlert,
  liveDriverRating,
  dataVersion,
  removeAlert,
  routeIndices,
  searchRides,
  useStoreValue
} from "../lib/store";
import { segmentFare } from "../lib/geo";
import { useTranslation } from "../i18n";

export function SearchPage() {
  const [params] = useSearchParams();
  const { language, t } = useTranslation();
  const fromDistrict = params.get("from") ?? undefined;
  const toDistrict = params.get("to") ?? undefined;
  const date = params.get("date") ?? undefined;
  const seats = Math.max(1, Number(params.get("seats")) || 1);

  const version = useStoreValue(dataVersion);
  const exact = useMemo(
    () => searchRides({ fromDistrict, toDistrict, date, seats }),
    // version: re-run when rides arrive from the server
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fromDistrict, toDistrict, date, seats, version]
  );
  // When the day has nothing, show the same corridor on other dates.
  const nearby = useMemo(
    () => (exact.length === 0 ? searchRides({ fromDistrict, toDistrict, seats }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exact, fromDistrict, toDistrict, seats]
  );

  const base = exact.length > 0 ? exact : nearby;
  const [instantOnly, setInstantOnly] = useState(false);
  const [sort, setSort] = useState<"time" | "price" | "rating">("time");
  const results = useMemo(() => {
    const filtered = instantOnly ? base.filter((r) => r.instantBook) : base;
    const sorted = [...filtered];
    if (sort === "price") sorted.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    if (sort === "rating") sorted.sort((a, b) => (liveDriverRating(b) ?? 0) - (liveDriverRating(a) ?? 0));
    return sorted;
  }, [base, instantOnly, sort]);

  const alertId = useStoreValue(() => findAlert(fromDistrict, toDistrict)?.id ?? null);
  const hasRoute = Boolean(fromDistrict || toDistrict);

  const title = [fromDistrict ?? t("anywhere"), toDistrict ?? t("anywhere")].join(" → ");
  const dateLabel = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long"
      })
    : null;

  const segmentQuery = createSearchParams({
    ...(fromDistrict ? { from: fromDistrict } : {}),
    ...(toDistrict ? { to: toDistrict } : {})
  }).toString();
  const requestQuery = createSearchParams({
    ...(fromDistrict ? { from: fromDistrict } : {}),
    ...(toDistrict ? { to: toDistrict } : {}),
    ...(date ? { date } : {}),
    seats: String(seats)
  }).toString();

  return (
    <section className="page page--search">
      <div className="search-banner">
        <h1>{title}</h1>
        <p>
          {exact.length > 0
            ? `${exact.length} ${t("ridesCount")}${dateLabel ? ` · ${dateLabel}` : ""}`
            : nearby.length > 0
              ? `${dateLabel ?? ""} ${t("nothingOnThatDay")}`
              : t("noRidesOnRoute")}
        </p>
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className={`pill pill--toggle${instantOnly ? " pill--active" : ""}`}
          aria-pressed={instantOnly}
          onClick={() => setInstantOnly((v) => !v)}
        >
          <Icon name="bolt" size={14} />
          {t("instantOnly")}
        </button>
        <label className="filter-bar__sort">
          <span className="field__label">{t("sortBy")}</span>
          <select
            className="field__input"
            value={sort}
            onChange={(e) => setSort(e.target.value as "time" | "price" | "rating")}
          >
            <option value="time">{t("sortEarliest")}</option>
            <option value="price">{t("sortCheapest")}</option>
            <option value="rating">{t("sortTopRated")}</option>
          </select>
        </label>
      </div>

      <div className="results-grid">
        <div className="results-list">
          {results.map((ride) => {
            const idx = routeIndices(ride, fromDistrict, toDistrict);
            const segment = idx ? { ...idx, farePerSeat: segmentFare(ride, idx.pickupIdx, idx.dropoffIdx) } : undefined;
            return <RideCard key={ride.id} ride={ride} segment={segment} query={segmentQuery} />;
          })}

          {results.length === 0 && (
            <div className="empty-state">
              <h2>{t("beTheFirst")}</h2>
              <p>{t("postSeatsPrompt")}</p>
              <Link className="primary-button" to="/post">
                {t("postRide")}
              </Link>
            </div>
          )}

          {hasRoute && (
            <div className="route-actions">
              <Icon name="bell" />
              <p>{t("alertPrompt")}</p>
              {alertId ? (
                <button type="button" className="ghost-button ghost-button--good" aria-pressed="true" onClick={() => removeAlert(alertId)}>
                  ✓ {t("alertOn")}
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost-button"
                  aria-pressed="false"
                  onClick={() => addAlert(fromDistrict, toDistrict)}
                >
                  {t("alertMe")}
                </button>
              )}
              {fromDistrict && toDistrict && (
                <Link className="ghost-button" to={`/requests?${requestQuery}`}>
                  {t("postSeatRequest")}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
