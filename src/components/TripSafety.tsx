import { useState } from "react";
import type { Ride } from "../types";
import { useTranslation } from "../i18n";
import { Icon } from "./Icons";

// Shown to a rider once their seat is confirmed: send the trip details to
// family, and reach Bangladesh's national emergency line (999) in one tap.
export function tripShareText(ride: Ride, language: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const when = new Date(ride.departure).toLocaleString(language === "bn" ? "bn-BD" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  const car = [ride.car, ride.driver.plate].filter(Boolean).join(" · ");
  return t("shareTripText", {
    from: ride.from.name,
    to: ride.to.name,
    when,
    driver: ride.driver.name,
    car
  });
}

export function TripSafety({ ride }: { ride: Ride }) {
  const { language, t } = useTranslation();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const text = tripShareText(ride, language, t);

  async function share() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "DeshRide", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="trip-safety">
      <p>{t("safetyNote")}</p>
      <div className="trip-safety__buttons">
        <button type="button" className="safety-button" onClick={share}>
          <Icon name="share" size={16} />
          {t("shareTrip")}
        </button>
        <a className="safety-button safety-button--sos" href="tel:999">
          <Icon name="phone" size={16} />
          {t("emergency999")}
        </a>
      </div>
      {copied === "copied" && <p className="trip-safety__status">{t("tripCopied")}</p>}
      {copied === "failed" && (
        <p className="trip-safety__status">
          {t("tripCopyFailed")} <span className="trip-safety__text">{text}</span>
        </p>
      )}
    </div>
  );
}
