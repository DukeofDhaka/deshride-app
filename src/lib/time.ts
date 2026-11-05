// Calendar dates in the rider's own time zone. `toISOString()` gives the UTC
// date, which in Bangladesh (UTC+6) is still "yesterday" until 6am — so a
// 5:30am departure would land on the wrong day. Always key days locally.

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function localDateKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return localDateKey(new Date());
}

export function tomorrowKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateKey(d);
}

// Estimated arrival = departure plus the drive time from geo.estimateDuration.
export function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3600 * 1000).toISOString();
}
