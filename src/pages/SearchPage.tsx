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

  const title = [fromDistrict ?? "যেকোনো জায়গা", toDistrict ?? "যেকোনো জায়গা"].join(" → ");

  return (
    <section className="page page--search">
      <div className="search-banner">
        <h1>{title}</h1>
        <p>
          {exact.length > 0
            ? `${exact.length}টি রাইড${date ? ` — ${date}` : ""}`
            : nearby.length > 0
              ? `${date ?? "ঐ দিনে"} কিছু নেই — একই রুটে অন্য দিনের রাইডগুলো দেখুন।`
              : "এই রুটে এখনো কোনো রাইড নেই।"}
        </p>
      </div>

      <div className="results-grid">
        <div className="results-list">
          {results.map((ride) => (
            <RideCard key={ride.id} ride={ride} onHover={() => setActiveId(ride.id)} />
          ))}

          {results.length === 0 && (
            <div className="empty-state">
              <h2>এই রুটে প্রথম হোন।</h2>
              <p>
                এই রুটে গাড়ি চালান? খালি সিটগুলো পোস্ট করুন — যাত্রীরা আপনাকে খুঁজে
                নেবে।
              </p>
              <Link className="primary-button" to="/post">
                রাইড দিন
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
