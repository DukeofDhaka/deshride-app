import type { Spot } from "../types";

// Bounding box for Bangladesh incl. the far-south islands, with margin.
export const BD_BOUNDS = {
  minLat: 20.3,
  maxLat: 26.7,
  minLng: 87.95,
  maxLng: 92.75
};

// SVG canvas keeps the real-world aspect ratio at Bangladesh's latitude,
// so routes and distances read true on screen.
export const MAP_W = 500;
export const MAP_H = 728;

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

// AC coach fares run roughly Tk 7–9/km on trunk routes; this is the anchor a
// per-seat price should undercut.
export function busFareEstimate(km: number): number {
  return Math.max(400, Math.round((km * 8) / 50) * 50);
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString("en-IN")}`;
}

// The big three rivers, simplified — they make the map read as Bangladesh.
export const RIVERS: [number, number][][] = [
  // Jamuna joining Padma, down to the Meghna estuary
  [
    [25.6, 89.65],
    [25.0, 89.7],
    [24.45, 89.7],
    [24.0, 89.75],
    [23.8, 89.65],
    [23.55, 90.0],
    [23.35, 90.35],
    [23.1, 90.55],
    [22.75, 90.7],
    [22.3, 90.85]
  ],
  // Padma upstream from the western border
  [
    [24.4, 88.15],
    [24.1, 88.7],
    [23.9, 89.2],
    [23.8, 89.65]
  ],
  // Upper Meghna from the Sylhet basin
  [
    [24.9, 91.4],
    [24.5, 91.1],
    [24.1, 91.0],
    [23.6, 90.85],
    [23.1, 90.55]
  ]
];

export function riverPath(points: [number, number][]): string {
  return points
    .map(([lat, lng], i) => {
      const { x, y } = project(lat, lng);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// Accurate national boundary, generated from OpenStreetMap data.
import { BD_POLYGONS } from "../data/bdOutline";

let cachedOutline: string | null = null;

export function outlinePath(): string {
  if (!cachedOutline) {
    cachedOutline = BD_POLYGONS.map((ring) =>
      ring
        .map(([lat, lng], i) => {
          const { x, y } = project(lat, lng);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ") + " Z"
    ).join(" ");
  }
  return cachedOutline;
}
