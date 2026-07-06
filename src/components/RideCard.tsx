import { Link } from "react-router-dom";
import type { Ride } from "../types";
import { estimateDuration, formatBDT, roadKm } from "../lib/geo";
import { seatsLeft } from "../lib/store";
import { useTranslation } from "../i18n";

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dateOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

export function RideCard({ ride, onHover }: { ride: Ride; onHover?: () => void }) {
  const { t } = useTranslation();
  const km = roadKm(ride.from, ride.to);
  const left = seatsLeft(ride);
  return (
    <Link
      className="ride-row"
      to={`/ride/${ride.id}`}
      onMouseEnter={onHover}
      onFocus={onHover}
    >
      <div className="ride-row__times">
        <strong>{timeOf(ride.departure)}</strong>
        <span>{dateOf(ride.departure)}</span>
        <span className="ride-row__duration">{estimateDuration(km)}</span>
      </div>
      <div className="ride-row__route">
        <strong>
          {ride.from.name} → {ride.to.name}
        </strong>
        <span>
          {ride.stops && ride.stops.length > 0
            ? `${t('via')} ${ride.stops.map((s) => s.name).join(", ")}`
            : `${ride.from.note || ride.from.district} · ${ride.to.note || ride.to.district}`}
        </span>
        {ride.instantBook && <span className="chip chip--flash">{t('instantBook')}</span>}
        <span className="ride-row__driver">
          <span className="avatar avatar--dot" style={{ backgroundColor: ride.driver.accent }}>
            {ride.driver.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          {ride.driver.name}
          {ride.driver.rating ? ` · ${ride.driver.rating.toFixed(1)}★` : " · নতুন ড্রাইভার"}
        </span>
      </div>
      <div className="ride-row__price">
        <strong>{formatBDT(ride.pricePerSeat)}</strong>
        <span>প্রতি সিট</span>
        <span className={`chip ${left === 0 ? "chip--muted" : "chip--good"}`}>
          {left === 0 ? "ফুল" : `${left}টি সিট বাকি`}
        </span>
      </div>
    </Link>
  );
}
