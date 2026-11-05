import type { PaymentMethodId } from "./data/paymentMethods";

export interface Spot {
  name: string;
  district: string;
  lat: number;
  lng: number;
  note?: string;
}

export interface TravelPrefs {
  chat: "quiet" | "some" | "chatty";
  music: boolean;
  pets: boolean;
  ac: boolean;
}

// A snapshot of the driver taken when the ride is posted, so the listing
// still reads correctly if the driver edits their profile later.
export interface DriverInfo {
  id: string;
  name: string;
  rating: number | null;
  trips: number;
  accent: string;
  // Legacy: older local rides carried the driver's number. Never displayed.
  phone?: string;
  verified?: boolean;
  photo?: string;
  bio?: string;
  prefs?: TravelPrefs;
  memberSince?: string;
  plate?: string;
  carColor?: string;
}

export type LuggageSize = "small" | "medium" | "large";

export type RideStatus = "active" | "completed" | "cancelled";

export interface Ride {
  id: string;
  driver: DriverInfo;
  from: Spot;
  to: Spot;
  stops?: Spot[];
  instantBook?: boolean;
  departure: string;
  seatsTotal: number;
  pricePerSeat: number;
  car: string;
  luggage: LuggageSize;
  rules: string[];
  note?: string;
  status: RideStatus;
  // Rides posted together as a repeating series share this id.
  seriesId?: string;
  createdAt: string;
}

// "expired": the driver didn't answer a request before its deadline.
export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

// Escrow lifecycle: the fare is collected when the driver accepts ("held").
// When the driver marks the trip done it enters "releasing" — the rider can
// confirm immediately or it auto-releases after 24 hours — then "released".
export type PayStatus = "unpaid" | "held" | "releasing" | "released" | "refunded";

export interface Booking {
  id: string;
  rideId: string;
  guestId: string;
  guestName: string;
  // Legacy, never displayed: numbers stay private to their owner.
  guestPhone?: string;
  seats: number;
  payMethod: PaymentMethodId;
  status: BookingStatus;
  payStatus: PayStatus;
  message?: string;
  rating?: number;
  releaseAt?: string;
  refundPct?: number;
  // Segment bookings (joining/leaving at a stopover): indices into
  // [from, ...stops, to] and the per-seat fare for that stretch.
  pickupIdx?: number;
  dropoffIdx?: number;
  farePerSeat?: number;
  // Requests (not Instant Book) must be answered by this time or they expire.
  expiresAt?: string;
  viaRequest?: boolean;
  respondedAt?: string;
  // Set when one side reports that the other didn't turn up.
  noShow?: "guest" | "driver";
  // The driver's rating of this passenger, after the trip.
  driverRating?: number;
  createdAt: string;
}

// Collected the first time someone publishes a ride: the identity and vehicle
// details BRTA enlistment and rider trust both depend on.
export interface DriverDetails {
  ownerNid: string;
  ownerIsDriver: boolean;
  driverNid?: string;
  plate: string;
  carColor: string;
  carPhoto?: string;
  // bKash/Nagad wallet that receives trip payouts.
  payoutMethod?: "bkash" | "nagad";
  payoutNumber?: string;
  completedAt: string;
}

export interface Profile {
  id: string;
  name: string;
  phone: string;
  driver?: DriverDetails;
  photo?: string;
  bio?: string;
  prefs?: TravelPrefs;
  memberSince?: string;
  verified: {
    phone: boolean;
    nid: boolean;
    licence: boolean;
  };
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  text: string;
  // "contact": contact details were hidden; "payment": talks about paying
  // outside the app. Both show a warning under the message.
  flags?: ("contact" | "payment")[];
  createdAt: string;
}

export interface RideAlert {
  id: string;
  userId: string;
  from?: string;
  to?: string;
  createdAt: string;
}

export type ReportReason = "unsafeDriving" | "harassment" | "offAppPayment" | "noShow" | "other";

export interface UserReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetName: string;
  reason: ReportReason;
  note?: string;
  bookingId?: string;
  createdAt: string;
}

// A rider's "seat wanted" post that drivers can answer with one of their rides.
export interface RideRequest {
  id: string;
  riderId: string;
  riderName: string;
  from: Spot;
  to: Spot;
  date: string;
  seats: number;
  note?: string;
  status: "open" | "closed";
  offers: { rideId: string; driverId: string; createdAt: string }[];
  createdAt: string;
}
