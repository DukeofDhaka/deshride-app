import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import type { AppNotification } from "../lib/store";
import { dataVersion, getRide, markNotificationsRead, myNotifications, useStoreValue } from "../lib/store";
import { useTranslation } from "../i18n";
import { Icon, type IconName } from "../components/Icons";

const ICONS: Record<AppNotification["kind"], IconName> = {
  requestNew: "user",
  requestAccepted: "tick",
  requestDeclined: "back",
  requestExpired: "clock",
  tripTomorrow: "calendar",
  rateTrip: "star",
  ratePassengers: "star",
  alertMatch: "bell",
  seatOffer: "car",
  rideCancelled: "flag",
  bookingCancelled: "flag"
};

function linkFor(n: AppNotification): string {
  switch (n.kind) {
    case "requestNew":
    case "ratePassengers":
    case "bookingCancelled":
    case "rateTrip":
    case "requestExpired":
    case "requestDeclined":
    case "rideCancelled":
      return "/rides";
    case "seatOffer":
      return "/rides";
    default:
      return n.rideId ? `/ride/${n.rideId}` : "/rides";
  }
}

export function NotificationsPage() {
  const { language, t } = useTranslation();
  // Snapshot before marking read so this visit still highlights what's new.
  const version = useStoreValue(dataVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => myNotifications(), [version]);
  useEffect(() => {
    markNotificationsRead();
  }, [items.length]);

  return (
    <section className="page">
      <div className="search-banner">
        <h1>{t("notifications")}</h1>
        <p>{t("notificationsSubtitle")}</p>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <h2>{t("noNotifications")}</h2>
          <p>{t("noNotificationsBody")}</p>
        </div>
      ) : (
        <ul className="notif-list">
          {items.map((n) => {
            const ride = n.rideId ? getRide(n.rideId) : undefined;
            const route = ride ? `${ride.from.name} → ${ride.to.name}` : "";
            return (
              <li key={n.id}>
                <Link className={`notif${n.read ? "" : " notif--unread"}`} to={linkFor(n)}>
                  <span className="notif__icon">
                    <Icon name={ICONS[n.kind]} size={18} />
                  </span>
                  <span className="notif__body">
                    <strong>{t(`notif_${n.kind}`, { route })}</strong>
                    <small>
                      {new Date(n.createdAt).toLocaleString(language === "bn" ? "bn-BD" : "en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hourCycle: "h23"
                      })}
                    </small>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
