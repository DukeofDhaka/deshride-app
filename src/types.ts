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
  phone?: string;
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

export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled";

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
