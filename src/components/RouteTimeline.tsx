// Departure → (stops) → arrival on a dot-and-line rail, the layout riders
// scan first on any carpool card. Times are optional (stopovers may have none).
export interface TimelineStop {
  time?: string;
  place: string;
  note?: string;
  badge?: string;
  kind?: "start" | "stop" | "end";
}

export function RouteTimeline({
  stops,
  between,
  size = "card"
}: {
  stops: TimelineStop[];
  between?: (string | undefined)[];
  size?: "card" | "full";
}) {
  return (
    <ol className={`route-tl route-tl--${size}`}>
      {stops.map((s, i) => {
        const kind = s.kind ?? (i === 0 ? "start" : i === stops.length - 1 ? "end" : "stop");
        return (
          <li key={`${s.place}-${i}`} className={`route-tl__row route-tl__row--${kind}`}>
            <span className="route-tl__time">{s.time ?? ""}</span>
            <span className="route-tl__dot" aria-hidden="true" />
            <span className="route-tl__place">
              <strong>{s.place}</strong>
              {s.badge && <span className="route-tl__badge">{s.badge}</span>}
              {s.note && <small>{s.note}</small>}
            </span>
            {i < stops.length - 1 && between?.[i] && (
              <span className="route-tl__between">{between[i]}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
