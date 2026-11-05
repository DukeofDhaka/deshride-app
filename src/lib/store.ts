// Local-first data layer. Every read/write goes through this module so the
// UI never touches storage directly — swapping in a real backend later means
// reimplementing these functions against an API, nothing else.
import type {
  Booking,
  BookingStatus,
  Message,
  PayStatus,
  Profile,
  ReportReason,
  Ride,
  RideAlert,
  RideRequest,
  Spot,
  UserReport
} from "../types";
import { useSyncExternalStore } from "react";
import type { PaymentMethodId } from "../data/paymentMethods";
import { localDateKey } from "./time";
import { segmentFare } from "./geo";

const KEYS = {
  profile: "deshride.profile.v1",
  rides: "deshride.rides.v1",
  bookings: "deshride.bookings.v1",
  draft: "deshride.ride-draft.v1",
  searches: "deshride.searches.v1"
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Re-render a component whenever store data changes. `read` must return a
// primitive (or a stable string) so React can compare snapshots cheaply.
export function useStoreValue<T extends string | number | boolean | null>(read: () => T): T {
  return useSyncExternalStore(subscribe, read, read);
}

function notify() {
  listeners.forEach((l) => {
    try { l(); } catch (e) {}
  });
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  notify();
  try {
    window.dispatchEvent(new Event("deshride-state-change"));
  } catch (e) {
    // ignore
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- profile ---------------------------------------------------------------

export function getProfile(): Profile {
  const existing = load<Profile | null>(KEYS.profile, null);
  if (existing) return existing;
  const fresh: Profile = {
    id: uid("user"),
    name: "",
    phone: "",
    memberSince: new Date().toISOString(),
    verified: { phone: true, nid: false, licence: false }
  };
  save(KEYS.profile, fresh);
  return fresh;
}

// The current user's id without creating a profile (safe inside renders).
function myId(): string | undefined {
  return load<Profile | null>(KEYS.profile, null)?.id;
}

export function saveProfile(profile: Profile) {
  save(KEYS.profile, {
    ...profile,
    bio: profile.bio ? censorPhoneNumbers(profile.bio.trim()).slice(0, BIO_MAX) : undefined
  });
}

export const BIO_MAX = 200;

// --- rides -----------------------------------------------------------------

function allRides(): Ride[] {
  return load<Ride[]>(KEYS.rides, []);
}

function saveRides(rides: Ride[]) {
  save(KEYS.rides, rides);
}

export function listUpcomingRides(): Ride[] {
  const cutoff = Date.now() - 12 * 3600 * 1000;
  const blocked = new Set(blockedIds());
  return allRides()
    .filter((r) => r.status === "active" && new Date(r.departure).getTime() > cutoff && !blocked.has(r.driver.id))
    .sort((a, b) => a.departure.localeCompare(b.departure));
}

function waypoints(r: Ride): string[] {
  return [r.from, ...(r.stops ?? []), r.to].map((s) => s.district);
}

// Where along a ride's route (from, stops…, to) a rider gets on and off.
// Returns null when the requested origin doesn't come before the destination.
export function routeIndices(
  ride: Ride,
  fromDistrict?: string,
  toDistrict?: string
): { pickupIdx: number; dropoffIdx: number } | null {
  const route = waypoints(ride);
  const pickupIdx = fromDistrict ? route.indexOf(fromDistrict) : 0;
  const dropoffIdx = toDistrict ? route.lastIndexOf(toDistrict) : route.length - 1;
  if (pickupIdx === -1 || dropoffIdx === -1) return null;
  if (pickupIdx >= dropoffIdx) return null;
  return { pickupIdx, dropoffIdx };
}

export function routeMatches(ride: Ride, fromDistrict?: string, toDistrict?: string): boolean {
  return routeIndices(ride, fromDistrict, toDistrict) !== null;
}

// A ride matches when the requested origin comes before the requested
// destination anywhere along its route, stopovers included. Days are
// compared in local time (see lib/time.ts).
export function searchRides(params: {
  fromDistrict?: string;
  toDistrict?: string;
  date?: string;
  seats?: number;
}): Ride[] {
  return listUpcomingRides().filter((r) => {
    if (params.date && localDateKey(r.departure) !== params.date) return false;
    if (params.seats && seatsLeft(r) < params.seats) return false;
    return routeMatches(r, params.fromDistrict, params.toDistrict);
  });
}

export function getRide(id: string): Ride | undefined {
  return allRides().find((r) => r.id === id);
}

export interface NewRide {
  from: Spot;
  to: Spot;
  stops?: Spot[];
  departure: string;
  seatsTotal: number;
  pricePerSeat: number;
  car: string;
  luggage: Ride["luggage"];
  rules: string[];
  note?: string;
  instantBook?: boolean;
  seriesId?: string;
}

function assertValidRide(input: NewRide) {
  if (
    !(input.pricePerSeat > 0) ||
    !input.car?.trim() ||
    !input.from?.name ||
    !input.to?.name ||
    !(input.seatsTotal > 0) ||
    Number.isNaN(Date.parse(input.departure))
  ) {
    throw new Error("Invalid ride details");
  }
}

export function createRide(input: NewRide): Ride {
  assertValidRide(input);
  const profile = getProfile();
  const rep = driverRating(profile.id);
  const ride: Ride = {
    id: uid("ride"),
    driver: {
      id: profile.id,
      name: profile.name || "You",
      rating: rep.avg,
      trips: getStats().driverTrips,
      accent: "#2f6f64",
      phone: profile.phone || undefined,
      verified: Boolean(profile.driver),
      plate: profile.driver?.plate,
      carColor: profile.driver?.carColor,
      photo: profile.photo,
      bio: profile.bio,
      prefs: profile.prefs,
      memberSince: profile.memberSince
    },
    status: "active",
    createdAt: new Date().toISOString(),
    ...input,
    note: input.note ? censorPhoneNumbers(input.note) : undefined,
    instantBook: input.instantBook ?? false
  };
  saveRides([...allRides(), ride]);
  notifyAlertWatchers(ride);
  return ride;
}

// Post the same trip on several dates at once (weekly commuters, Eid runs).
// `dates` are local YYYY-MM-DD keys; the time of day comes from input.departure.
export const MAX_SERIES_DATES = 10;

export function createRideSeries(input: NewRide, dates: string[]): Ride[] {
  const unique = [...new Set(dates)].sort().slice(0, MAX_SERIES_DATES);
  if (unique.length === 0) return [createRide(input)];
  const base = new Date(input.departure);
  const seriesId = unique.length > 1 ? uid("series") : undefined;
  return unique.map((key) => {
    const [y, m, d] = key.split("-").map(Number);
    const dep = new Date(base);
    dep.setFullYear(y, m - 1, d);
    return createRide({ ...input, departure: dep.toISOString(), seriesId });
  });
}

// Cancels every ride in a series that hasn't left yet.
export function cancelRideSeries(seriesId: string): number {
  const now = Date.now();
  const me = getProfile().id;
  const targets = allRides().filter(
    (r) => r.seriesId === seriesId && r.driver.id === me && r.status === "active" && Date.parse(r.departure) > now
  );
  targets.forEach((r) => cancelRide(r.id));
  return targets.length;
}

// Weekly dates on the chosen weekdays (0 = Sunday) from start to end inclusive.
export function weeklyDates(start: string, end: string, weekdays: number[]): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (d <= last && out.length < MAX_SERIES_DATES) {
    if (weekdays.includes(d.getDay())) out.push(localDateKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// A ride being posted pauses here while the driver completes onboarding.
export function saveRideDraft(draft: NewRide & { seriesDates?: string[] }) {
  assertValidRide(draft);
  save(KEYS.draft, draft);
}

export function loadRideDraft(): (NewRide & { seriesDates?: string[] }) | null {
  return load<(NewRide & { seriesDates?: string[] }) | null>(KEYS.draft, null);
}

export function clearRideDraft() {
  localStorage.removeItem(KEYS.draft);
}

export interface RecentSearch {
  from?: string;
  to?: string;
  date: string;
}

export function rememberSearch(entry: RecentSearch) {
  const existing = load<RecentSearch[]>(KEYS.searches, []).filter(
    (s) => !(s.from === entry.from && s.to === entry.to)
  );
  save(KEYS.searches, [entry, ...existing].slice(0, 5));
}

export function recentSearches(): RecentSearch[] {
  return load<RecentSearch[]>(KEYS.searches, []);
}

export function cancelRide(id: string) {
  const ride = getRide(id);
  if (ride?.status === "completed") { throw new Error("Cannot cancel completed ride"); }
  const affected = allBookings().filter((b) => b.rideId === id && b.status === "accepted");
  if (ride && ride.status === "active" && affected.length > 0) addStrike(ride.driver.id, "cancelled");
  for (const b of affected) {
    pushNotification({ userId: b.guestId, kind: "rideCancelled", bookingId: b.id, rideId: id });
  }
  saveRides(
    allRides().map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r))
  );
  // A cancelled ride takes its open requests with it; held fares go back.
  saveBookings(
    allBookings().map((b) =>
      b.rideId === id && (b.status === "pending" || b.status === "accepted")
        ? {
            ...b,
            status: "cancelled" as const,
            payStatus: b.payStatus === "held" ? ("refunded" as const) : b.payStatus
          }
        : b
    )
  );
}

export function myRides(): Ride[] {
  const profile = getProfile();
  return allRides()
    .filter((r) => r.driver.id === profile.id && r.status !== "cancelled")
    .sort((a, b) => a.departure.localeCompare(b.departure));
}

// The driver marks the trip done. Fares enter a 24-hour "releasing" window:
// the rider can confirm to release immediately, or it auto-releases.
export function completeRide(id: string) {
  const releaseAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const seatsSold = allBookings()
    .filter((b) => b.rideId === id && b.status === "accepted" && b.payStatus === "held")
    .reduce((sum, b) => sum + b.seats, 0);
  saveRides(
    allRides().map((r) => (r.id === id ? { ...r, status: "completed" as const } : r))
  );
  saveBookings(
    allBookings().map((b) =>
      b.rideId === id && b.status === "accepted" && b.payStatus === "held"
        ? { ...b, payStatus: "releasing" as const, releaseAt }
        : b
    )
  );
  const s = getStats();
  updateStats(
    { driverTrips: s.driverTrips + 1, seatsFilled: s.seatsFilled + seatsSold },
    50 + 10 * seatsSold
  );
  const ride = getRide(id);
  for (const b of acceptedBookings(id)) {
    pushNotification({ userId: b.guestId, kind: "rateTrip", bookingId: b.id, rideId: id });
  }
  if (ride && seatsSold > 0) pushNotification({ userId: ride.driver.id, kind: "ratePassengers", rideId: id });
}

// Rider taps "confirm ride" — releases their fare to the driver right away.
export function confirmRelease(bookingId: string) {
  saveBookings(
    allBookings().map((b) =>
      b.id === bookingId && b.payStatus === "releasing"
        ? { ...b, payStatus: "released" as const }
        : b
    )
  );
}

// Runs on every navigation (App.tsx). Expires unanswered requests,
// auto-releases fares whose 24-hour confirmation window has passed, and
// queues "trip tomorrow" reminders. A backend would run this on a schedule.
export function sweepLifecycle(now = Date.now()) {
  const bookings = allBookings();
  const expired: Booking[] = [];
  let changed = false;
  const next = bookings.map((b) => {
    if (b.status === "pending" && b.expiresAt && Date.parse(b.expiresAt) <= now) {
      changed = true;
      const e = { ...b, status: "expired" as const };
      expired.push(e);
      return e;
    }
    if (b.payStatus === "releasing" && b.releaseAt && Date.parse(b.releaseAt) <= now) {
      changed = true;
      return { ...b, payStatus: "released" as const };
    }
    return b;
  });
  if (changed) saveBookings(next);
  for (const b of expired) {
    pushNotification({ userId: b.guestId, kind: "requestExpired", bookingId: b.id, rideId: b.rideId });
  }
  for (const b of next) {
    if (b.status !== "accepted") continue;
    const ride = getRide(b.rideId);
    if (!ride || ride.status !== "active") continue;
    const dep = Date.parse(ride.departure);
    if (dep > now && dep - now <= 24 * 3600 * 1000) {
      const n = { kind: "tripTomorrow" as const, bookingId: b.id, rideId: ride.id };
      pushNotification({ ...n, userId: b.guestId }, notificationKey({ ...n, userId: b.guestId }));
      pushNotification({ ...n, userId: ride.driver.id }, notificationKey({ ...n, userId: ride.driver.id }));
    }
  }
}

// Kept for older callers.
export const sweepPayments = sweepLifecycle;

// Cancellation ladder: full refund more than 24h out, half inside 24h, and
// after departure the held fare goes to the driver instead.
export function refundPolicy(departure: string): { pct: number; labelKey: string } {
  const dep = Date.parse(departure);
  const now = Date.now();
  if (now < dep - 24 * 3600 * 1000) return { pct: 100, labelKey: "refundFull" };
  if (now < dep) return { pct: 50, labelKey: "refundHalf" };
  return { pct: 0, labelKey: "refundNone" };
}

export function cancelMyBooking(bookingId: string): string | null {
  const bookings = allBookings();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return "Request not found.";
  const ride = getRide(booking.rideId);
  if (booking.status === "accepted" && ride) {
    addStrike(booking.guestId, "cancelled");
    pushNotification({ userId: ride.driver.id, kind: "bookingCancelled", bookingId, rideId: ride.id });
  }
  saveBookings(
    bookings.map((b) => {
      if (b.id !== bookingId) return b;
      if (b.payStatus !== "held" || !ride) {
        return { ...b, status: "cancelled" as const };
      }
      const { pct } = refundPolicy(ride.departure);
      return {
        ...b,
        status: "cancelled" as const,
        refundPct: pct,
        payStatus: pct > 0 ? ("refunded" as const) : ("released" as const)
      };
    })
  );
  return null;
}

// --- bookings ----------------------------------------------------------------

function allBookings(): Booking[] {
  // Older records predate the escrow field; give them a sensible default.
  return load<Booking[]>(KEYS.bookings, []).map((b) => ({
    ...b,
    payStatus: b.payStatus ?? (b.status === "accepted" ? ("held" as PayStatus) : ("unpaid" as PayStatus))
  }));
}

function saveBookings(bookings: Booking[]) {
  save(KEYS.bookings, bookings);
}

export function bookingsForRide(rideId: string): Booking[] {
  return allBookings().filter(
    (b) => b.rideId === rideId && b.status !== "cancelled" && b.status !== "declined" && b.status !== "expired"
  );
}

export function seatsLeft(ride: Ride): number {
  const taken = bookingsForRide(ride.id)
    .filter((b) => b.status === "accepted")
    .reduce((sum, b) => sum + b.seats, 0);
  return Math.max(0, ride.seatsTotal - taken);
}

// What one seat costs this rider (segment bookings pay for their stretch).
// Seats are still counted against the whole trip; per-leg occupancy would
// need the driver to resell a seat after a mid-route drop-off.
export function bookingFare(booking: Booking, ride: Ride): number {
  return booking.farePerSeat ?? ride.pricePerSeat;
}

export function myBookingForRide(rideId: string): Booking | undefined {
  const profile = getProfile();
  return allBookings().find(
    (b) => b.rideId === rideId && b.guestId === profile.id && b.status !== "cancelled" && b.status !== "expired"
  );
}

export function requestBooking(
  rideId: string,
  seats: number,
  payMethod: PaymentMethodId,
  message?: string,
  segment?: { pickupIdx: number; dropoffIdx: number }
): Booking {
  if (seats <= 0) {
    throw new Error("Seats requested must be greater than zero.");
  }
  const ride = getRide(rideId);
  if (!ride) {
    throw new Error("Ride not found");
  }
  if (isBlockedBetween(getProfile().id, ride.driver.id)) {
    throw new Error("You can't book this ride.");
  }
  if (seatsLeft(ride) < seats) {
    throw new Error("Not enough seats left.");
  }
  const lastIdx = (ride.stops?.length ?? 0) + 1;
  const isSegment =
    segment !== undefined &&
    segment.pickupIdx >= 0 &&
    segment.dropoffIdx <= lastIdx &&
    segment.pickupIdx < segment.dropoffIdx &&
    (segment.pickupIdx > 0 || segment.dropoffIdx < lastIdx);
  const profile = getProfile();
  // Instant Book rides skip the approval queue: the seat is confirmed and
  // the fare goes to escrow the moment the rider books.
  const instant = Boolean(ride.instantBook);
  const booking: Booking = {
    id: uid("bk"),
    rideId,
    guestId: profile.id,
    guestName: profile.name || "Guest",
    guestPhone: profile.phone || undefined,
    seats,
    payMethod,
    message: message ? censorPhoneNumbers(message.trim()) : undefined,
    status: instant ? "accepted" : "pending",
    payStatus: instant ? "held" : "unpaid",
    viaRequest: !instant,
    expiresAt: instant ? undefined : requestDeadline(ride.departure),
    ...(isSegment
      ? {
          pickupIdx: segment!.pickupIdx,
          dropoffIdx: segment!.dropoffIdx,
          farePerSeat: segmentFare(ride, segment!.pickupIdx, segment!.dropoffIdx)
        }
      : {}),
    createdAt: new Date().toISOString()
  };
  saveBookings([...allBookings(), booking]);
  pushNotification({ userId: ride.driver.id, kind: "requestNew", bookingId: booking.id, rideId: ride.id });
  return booking;
}

// A driver has 12 hours to answer a request, or until departure if sooner.
export const REQUEST_TTL_HOURS = 12;

export function requestDeadline(departure: string, now = Date.now()): string {
  return new Date(Math.min(now + REQUEST_TTL_HOURS * 3600 * 1000, Date.parse(departure))).toISOString();
}

export function updateBookingStatus(id: string, status: BookingStatus): string | null {
  const bookings = allBookings();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return "Request not found.";
  if (status === "accepted" && booking.status === "accepted") {
    return null;
  }
  if (status === "accepted") {
    if (booking.status === "declined") {
      return "Cannot accept a declined booking.";
    }
    if (booking.status === "cancelled") {
      return "Cannot accept a cancelled booking.";
    }
    if (booking.status === "expired") {
      return "This request has expired.";
    }
    const ride = getRide(booking.rideId);
    if (!ride) return "Ride not found.";
    if (ride.status === "cancelled") {
      return "Cannot accept a booking for a cancelled ride.";
    }
    if (seatsLeft(ride) < booking.seats) {
      return "Not enough seats left to accept this request.";
    }
  }
  if (status === "declined") {
    if (booking.status === "accepted") {
      return "Cannot decline an accepted booking.";
    }
    if (booking.status === "cancelled") {
      return "Cannot decline a cancelled booking.";
    }
  }
  saveBookings(
    bookings.map((b) => {
      if (b.id !== id) return b;
      // Acceptance collects the fare into escrow; a cancelled-after-accept
      // booking refunds it. (Simulated here; the gateway does this for real.)
      let payStatus: PayStatus = b.payStatus;
      if (status === "accepted") payStatus = "held";
      if (status === "cancelled" && b.payStatus === "held") payStatus = "refunded";
      const responded = (status === "accepted" || status === "declined") && b.status === "pending";
      return { ...b, status, payStatus, respondedAt: responded ? new Date().toISOString() : b.respondedAt };
    })
  );
  if (status === "accepted" || status === "declined") {
    pushNotification({
      userId: booking.guestId,
      kind: status === "accepted" ? "requestAccepted" : "requestDeclined",
      bookingId: booking.id,
      rideId: booking.rideId
    });
  }
  return null;
}

export function myBookings(): Booking[] {
  const profile = getProfile();
  return allBookings()
    .filter((b) => b.guestId === profile.id && b.status !== "cancelled")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function pendingRequests(rideId: string): Booking[] {
  const blocked = new Set(blockedIds());
  return allBookings().filter((b) => b.rideId === rideId && b.status === "pending" && !blocked.has(b.guestId));
}

export function acceptedBookings(rideId: string): Booking[] {
  return allBookings().filter((b) => b.rideId === rideId && b.status === "accepted");
}

// --- seed data ----------------------------------------------------------------

function spot(name: string, district: string, lat: number, lng: number, note?: string): Spot {
  return { name, district, lat, lng, note };
}

function departureAt(daysFromNow: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function ensureSeed() {
  if (localStorage.getItem(KEYS.rides)) return;
  const seedRides: Ride[] = [
    {
      id: "ride-seed-1",
      driver: { id: "drv-tanim", name: "Tanim Rahman", rating: 4.9, trips: 132, accent: "#2f6f64", phone: "01711-000111", verified: true, plate: "Dhaka Metro GA 23-4471", carColor: "Silver", memberSince: "2024-03-01" },
      from: spot("Dhaka", "Dhaka", 23.75, 90.38, "Kalabagan bus stand, gate 2"),
      to: spot("Chattogram", "Chattogram", 22.36, 91.83, "GEC Circle, Wells Park side"),
      stops: [spot("Cumilla", "Cumilla", 23.46, 91.18, "Matri Bhandar, highway side")],
      departure: departureAt(1, 7, 30),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: "Toyota Axio · Silver",
      luggage: "medium",
      rules: ["ruleNoSmoking", "ruleHighwayAc", "ruleMaxThreeBack"],
      note: "One tea break at Cumilla Matri Bhandar. I leave on time.",
      instantBook: true,
      status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "ride-seed-2",
      driver: { id: "drv-mahira", name: "Mahira Chowdhury", rating: 4.8, trips: 87, accent: "#a4552f", phone: "01812-000222", verified: true, plate: "Dhaka Metro KHA 15-0932", carColor: "White", memberSince: "2024-03-01" },
      from: spot("Dhaka", "Dhaka", 23.87, 90.4, "Uttara, Jasimuddin Road front gate"),
      to: spot("Sylhet", "Sylhet", 24.9, 91.87, "Amberkhana point"),
      departure: departureAt(1, 8, 0),
      seatsTotal: 2,
      pricePerSeat: 1300,
      car: "Toyota Fielder · White",
      luggage: "large",
      rules: ["ruleNoSmoking", "ruleWomenFrontSeat"],
      note: "Family car, my brother co-drives. Quiet ride preferred.",
      status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "ride-seed-3",
      driver: { id: "drv-rafiq", name: "Rafiq Islam", rating: 4.7, trips: 54, accent: "#6b5b95", phone: "01913-000333", verified: true, plate: "Dhaka Metro CHA 51-7720", carColor: "Black", memberSince: "2024-03-01" },
      from: spot("Dhaka", "Dhaka", 23.72, 90.38, "Jatrabari, Padma-bound counter side"),
      to: spot("Khulna", "Khulna", 22.82, 89.55, "Shibbari Mor"),
      departure: departureAt(2, 6, 45),
      seatsTotal: 4,
      pricePerSeat: 1250,
      car: "Toyota Noah · Black",
      luggage: "large",
      rules: ["ruleNoSmoking", "ruleMusicOk"],
      note: "Padma Bridge route, no ferry. Two pickups possible on Mawa road.",
      status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "ride-seed-4",
      driver: { id: "drv-tanim", name: "Tanim Rahman", rating: 4.9, trips: 132, accent: "#2f6f64", phone: "01711-000111", verified: true, plate: "Dhaka Metro GA 23-4471", carColor: "Silver", memberSince: "2024-03-01" },
      from: spot("Chattogram", "Chattogram", 22.36, 91.83, "GEC Circle"),
      to: spot("Cox's Bazar", "Cox's Bazar", 21.44, 91.97, "Kolatoli Mor"),
      departure: departureAt(2, 9, 0),
      seatsTotal: 3,
      pricePerSeat: 800,
      car: "Toyota Axio · Silver",
      luggage: "small",
      rules: ["ruleNoSmoking", "ruleHighwayAc"],
      note: "Beach weekend run. Light luggage only please.",
      status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "ride-seed-5",
      driver: { id: "drv-mahira", name: "Mahira Chowdhury", rating: 4.8, trips: 87, accent: "#a4552f", phone: "01812-000222", verified: true, plate: "Dhaka Metro KHA 15-0932", carColor: "White", memberSince: "2024-03-01" },
      from: spot("Dhaka", "Dhaka", 23.79, 90.36, "Gabtoli, city side"),
      to: spot("Rajshahi", "Rajshahi", 24.37, 88.6, "Shaheb Bazar Zero Point"),
      departure: departureAt(3, 7, 0),
      seatsTotal: 3,
      pricePerSeat: 1450,
      car: "Toyota Fielder · White",
      luggage: "medium",
      rules: ["ruleNoSmoking"],
      note: "Bonpara–Natore route. One stop at Sirajganj food village.",
      status: "active",
      createdAt: new Date().toISOString()
    }
  ];
  saveRides(seedRides);
}

// --- gamification & reputation ------------------------------------------------

// Poparide's rule, adopted: Instant Book unlocks after a driver has carried
// five paying passengers. Points/levels/badges sit on top of the same stats.
export const INSTANT_BOOK_SEATS = 5;

export interface Stats {
  points: number;
  driverTrips: number;
  guestTrips: number;
  seatsFilled: number;
}

const STATS_KEY = "deshride.stats.v1";
const RATINGS_KEY = "deshride.ratings.v1";

export function getStats(): Stats {
  return load<Stats>(STATS_KEY, { points: 0, driverTrips: 0, guestTrips: 0, seatsFilled: 0 });
}

function updateStats(patch: Partial<Stats>, addPoints = 0) {
  const s = getStats();
  save(STATS_KEY, {
    points: s.points + addPoints,
    driverTrips: patch.driverTrips ?? s.driverTrips,
    guestTrips: patch.guestTrips ?? s.guestTrips,
    seatsFilled: patch.seatsFilled ?? s.seatsFilled
  });
}

export function instantBookUnlocked(): boolean {
  return getStats().seatsFilled >= INSTANT_BOOK_SEATS;
}

type RatingsMap = Record<string, number[]>;

export function addDriverRating(driverId: string, stars: number) {
  const all = load<RatingsMap>(RATINGS_KEY, {});
  all[driverId] = [...(all[driverId] ?? []), Math.max(1, Math.min(5, stars))];
  save(RATINGS_KEY, all);
}

// The rating to show for a ride's driver: live from reviews, falling back to
// the snapshot taken when the ride was posted (seed drivers have no reviews).
export function liveDriverRating(ride: Ride): number | null {
  return driverRating(ride.driver.id).avg ?? ride.driver.rating;
}

export function driverRating(driverId: string): { avg: number | null; count: number } {
  const list = load<RatingsMap>(RATINGS_KEY, {})[driverId] ?? [];
  if (list.length === 0) return { avg: null, count: 0 };
  return { avg: list.reduce((a, b) => a + b, 0) / list.length, count: list.length };
}

export interface Level {
  key: string;
  floor: number;
  next: number | null;
}

// Level ladder by DeshPoints; names resolve through i18n keys.
export const LEVELS: Level[] = [
  { key: "levelNew", floor: 0, next: 100 },
  { key: "levelRegular", floor: 100, next: 300 },
  { key: "levelRoadMaster", floor: 300, next: 800 },
  { key: "levelLegend", floor: 800, next: null }
];

export function currentLevel(points: number): Level {
  return [...LEVELS].reverse().find((l) => points >= l.floor) ?? LEVELS[0];
}

export function earnedBadges(): string[] {
  const s = getStats();
  const profile = getProfile();
  const { avg, count } = driverRating(profile.id);
  const badges: string[] = [];
  if (profile.driver) badges.push("badgeVerifiedDriver");
  if (s.driverTrips + s.guestTrips >= 1) badges.push("badgeFirstTrip");
  if (s.driverTrips >= 5) badges.push("badgeFiveTrips");
  if (instantBookUnlocked()) badges.push("badgeInstantBook");
  if (avg !== null && avg >= 4.8 && count >= 3) badges.push("badgeFiveStar");
  return badges;
}

// Rider confirms the trip and rates the driver in one step.
export function confirmReleaseAndRate(bookingId: string, stars: number | null) {
  const booking = allBookings().find((b) => b.id === bookingId);
  if (!booking) return;
  if (booking.payStatus !== "releasing") return;
  saveBookings(
    allBookings().map((b) =>
      b.id === bookingId && b.payStatus === "releasing"
        ? { ...b, payStatus: "released" as const, rating: stars ?? b.rating }
        : b
    )
  );
  const ride = getRide(booking.rideId);
  if (stars && ride) addDriverRating(ride.driver.id, stars);
  updateStats({ guestTrips: getStats().guestTrips + 1 }, 20);
}

// --- messaging -------------------------------------------------------------
// Bangladeshi mobile numbers in any common shape: +880 / 880 / 0 prefix,
// Bangla or Latin digits, with spaces, dashes, dots or zero-width joiners.
const PHONE_PATTERN =
  /(?:\+?[8৮]\s*[-()_./\u200B\u200D]*\s*[0০]?\s*[-()_./\u200B\u200D]*\s*[1১]|[0০]\s*[-()_./\u200B\u200D]*\s*[1১]|\(?\+?[8৮]\)?\s*[-()_./\u200B\u200D]*\s*[0০]?\s*[-()_./\u200B\u200D]*\s*[1১])\s*[-()_./\u200B\u200D]*\s*[0-9০-৯](?:\s*[-()_./\u200B\u200D]*\s*[0-9০-৯]){8}/.source;

export function containsPhoneNumber(text: string): boolean {
  return new RegExp(PHONE_PATTERN, "i").test(text);
}

export function censorPhoneNumbers(text: string): string {
  return text.replace(new RegExp(PHONE_PATTERN, "gi"), "[HIDDEN]");
}

export function getBooking(id: string): Booking | undefined {
  return allBookings().find((b) => b.id === id);
}

export function getMessages(bookingId: string): Message[] {
  const all = load<Message[]>("deshride.messages.v1", []);
  return all.filter((m) => m.bookingId === bookingId);
}

export function sendMessage(bookingId: string, text: string): Message {
  const profile = getProfile();
  const booking = getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const ride = getRide(booking.rideId);
  if (profile.id !== booking.guestId && (!ride || profile.id !== ride.driver.id)) {
    throw new Error("Unauthorized");
  }
  const all = load<Message[]>("deshride.messages.v1", []);
  const message: Message = {
    id: uid("msg"),
    bookingId,
    senderId: profile.id,
    senderName: profile.name || "User",
    text: censorPhoneNumbers(text),
    createdAt: new Date().toISOString()
  };
  save("deshride.messages.v1", [...all, message]);
  return message;
}


// --- notifications ----------------------------------------------------------
// On-device inbox. A real backend would fan these out as FCM push messages;
// until then they are created locally by store actions and the lifecycle sweep.

export type NotificationKind =
  | "requestNew"
  | "requestAccepted"
  | "requestDeclined"
  | "requestExpired"
  | "tripTomorrow"
  | "rateTrip"
  | "ratePassengers"
  | "alertMatch"
  | "seatOffer"
  | "rideCancelled"
  | "bookingCancelled";

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  bookingId?: string;
  rideId?: string;
  requestId?: string;
  text?: Record<string, string>;
  createdAt: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = "deshride.notifications.v1";

function allNotifications(): AppNotification[] {
  return load<AppNotification[]>(NOTIFICATIONS_KEY, []);
}

export function pushNotification(n: Omit<AppNotification, "id" | "createdAt" | "read">, dedupeKey?: string) {
  const all = allNotifications();
  if (dedupeKey && all.some((x) => notificationKey(x) === dedupeKey)) return;
  save(NOTIFICATIONS_KEY, [
    { ...n, id: uid("ntf"), createdAt: new Date().toISOString(), read: false },
    ...all
  ].slice(0, 200));
}

function notificationKey(n: Pick<AppNotification, "userId" | "kind" | "bookingId" | "rideId" | "requestId">): string {
  return [n.userId, n.kind, n.bookingId ?? "", n.rideId ?? "", n.requestId ?? ""].join("|");
}

export function myNotifications(): AppNotification[] {
  const me = getProfile().id;
  return allNotifications().filter((n) => n.userId === me);
}

export function unreadCount(): number {
  const me = load<Profile | null>(KEYS.profile, null)?.id;
  if (!me) return 0;
  return allNotifications().filter((n) => n.userId === me && !n.read).length;
}

export function markNotificationsRead() {
  const me = getProfile().id;
  const all = allNotifications();
  if (!all.some((n) => n.userId === me && !n.read)) return;
  save(NOTIFICATIONS_KEY, all.map((n) => (n.userId === me ? { ...n, read: true } : n)));
}


// --- reliability, no-shows and two-way reviews --------------------------------

const RELIABILITY_KEY = "deshride.reliability.v1";
const GUEST_RATINGS_KEY = "deshride.guest-ratings.v1";

interface Strikes {
  cancelled: number;
  noShows: number;
}

function addStrike(userId: string, kind: "cancelled" | "noShow") {
  const all = load<Record<string, Strikes>>(RELIABILITY_KEY, {});
  const cur = all[userId] ?? { cancelled: 0, noShows: 0 };
  all[userId] = kind === "cancelled" ? { ...cur, cancelled: cur.cancelled + 1 } : { ...cur, noShows: cur.noShows + 1 };
  save(RELIABILITY_KEY, all);
}

// Trips counts finished trips plus the ones this person cancelled late, so the
// cancellation rate reads as "cancelled 1 of 20".
export function reliability(userId: string): { trips: number; cancelled: number; noShows: number } {
  const strikes = load<Record<string, Strikes>>(RELIABILITY_KEY, {})[userId] ?? { cancelled: 0, noShows: 0 };
  const drove = allRides().filter((r) => r.driver.id === userId && r.status === "completed").length;
  const rode = allBookings().filter((b) => b.guestId === userId && b.status === "accepted" && b.payStatus === "released").length;
  return { trips: drove + rode + strikes.cancelled, cancelled: strikes.cancelled, noShows: strikes.noShows };
}

// Share of booking requests the driver answered before they expired.
export function responseStats(driverId: string): { rate: number; total: number } {
  const rideIds = new Set(allRides().filter((r) => r.driver.id === driverId).map((r) => r.id));
  const resolved = allBookings().filter(
    (b) => rideIds.has(b.rideId) && b.viaRequest && (b.respondedAt || b.status === "expired")
  );
  if (resolved.length === 0) return { rate: 1, total: 0 };
  return { rate: resolved.filter((b) => b.respondedAt).length / resolved.length, total: resolved.length };
}

// After departure either side can report that the other didn't turn up.
// A driver no-show refunds the rider in full; a rider no-show releases the
// held fare to the driver. Both count against the no-show's reliability.
export function reportNoShow(bookingId: string, who: "guest" | "driver"): string | null {
  const booking = getBooking(bookingId);
  if (!booking) return "Booking not found.";
  const ride = getRide(booking.rideId);
  if (!ride) return "Ride not found.";
  const me = getProfile().id;
  if (booking.status !== "accepted" || booking.noShow) return "This booking can't be reported.";
  if (Date.now() < Date.parse(ride.departure)) return "You can report a no-show only after departure time.";
  if (who === "guest") {
    if (me !== ride.driver.id) return "Only the driver can report a passenger no-show.";
    if (booking.payStatus !== "held" && booking.payStatus !== "releasing") return "This fare is already settled.";
    saveBookings(
      allBookings().map((b) => (b.id === bookingId ? { ...b, noShow: "guest" as const, payStatus: "released" as const } : b))
    );
    addStrike(booking.guestId, "noShow");
  } else {
    if (me !== booking.guestId) return "Only the passenger can report a driver no-show.";
    if (booking.payStatus !== "held" && booking.payStatus !== "releasing") return "This fare is already settled.";
    saveBookings(
      allBookings().map((b) =>
        b.id === bookingId ? { ...b, noShow: "driver" as const, payStatus: "refunded" as const, refundPct: 100 } : b
      )
    );
    addStrike(ride.driver.id, "noShow");
  }
  return null;
}

// The driver rates each passenger once the trip is done.
export function ratePassenger(bookingId: string, stars: number): string | null {
  const booking = getBooking(bookingId);
  if (!booking) return "Booking not found.";
  const ride = getRide(booking.rideId);
  if (!ride || ride.driver.id !== getProfile().id) return "Only the driver can rate passengers.";
  if (ride.status !== "completed" || booking.status !== "accepted") return "Rate passengers after the trip.";
  if (booking.driverRating) return "Already rated.";
  const value = Math.max(1, Math.min(5, Math.round(stars)));
  saveBookings(allBookings().map((b) => (b.id === bookingId ? { ...b, driverRating: value } : b)));
  const all = load<Record<string, number[]>>(GUEST_RATINGS_KEY, {});
  all[booking.guestId] = [...(all[booking.guestId] ?? []), value];
  save(GUEST_RATINGS_KEY, all);
  updateStats({}, 10);
  return null;
}

export function passengerRating(guestId: string): { avg: number | null; count: number } {
  const list = load<Record<string, number[]>>(GUEST_RATINGS_KEY, {})[guestId] ?? [];
  if (list.length === 0) return { avg: null, count: 0 };
  return { avg: list.reduce((a, b) => a + b, 0) / list.length, count: list.length };
}


// --- ride alerts -------------------------------------------------------------
// "Tell me when a ride is posted on this route." Matching runs locally when a
// ride is created on this device; a backend would match server-side and push.

const ALERTS_KEY = "deshride.alerts.v1";
const ALERTS_SEEN_KEY = "deshride.alerts-seen.v1";

function allAlerts(): RideAlert[] {
  return load<RideAlert[]>(ALERTS_KEY, []);
}

export function listAlerts(): RideAlert[] {
  const me = myId();
  return allAlerts().filter((a) => a.userId === me);
}

export function findAlert(from?: string, to?: string): RideAlert | undefined {
  return listAlerts().find((a) => a.from === from && a.to === to);
}

export function addAlert(from?: string, to?: string): RideAlert {
  const existing = findAlert(from, to);
  if (existing) return existing;
  const alert: RideAlert = { id: uid("alert"), userId: getProfile().id, from, to, createdAt: new Date().toISOString() };
  save(ALERTS_KEY, [...allAlerts(), alert]);
  return alert;
}

export function removeAlert(id: string) {
  save(ALERTS_KEY, allAlerts().filter((a) => a.id !== id));
}

// Rides posted after an alert was set, on its route, not yet seen.
export function alertMatches(): { alert: RideAlert; rides: Ride[] }[] {
  const seen = new Set(load<string[]>(ALERTS_SEEN_KEY, []));
  const me = myId();
  const upcoming = listUpcomingRides().filter((r) => r.driver.id !== me);
  return listAlerts()
    .map((alert) => ({
      alert,
      rides: upcoming.filter(
        (r) => r.createdAt > alert.createdAt && !seen.has(r.id) && routeMatches(r, alert.from, alert.to)
      )
    }))
    .filter((m) => m.rides.length > 0);
}

export function markAlertRidesSeen(rideIds: string[]) {
  const seen = load<string[]>(ALERTS_SEEN_KEY, []);
  save(ALERTS_SEEN_KEY, [...new Set([...seen, ...rideIds])].slice(-500));
}

function notifyAlertWatchers(ride: Ride) {
  for (const alert of allAlerts()) {
    if (alert.userId === ride.driver.id) continue;
    if (routeMatches(ride, alert.from, alert.to)) {
      pushNotification({ userId: alert.userId, kind: "alertMatch", rideId: ride.id });
    }
  }
}

// --- report & block -----------------------------------------------------------

const REPORTS_KEY = "deshride.reports.v1";
const BLOCKS_KEY = "deshride.blocks.v1";

interface BlockEntry {
  blockerId: string;
  targetId: string;
  targetName: string;
  createdAt: string;
}

function allBlocks(): BlockEntry[] {
  return load<BlockEntry[]>(BLOCKS_KEY, []);
}

// People the current user has blocked (their rides and requests are hidden).
export function blockedIds(): string[] {
  const me = load<Profile | null>(KEYS.profile, null)?.id;
  return allBlocks().filter((b) => b.blockerId === me).map((b) => b.targetId);
}

export function blockedPeople(): BlockEntry[] {
  const me = getProfile().id;
  return allBlocks().filter((b) => b.blockerId === me);
}

// Either side blocking stops a booking between them.
export function isBlockedBetween(a: string, b: string): boolean {
  return allBlocks().some((x) => (x.blockerId === a && x.targetId === b) || (x.blockerId === b && x.targetId === a));
}

export function blockUser(targetId: string, targetName: string) {
  const me = getProfile().id;
  if (targetId === me || allBlocks().some((b) => b.blockerId === me && b.targetId === targetId)) return;
  save(BLOCKS_KEY, [...allBlocks(), { blockerId: me, targetId, targetName, createdAt: new Date().toISOString() }]);
}

export function unblockUser(targetId: string) {
  const me = getProfile().id;
  save(BLOCKS_KEY, allBlocks().filter((b) => !(b.blockerId === me && b.targetId === targetId)));
}

export function reportUser(input: {
  targetId: string;
  targetName: string;
  reason: ReportReason;
  note?: string;
  bookingId?: string;
}): UserReport {
  const report: UserReport = {
    id: uid("rpt"),
    reporterId: getProfile().id,
    ...input,
    note: input.note ? censorPhoneNumbers(input.note.trim()).slice(0, 500) : undefined,
    createdAt: new Date().toISOString()
  };
  save(REPORTS_KEY, [...load<UserReport[]>(REPORTS_KEY, []), report]);
  return report;
}

export function myReports(): UserReport[] {
  const me = getProfile().id;
  return load<UserReport[]>(REPORTS_KEY, []).filter((r) => r.reporterId === me);
}

// --- seat requests (riders posting "seat wanted") ------------------------------

const RIDE_REQUESTS_KEY = "deshride.ride-requests.v1";

function allRideRequests(): RideRequest[] {
  return load<RideRequest[]>(RIDE_REQUESTS_KEY, []);
}

export function postRideRequest(input: { from: Spot; to: Spot; date: string; seats: number; note?: string }): RideRequest {
  if (!input.from?.district || !input.to?.district) throw new Error("Choose where from and where to.");
  if (input.from.district === input.to.district) throw new Error("Pick two different places.");
  if (!(input.seats >= 1 && input.seats <= 6)) throw new Error("Seats must be between 1 and 6.");
  const profile = getProfile();
  const req: RideRequest = {
    id: uid("rq"),
    riderId: profile.id,
    riderName: profile.name || "Rider",
    from: input.from,
    to: input.to,
    date: input.date,
    seats: input.seats,
    note: input.note ? censorPhoneNumbers(input.note.trim()).slice(0, 300) : undefined,
    status: "open",
    offers: [],
    createdAt: new Date().toISOString()
  };
  save(RIDE_REQUESTS_KEY, [...allRideRequests(), req]);
  return req;
}

export function openRideRequests(filter: { from?: string; to?: string } = {}): RideRequest[] {
  const today = localDateKey(new Date());
  const blocked = new Set(blockedIds());
  return allRideRequests()
    .filter(
      (r) =>
        r.status === "open" &&
        r.date >= today &&
        !blocked.has(r.riderId) &&
        (!filter.from || r.from.district === filter.from) &&
        (!filter.to || r.to.district === filter.to)
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function myRideRequests(): RideRequest[] {
  const me = getProfile().id;
  return allRideRequests().filter((r) => r.riderId === me && r.status === "open");
}

export function getRideRequest(id: string): RideRequest | undefined {
  return allRideRequests().find((r) => r.id === id);
}

// The driver's own upcoming rides that would carry this rider.
export function matchingRidesForRequest(req: RideRequest): Ride[] {
  const me = getProfile().id;
  return allRides().filter(
    (r) =>
      r.driver.id === me &&
      r.status === "active" &&
      localDateKey(r.departure) === req.date &&
      seatsLeft(r) >= req.seats &&
      routeMatches(r, req.from.district, req.to.district)
  );
}

export function offerRideToRequest(requestId: string, rideId: string): string | null {
  const req = getRideRequest(requestId);
  const ride = getRide(rideId);
  const me = getProfile().id;
  if (!req || req.status !== "open") return "This request is no longer open.";
  if (!ride || ride.driver.id !== me) return "Choose one of your own rides.";
  if (!matchingRidesForRequest(req).some((r) => r.id === rideId)) return "That ride doesn't match this request.";
  if (req.offers.some((o) => o.rideId === rideId)) return null;
  save(
    RIDE_REQUESTS_KEY,
    allRideRequests().map((r) =>
      r.id === requestId ? { ...r, offers: [...r.offers, { rideId, driverId: me, createdAt: new Date().toISOString() }] } : r
    )
  );
  pushNotification({ userId: req.riderId, kind: "seatOffer", requestId, rideId });
  return null;
}

export function closeRideRequest(requestId: string) {
  const me = getProfile().id;
  save(
    RIDE_REQUESTS_KEY,
    allRideRequests().map((r) => (r.id === requestId && r.riderId === me ? { ...r, status: "closed" as const } : r))
  );
}

// --- money: fare breakdown, receipts, earnings -----------------------------------
// Riders pay the listed fare and nothing more; DeshRide's 12% commission comes
// out of the driver's side when escrow releases (docs/feasibility/05 §4).

export const COMMISSION_RATE = 0.12;

export function fareBreakdown(booking: Booking, ride: Ride): { gross: number; commission: number; driverNet: number } {
  const gross = bookingFare(booking, ride) * booking.seats;
  const commission = Math.round(gross * COMMISSION_RATE);
  return { gross, commission, driverNet: gross - commission };
}

export interface EarningLine {
  booking: Booking;
  ride: Ride;
  gross: number;
  commission: number;
  driverNet: number;
}

export function driverEarnings(): {
  held: number;
  releasing: number;
  paid: number;
  lines: EarningLine[];
} {
  const me = getProfile().id;
  const rides = new Map(allRides().filter((r) => r.driver.id === me).map((r) => [r.id, r]));
  const lines: EarningLine[] = [];
  for (const b of allBookings()) {
    const ride = rides.get(b.rideId);
    if (!ride) continue;
    if (!["held", "releasing", "released"].includes(b.payStatus)) continue;
    lines.push({ booking: b, ride, ...fareBreakdown(b, ride) });
  }
  lines.sort((a, b) => b.ride.departure.localeCompare(a.ride.departure));
  const sum = (status: PayStatus) =>
    lines.filter((l) => l.booking.payStatus === status).reduce((t, l) => t + l.driverNet, 0);
  return { held: sum("held"), releasing: sum("releasing"), paid: sum("released"), lines };
}
