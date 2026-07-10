import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RideCard } from "../components/RideCard";
import { searchRides } from "../lib/store";
import { useTranslation } from "../i18n";

export function SearchPage() {
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const fromDistrict = params.get("from") ?? undefined;
  const toDistrict = params.get("to") ?? undefined;
  const date = params.get("date") ?? undefined;

  const exact = useMemo(
    () => searchRides({ fromDistrict, toDistrict, date }),
    [fromDistrict, toDistrict, date]
  );
  // When the day has nothing, show the same corridor on other dates.
  const nearby = useMemo(
    () => (exact.length === 0 ? searchRides({ fromDistrict, toDistrict }) : []),
    [exact.length, fromDistrict, toDistrict]
  );

  const base = exact.length > 0 ? exact : nearby;
  const [instantOnly, setInstantOnly] = useState(false);
  const [sort, setSort] = useState<"time" | "price" | "rating">("time");
  const results = useMemo(() => {
    const filtered = instantOnly ? base.filter((r) => r.instantBook) : base;
    const sorted = [...filtered];
    if (sort === "price") sorted.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    if (sort === "rating") sorted.sort((a, b) => (b.driver.rating ?? 0) - (a.driver.rating ?? 0));
    return sorted;
  }, [base, instantOnly, sort]);

  const title = [fromDistrict ?? t('anywhere'), toDistrict ?? t('anywhere')].join(" → ");

  return (
    <section className="page page--search">
      <div className="search-banner">
        <h1>{title}</h1>
        <p>
          {exact.length > 0
            ? `${exact.length} ${t('ridesCount')}${date ? ` — ${date}` : ""}`
            : nearby.length > 0
              ? `${date ?? ""} ${t('nothingOnThatDay')}`
              : t('noRidesOnRoute')}
        </p>
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className={`pill pill--toggle${instantOnly ? " pill--active" : ""}`}
          aria-pressed={instantOnly}
          onClick={() => setInstantOnly((v) => !v)}
        >
          {t('instantOnly')}
        </button>
        <label className="filter-bar__sort">
          <span className="field__label">{t('sortBy')}</span>
          <select
            className="field__input"
            value={sort}
            onChange={(e) => setSort(e.target.value as "time" | "price" | "rating")}
          >
            <option value="time">{t('sortEarliest')}</option>
            <option value="price">{t('sortCheapest')}</option>
            <option value="rating">{t('sortTopRated')}</option>
          </select>
        </label>
      </div>

      <div className="results-grid">
        <div className="results-list">
          {results.map((ride) => (
            <RideCard key={ride.id} ride={ride} />
          ))}

          {results.length === 0 && (
            <div className="empty-state">
              <h2>{t('beTheFirst')}</h2>
              <p>{t('postSeatsPrompt')}</p>
              <Link className="primary-button" to="/post">
                {t('postRide')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
