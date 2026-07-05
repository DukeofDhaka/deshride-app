import { useRef } from "react";
import type { Spot } from "../types";
import { MAJOR_CITIES } from "../data/gazetteer";
import {
  MAP_H,
  MAP_W,
  haversineKm,
  outlinePath,
  project,
  roadKm,
  unproject
} from "../lib/geo";

interface BDMapProps {
  from?: Spot | null;
  to?: Spot | null;
  pins?: Spot[];
  onPick?: (lat: number, lng: number) => void;
  showCities?: boolean;
  className?: string;
}

export function BDMap({ from, to, pins = [], onPick, showCities = true, className }: BDMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!onPick || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * MAP_W;
    const y = ((event.clientY - rect.top) / rect.height) * MAP_H;
    const { lat, lng } = unproject(x, y);
    onPick(lat, lng);
  }

  let route: { d: string; label: string; mid: { x: number; y: number } } | null = null;
  if (from && to) {
    const a = project(from.lat, from.lng);
    const b = project(to.lat, to.lng);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const cx = mx - (dy / len) * len * 0.18;
    const cy = my + (dx / len) * len * 0.18;
    route = {
      d: `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`,
      label: `~${roadKm(from, to)} km`,
      mid: { x: (a.x + 2 * cx + b.x) / 4, y: (a.y + 2 * cy + b.y) / 4 }
    };
  }

  return (
    <svg
      ref={svgRef}
      className={`bdmap${onPick ? " bdmap--pickable" : ""}${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      role={onPick ? "button" : "img"}
      aria-label={onPick ? "Map of Bangladesh. Tap to choose a location." : "Map of Bangladesh"}
      onClick={handleClick}
    >
      <path className="bdmap-land" d={outlinePath()} />

      {showCities &&
        MAJOR_CITIES.map((city) => {
          const p = project(city.lat, city.lng);
          return (
            <g key={city.name}>
              <circle className="bdmap-city" cx={p.x} cy={p.y} r={4} />
              <text className="bdmap-city-label" x={p.x + 8} y={p.y + 4}>
                {city.name}
              </text>
            </g>
          );
        })}

      {pins.map((pin, index) => {
        const p = project(pin.lat, pin.lng);
        return (
          <circle
            key={`${pin.name}-${index}`}
            className="bdmap-pin-extra"
            cx={p.x}
            cy={p.y}
            r={6}
          />
        );
      })}

      {route && <path className="bdmap-route" d={route.d} />}

      {from &&
        (() => {
          const p = project(from.lat, from.lng);
          return (
            <g>
              <circle className="bdmap-pin bdmap-pin--from" cx={p.x} cy={p.y} r={9} />
              <circle className="bdmap-pin-core" cx={p.x} cy={p.y} r={3.5} />
            </g>
          );
        })()}

      {to &&
        (() => {
          const p = project(to.lat, to.lng);
          return (
            <g>
              <circle className="bdmap-pin bdmap-pin--to" cx={p.x} cy={p.y} r={9} />
              <circle className="bdmap-pin-core" cx={p.x} cy={p.y} r={3.5} />
            </g>
          );
        })()}

      {route && (
        <g>
          <rect
            className="bdmap-badge"
            x={route.mid.x - 34}
            y={route.mid.y - 26}
            width={68}
            height={22}
            rx={11}
          />
          <text className="bdmap-badge-text" x={route.mid.x} y={route.mid.y - 11}>
            {route.label}
          </text>
        </g>
      )}
    </svg>
  );
}

export function distanceBetween(a: Spot, b: Spot): number {
  return haversineKm(a, b);
}
