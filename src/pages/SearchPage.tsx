import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BDMap } from "../components/BDMap";
import { RideCard } from "../components/RideCard";
import { searchRides } from "../lib/store";

export function SearchPage() {
  const [params] = useSearchParams();
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

  const title = [fromDistrict ?? "Anywhere", toDistrict ?? "anywhere"].join(" → ");

  return (
    <section className="page page--search">
      <div className="search-banner">
        <h1>{title}</h1>
        <p>
          {exact.length > 0
            ? `${exact.length} ride${exact.length > 1 ? "s" : ""} ${date ? `on ${date}` : "upcoming"}`
            : nearby.length > 0
              ? `Nothing on ${date ?? "that date"} yet — here is the same route on other days.`
              : "No rides on this route yet."}
        </p>
      </div>

      <div className="results-grid">
        <div className="results-list">
          {results.map((ride) => (
            <RideCard key={ride.id} ride={ride} onHover={() => setActiveId(ride.id)} />
          ))}

          {results.length === 0 && (
            <div className="empty-state">
              <h2>Be the first on this route.</h2>
              <p>
                DeshRide is growing corridor by corridor. If you drive this route, post
                your empty seats and travellers will find you.
              </p>
              <Link className="primary-button" to="/post">
                Post a ride
              </Link>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <aside className="results-map">
            <BDMap from={active?.from} to={active?.to} showCities={false} />
            {active && (
              <p className="map-caption">
                {active.from.name} → {active.to.name}
              </p>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
