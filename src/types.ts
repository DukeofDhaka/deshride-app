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
  completedAt: string;
}

export interface Profile {
  id: string;
  name: string;
  phone: string;
  driver?: DriverDetails;
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
  createdAt: string;
}
