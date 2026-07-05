import type { Spot } from "../types";

// Bounding box for mainland Bangladesh, with a little breathing room.
export const BD_BOUNDS = {
  minLat: 20.55,
  maxLat: 26.75,
  minLng: 87.95,
  maxLng: 92.8
};

// SVG canvas keeps the real-world aspect ratio at Bangladesh's latitude,
// so routes and distances read true on screen.
export const MAP_W = 500;
export const MAP_H = 696;

export function project(lat: number, lng: number): { x: number; y: number } {
  const x =
    ((lng - BD_BOUNDS.minLng) / (BD_BOUNDS.maxLng - BD_BOUNDS.minLng)) * MAP_W;
  const y =
    ((BD_BOUNDS.maxLat - lat) / (BD_BOUNDS.maxLat - BD_BOUNDS.minLat)) * MAP_H;
  return { x, y };
}

export function unproject(x: number, y: number): { lat: number; lng: number } {
  const lng =
    BD_BOUNDS.minLng + (x / MAP_W) * (BD_BOUNDS.maxLng - BD_BOUNDS.minLng);
  const lat =
    BD_BOUNDS.maxLat - (y / MAP_H) * (BD_BOUNDS.maxLat - BD_BOUNDS.minLat);
  return { lat, lng };
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Road distance runs longer than the straight line; highways average ~48 km/h
// door to door once city exits are counted.
export function roadKm(a: Spot, b: Spot): number {
  return Math.round(haversineKm(a, b) * 1.25);
}

export function estimateDuration(km: number): string {
  const hours = km / 48 + 0.4;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m.toString().padStart(2, "0")}m`;
}

// Per-seat band that beats full-car hire and competes with the AC bus:
// roughly Tk 5.5–7 per km (see docs/feasibility/02).
export function suggestedFare(km: number): { low: number; high: number; mid: number } {
  const low = Math.max(100, Math.round((km * 5.5) / 50) * 50);
  const high = Math.max(150, Math.round((km * 7) / 50) * 50);
  const mid = Math.round((low + high) / 2 / 50) * 50;
  return { low, high, mid };
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString("en-IN")}`;
}

// Simplified national outline, traced clockwise from the Sundarbans.
// Stylized on purpose: recognizable at a glance, cheap to render.
export const BD_OUTLINE: [number, number][] = [
  [21.65, 89.2],
  [22.1, 88.95],
  [22.95, 88.85],
  [23.3, 88.75],
  [23.85, 88.55],
  [24.3, 88.05],
  [24.85, 88.15],
  [25.2, 88.45],
  [25.6, 88.3],
  [26.0, 88.35],
  [26.35, 88.35],
  [26.63, 88.42],
  [26.3, 88.9],
  [25.85, 89.3],
  [25.95, 89.85],
  [25.5, 89.85],
  [25.15, 90.3],
  [25.15, 90.6],
  [25.2, 91.3],
  [25.15, 92.1],
  [25.1, 92.3],
  [24.85, 92.4],
  [24.4, 92.2],
  [24.15, 91.9],
  [23.95, 91.35],
  [23.7, 91.15],
  [23.25, 91.15],
  [22.95, 91.45],
  [23.25, 91.6],
  [23.65, 91.9],
  [23.9, 92.35],
  [23.2, 92.35],
  [22.5, 92.65],
  [21.95, 92.6],
  [21.25, 92.2],
  [20.85, 92.3],
  [21.45, 92.05],
  [21.8, 91.85],
  [22.2, 91.8],
  [22.55, 91.55],
  [22.4, 90.85],
  [22.05, 90.45],
  [21.85, 90.1],
  [22.1, 89.75],
  [21.8, 89.55]
];

let cachedOutline: string | null = null;

export function outlinePath(): string {
  if (!cachedOutline) {
    cachedOutline =
      BD_OUTLINE.map(([lat, lng], i) => {
        const { x, y } = project(lat, lng);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ") + " Z";
  }
  return cachedOutline;
}
