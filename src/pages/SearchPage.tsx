import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RideCard } from "../components/RideCard";
import { searchRides } from "../lib/store";
import { useTranslation } from "../i18n";

export function SearchPage() {
  const [params] = useSearchParams();
  const { t, language } = useTranslation();
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

  const results = exact.length > 0 ? exact : nearby;
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = results.find((r) => r.id === activeId) ?? results[0];

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

      <div className="results-grid">
        <div className="results-list">
          {results.map((ride) => (
            <RideCard key={ride.id} ride={ride} onHover={() => setActiveId(ride.id)} />
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
