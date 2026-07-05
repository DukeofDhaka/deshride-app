import type { PaymentMethodId } from "./data/paymentMethods";

export interface Spot {
  name: string;
  district: string;
  lat: number;
  lng: number;
  note?: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  rating: number | null;
  trips: number;
  accent: string;
}

export type LuggageSize = "small" | "medium" | "large";

export type RideStatus = "active" | "completed" | "cancelled";

export interface Ride {
  id: string;
  driver: DriverInfo;
  from: Spot;
  to: Spot;
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

export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled";

// Escrow lifecycle: the fare is collected when the driver accepts ("held"),
// and paid out to the driver only after the trip completes ("released").
export type PayStatus = "unpaid" | "held" | "released" | "refunded";

export interface Booking {
  id: string;
  rideId: string;
  guestId: string;
  guestName: string;
  seats: number;
  payMethod: PaymentMethodId;
  status: BookingStatus;
  payStatus: PayStatus;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  phone: string;
  verified: {
    phone: boolean;
    nid: boolean;
    licence: boolean;
  };
}
