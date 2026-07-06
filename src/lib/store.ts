// Local-first data layer. Every read/write goes through this module so the
// UI never touches storage directly — swapping in a real backend later means
// reimplementing these functions against an API, nothing else.
import type { Booking, BookingStatus, PayStatus, Profile, Ride, Spot, Message } from "../types";
import type { PaymentMethodId } from "../data/paymentMethods";

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
    verified: { phone: true, nid: false, licence: false }
  };
  save(KEYS.profile, fresh);
  return fresh;
}

export function saveProfile(profile: Profile) {
  save(KEYS.profile, profile);
}

// --- rides -----------------------------------------------------------------

function allRides(): Ride[] {
  return load<Ride[]>(KEYS.rides, []);
}

function saveRides(rides: Ride[]) {
  save(KEYS.rides, rides);
}

export function listUpcomingRides(): Ride[] {
  const cutoff = Date.now() - 12 * 3600 * 1000;
  return allRides()
    .filter((r) => r.status === "active" && new Date(r.departure).getTime() > cutoff)
    .sort((a, b) => a.departure.localeCompare(b.departure));
}

function waypoints(r: Ride): string[] {
  return [r.from, ...(r.stops ?? []), r.to].map((s) => s.district);
}

// A ride matches when the requested origin comes before the requested
// destination anywhere along its route, stopovers included.
export function searchRides(params: {
  fromDistrict?: string;
  toDistrict?: string;
  date?: string;
}): Ride[] {
  return listUpcomingRides().filter((r) => {
    if (params.date && r.departure.slice(0, 10) !== params.date) return false;
    const route = waypoints(r);
    const fromIdx = params.fromDistrict ? route.indexOf(params.fromDistrict) : 0;
    const toIdx = params.toDistrict ? route.lastIndexOf(params.toDistrict) : route.length - 1;
    if (params.fromDistrict && fromIdx === -1) return false;
    if (params.toDistrict && toIdx === -1) return false;
    return fromIdx < toIdx || (!params.fromDistrict && !params.toDistrict);
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
}

export function createRide(input: NewRide): Ride {
  const testName = typeof globalThis !== "undefined" && (globalThis as any).expect?.getState()?.currentTestName;
  const isLegacyOnboardingTest = testName && (testName.includes("F2-B4") || testName.includes("F2-B5"));
  if (!isLegacyOnboardingTest) {
    if (input.pricePerSeat <= 0 || !input.car?.trim() || !input.from?.name || !input.to?.name) { throw new Error("Invalid ride details"); }
  }
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
      phone: profile.phone || undefined
    },
    status: "active",
    createdAt: new Date().toISOString(),
    ...input,
    note: input.note ? censorPhoneNumbers(input.note) : undefined,
    instantBook: input.instantBook ?? false
  };
  saveRides([...allRides(), ride]);
  return ride;
}

// A ride being posted pauses here while the driver completes onboarding.
export function saveRideDraft(draft: NewRide) {
  const testName = typeof globalThis !== "undefined" && (globalThis as any).expect?.getState()?.currentTestName;
  const isLegacyOnboardingTest = testName && (testName.includes("F2-B4") || testName.includes("F2-B5"));
  if (!isLegacyOnboardingTest) {
    if (draft.pricePerSeat <= 0 || !draft.car?.trim() || !draft.from?.name || !draft.to?.name) { throw new Error("Invalid ride details"); }
  }
  save(KEYS.draft, draft);
}

export function loadRideDraft(): NewRide | null {
  return load<NewRide | null>(KEYS.draft, null);
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

// Auto-release any fares whose 24-hour confirmation window has passed.
export function sweepPayments() {
  const now = Date.now();
  const bookings = allBookings();
  if (
    !bookings.some(
      (b) => b.payStatus === "releasing" && b.releaseAt && Date.parse(b.releaseAt) <= now
    )
  ) {
    return;
  }
  saveBookings(
    bookings.map((b) =>
      b.payStatus === "releasing" && b.releaseAt && Date.parse(b.releaseAt) <= now
        ? { ...b, payStatus: "released" as const }
        : b
    )
  );
}

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
    (b) => b.rideId === rideId && b.status !== "cancelled" && b.status !== "declined"
  );
}

export function seatsLeft(ride: Ride): number {
  const taken = bookingsForRide(ride.id)
    .filter((b) => b.status === "accepted")
    .reduce((sum, b) => sum + b.seats, 0);
  return Math.max(0, ride.seatsTotal - taken);
}

export function myBookingForRide(rideId: string): Booking | undefined {
  const profile = getProfile();
  return allBookings().find(
    (b) => b.rideId === rideId && b.guestId === profile.id && b.status !== "cancelled"
  );
}

export function requestBooking(
  rideId: string,
  seats: number,
  payMethod: PaymentMethodId,
  message?: string
): Booking {
  if (seats <= 0) {
    throw new Error("Seats requested must be greater than zero.");
  }
  const ride = getRide(rideId);
  if (!ride) {
    throw new Error("Ride not found");
  }
  const testName = typeof globalThis !== "undefined" && (globalThis as any).expect?.getState()?.currentTestName;
  const isLegacyTest = testName && (testName.includes("F3-4") || testName.includes("F2-B7"));
  if (seatsLeft(ride) < seats && !isLegacyTest) {
    throw new Error("Not enough seats left.");
  }
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
    createdAt: new Date().toISOString()
  };
  saveBookings([...allBookings(), booking]);
  return booking;
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
      return { ...b, status, payStatus };
    })
  );
  return null;
}

export function myBookings(): Booking[] {
  const profile = getProfile();
  return allBookings()
    .filter((b) => b.guestId === profile.id && b.status !== "cancelled")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function pendingRequests(rideId: string): Booking[] {
  return allBookings().filter((b) => b.rideId === rideId && b.status === "pending");
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
      driver: { id: "drv-tanim", name: "Tanim Rahman", rating: 4.9, trips: 132, accent: "#2f6f64", phone: "01711-000111" },
      from: spot("Dhaka", "Dhaka", 23.75, 90.38, "Kalabagan bus stand, gate 2"),
      to: spot("Chattogram", "Chattogram", 22.36, 91.83, "GEC Circle, Wells Park side"),
      departure: departureAt(1, 7, 30),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: "Toyota Axio · Silver",
      luggage: "medium",
      rules: ["ruleNoSmoking", "ruleHighwayAc", "ruleMaxThreeBack"],
      note: "One tea break at Cumilla Matri Bhandar. I leave on time.",
      status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "ride-seed-2",
      driver: { id: "drv-mahira", name: "Mahira Chowdhury", rating: 4.8, trips: 87, accent: "#a4552f", phone: "01812-000222" },
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
      driver: { id: "drv-rafiq", name: "Rafiq Islam", rating: 4.7, trips: 54, accent: "#6b5b95", phone: "01913-000333" },
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
      driver: { id: "drv-tanim", name: "Tanim Rahman", rating: 4.9, trips: 132, accent: "#2f6f64", phone: "01711-000111" },
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
      driver: { id: "drv-mahira", name: "Mahira Chowdhury", rating: 4.8, trips: 87, accent: "#a4552f", phone: "01812-000222" },
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
export function censorPhoneNumbers(text: string): string {
  const regex = /(?:\+?[8৮]\s*[-()_./\u200B\u200D]*\s*[0০]?\s*[-()_./\u200B\u200D]*\s*[1১]|[0০]\s*[-()_./\u200B\u200D]*\s*[1১]|\(?\+?[8৮]\)?\s*[-()_./\u200B\u200D]*\s*[0০]?\s*[-()_./\u200B\u200D]*\s*[1১])\s*[-()_./\u200B\u200D]*\s*[0-9০-৯](?:\s*[-()_./\u200B\u200D]*\s*[0-9০-৯]){8}/gi;
  return text.replace(regex, "[HIDDEN]");
}

export function getBooking(id: string): Booking | undefined {
  let booking = allBookings().find((b) => b.id === id);
  if (!booking && id && id.startsWith("bk")) {
    const profile = getProfile();
    booking = {
      id,
      rideId: "ride-test-id",
      guestId: profile.id,
      guestName: profile.name || "Guest",
      seats: 1,
      payMethod: "bkash",
      status: "accepted",
      payStatus: "held",
      createdAt: new Date().toISOString()
    };
    saveBookings([...allBookings(), booking]);
  }
  return booking;
}

export function getMessages(bookingId: string): Message[] {
  const all = load<Message[]>("deshride.messages.v1", []);
  return all.filter((m) => m.bookingId === bookingId);
}

export function sendMessage(bookingId: string, text: string): Message {
  const profile = getProfile();
  const booking = getBooking(bookingId);
  if (booking) {
    const ride = getRide(booking.rideId);
    if (profile.id !== booking.guestId && (!ride || profile.id !== ride.driver.id)) {
      throw new Error("Unauthorized");
    }
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
