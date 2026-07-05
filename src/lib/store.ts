// Local-first data layer. Every read/write goes through this module so the
// UI never touches storage directly — swapping in a real backend later means
// reimplementing these functions against an API, nothing else.
import type { Booking, BookingStatus, PayStatus, Profile, Ride, Spot } from "../types";
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

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
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

export function searchRides(params: {
  fromDistrict?: string;
  toDistrict?: string;
  date?: string;
}): Ride[] {
  return listUpcomingRides().filter((r) => {
    if (params.fromDistrict && r.from.district !== params.fromDistrict) return false;
    if (params.toDistrict && r.to.district !== params.toDistrict) return false;
    if (params.date && r.departure.slice(0, 10) !== params.date) return false;
    return true;
  });
}

export function getRide(id: string): Ride | undefined {
  return allRides().find((r) => r.id === id);
}

export interface NewRide {
  from: Spot;
  to: Spot;
  departure: string;
  seatsTotal: number;
  pricePerSeat: number;
  car: string;
  luggage: Ride["luggage"];
  rules: string[];
  note?: string;
}

export function createRide(input: NewRide): Ride {
  const profile = getProfile();
  const ride: Ride = {
    id: uid("ride"),
    driver: {
      id: profile.id,
      name: profile.name || "You",
      rating: null,
      trips: myRides().length,
      accent: "#2f6f64",
      phone: profile.phone || undefined
    },
    status: "active",
    createdAt: new Date().toISOString(),
    ...input
  };
  saveRides([...allRides(), ride]);
  return ride;
}

// A ride being posted pauses here while the driver completes onboarding.
export function saveRideDraft(draft: NewRide) {
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
export function refundPolicy(departure: string): { pct: number; label: string } {
  const dep = Date.parse(departure);
  const now = Date.now();
  if (now < dep - 24 * 3600 * 1000) return { pct: 100, label: "Full refund" };
  if (now < dep) return { pct: 50, label: "50% refund (within 24h of departure)" };
  return { pct: 0, label: "No refund after departure — fare goes to the driver" };
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
  payMethod: PaymentMethodId
): Booking {
  const profile = getProfile();
  const booking: Booking = {
    id: uid("bk"),
    rideId,
    guestId: profile.id,
    guestName: profile.name || "Guest",
    guestPhone: profile.phone || undefined,
    seats,
    payMethod,
    status: "pending",
    payStatus: "unpaid",
    createdAt: new Date().toISOString()
  };
  saveBookings([...allBookings(), booking]);
  return booking;
}

export function updateBookingStatus(id: string, status: BookingStatus): string | null {
  const bookings = allBookings();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return "Request not found.";
  if (status === "accepted") {
    const ride = getRide(booking.rideId);
    if (!ride) return "Ride not found.";
    if (seatsLeft(ride) < booking.seats) {
      return "Not enough seats left to accept this request.";
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
      rules: ["No smoking", "AC on highway", "Max 3 in the back"],
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
      rules: ["No smoking", "Ladies-priority front seat"],
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
      rules: ["No smoking", "Music ok"],
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
      rules: ["No smoking", "AC on highway"],
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
      rules: ["No smoking"],
      note: "Bonpara–Natore route. One stop at Sirajganj food village.",
      status: "active",
      createdAt: new Date().toISOString()
    }
  ];
  saveRides(seedRides);
}
