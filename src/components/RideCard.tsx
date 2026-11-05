import { Link } from "react-router-dom";
import type { Ride } from "../types";
import { estimateDuration, formatBDT, routeKm, stopTimes } from "../lib/geo";
import { liveDriverRating, seatsLeft } from "../lib/store";
import { useTranslation } from "../i18n";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import { RouteTimeline } from "./RouteTimeline";

export function localeFor(language: string): string {
  return language === "bn" ? "bn-BD" : "en-GB";
}

export function timeOf(iso: string, language: string): string {
  // 24-hour clock keeps the time column narrow and unambiguous in both scripts.
  return new Date(iso).toLocaleTimeString(localeFor(language), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function dateOf(iso: string, language: string): string {
  return new Date(iso).toLocaleDateString(localeFor(language), {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

export interface RideSegment {
  pickupIdx: number;
  dropoffIdx: number;
  farePerSeat: number;
}

export function RideCard({
  ride,
  segment,
  query
}: {
  ride: Ride;
  segment?: RideSegment;
  query?: string;
}) {
  const { language, t } = useTranslation();
  const route = [ride.from, ...(ride.stops ?? []), ride.to];
  const isSegment = Boolean(segment && (segment.pickupIdx > 0 || segment.dropoffIdx < route.length - 1));
  const startIdx = isSegment ? segment!.pickupIdx : 0;
  const endIdx = isSegment ? segment!.dropoffIdx : route.length - 1;
  const start = route[startIdx];
  const end = route[endIdx];

  const times = stopTimes(ride);
  const startTime = times[startIdx];
  const endTime = times[endIdx];
  const legKm = routeKm(route.slice(startIdx, endIdx + 1));

  const left = seatsLeft(ride);
  const rating = liveDriverRating(ride);
  const lang = language === "bn" ? "bn" : "en";
  const stopsBetween = route.slice(startIdx + 1, endIdx).map((s) => s.name);
  const between = [
    [estimateDuration(legKm, lang), stopsBetween.length > 0 ? `${t("via")} ${stopsBetween.join(", ")}` : ""]
      .filter(Boolean)
      .join(" · ")
  ];

  return (
    <Link
      className={`ride-card${left === 0 ? " ride-card--full" : ""}`}
      to={`/ride/${ride.id}${query ? `?${query}` : ""}`}
    >
      <div className="ride-card__top">
        <RouteTimeline
          stops={[
            {
              time: timeOf(startTime, language),
              place: start.name,
              note: isSegment && startIdx > 0 ? t("yourPickup") : start.note || (start.name !== start.district ? start.district : undefined)
            },
            {
              time: timeOf(endTime, language),
              place: end.name,
              note: end.note || (end.name !== end.district ? end.district : undefined)
            }
          ]}
          between={between}
        />
        <div className="ride-card__price">
          <strong>{formatBDT(isSegment ? segment!.farePerSeat : ride.pricePerSeat, lang)}</strong>
          {isSegment ? (
            <>
              <span className="ride-card__segment">{t("yourSegment")}</span>
              <span>{t("fullRoutePrice", { price: formatBDT(ride.pricePerSeat, lang) })}</span>
            </>
          ) : (
            <span>{t("perSeat")}</span>
          )}
        </div>
      </div>
      <div className="ride-card__foot">
        <Avatar name={ride.driver.name} accent={ride.driver.accent} photo={ride.driver.photo} size="sm" />
        <span className="ride-card__driver">
          {ride.driver.name}
          {ride.driver.verified && <Icon name="tick" size={15} className="icon verified-tick" title={t("verifiedDriver")} />}
          <em>{rating ? `${rating.toFixed(1)}★` : t("rideCardNewDriver")}</em>
        </span>
        <span className="ride-card__chips">
          {ride.instantBook && (
            <span className="chip chip--flash">
              <Icon name="bolt" size={12} /> {t("instantBook")}
            </span>
          )}
          <span className={`chip ${left === 0 ? "chip--muted" : left === 1 ? "chip--wait" : "chip--good"}`}>
            {left === 0 ? t("full") : left === 1 ? t("oneSeatLeft") : t("seatsCount", { count: left })}
          </span>
        </span>
      </div>
      <span className="ride-card__date">{dateOf(ride.departure, language)}</span>
    </Link>
  );
}
