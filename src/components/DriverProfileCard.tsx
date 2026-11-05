import type { Ride } from "../types";
import { liveDriverRating } from "../lib/store";
import { useTranslation } from "../i18n";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import { PrefIcons } from "./PrefIcons";
import { DriverTrustStats } from "./DriverTrustStats";

// The driver as a rider sees them before booking: who they are, what they
// drive, how they like to travel and how reliable they've been.
export function DriverProfileCard({ ride, showPlate }: { ride: Ride; showPlate: boolean }) {
  const { language, t } = useTranslation();
  const d = ride.driver;
  const rating = liveDriverRating(ride);
  const since = d.memberSince
    ? new Date(d.memberSince).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
        month: "long",
        year: "numeric"
      })
    : null;
  const carLine = [ride.car, d.carColor && !ride.car.includes(d.carColor) ? d.carColor : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="detail-panel driver-profile">
      <div className="driver-profile__head">
        <Avatar name={d.name} accent={d.accent} photo={d.photo} size="lg" />
        <div>
          <h2>
            {d.name}
            {d.verified && <Icon name="tick" size={18} className="icon verified-tick" title={t("verifiedDriver")} />}
          </h2>
          <p>
            {rating ? `${rating.toFixed(1)}★ · ${t("tripsCount", { count: d.trips })}` : t("newDriverOnDeshRide")}
            {since && <> · {t("memberSince", { date: since })}</>}
          </p>
          <p className="driver-profile__car">
            {carLine}
            {" · "}
            {showPlate && d.plate ? <strong>{d.plate}</strong> : t("plateAfterBooking")}
          </p>
        </div>
      </div>

      <div className="badge-row">
        {d.verified && (
          <span className="badge">
            <Icon name="shield" size={14} />
            {t("nidVerifiedBadge")}
          </span>
        )}
        {d.verified && (
          <span className="badge">
            <Icon name="phone" size={14} />
            {t("phoneVerifiedBadge")}
          </span>
        )}
        {ride.instantBook && (
          <span className="badge">
            <Icon name="bolt" size={14} />
            {t("instantBook")}
          </span>
        )}
      </div>

      {d.bio && <p className="driver-profile__bio">{d.bio}</p>}
      {d.prefs && <PrefIcons prefs={d.prefs} />}
      <DriverTrustStats userId={d.id} compact />
    </div>
  );
}
