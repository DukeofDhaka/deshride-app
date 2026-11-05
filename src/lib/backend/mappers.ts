// Database rows (snake_case) ↔ the app's types (camelCase, src/types.ts).
import type { Booking, Message, Profile, Ride, RideAlert, RideRequest } from "../../types";
import type { AppNotification, TrustSummary } from "../store";

type Row = Record<string, any>;

const undef = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

export function rideFromRow(r: Row): Ride {
  return {
    id: r.id,
    driver: r.driver,
    from: r.from_spot,
    to: r.to_spot,
    stops: Array.isArray(r.stops) && r.stops.length > 0 ? r.stops : undefined,
    instantBook: r.instant_book,
    departure: new Date(r.departure).toISOString(),
    seatsTotal: r.seats_total,
    pricePerSeat: r.price_per_seat,
    car: r.car,
    luggage: r.luggage,
    rules: r.rules ?? [],
    note: undef(r.note),
    status: r.status,
    seriesId: undef(r.series_id),
    createdAt: new Date(r.created_at).toISOString()
  };
}

export function bookingFromRow(r: Row): Booking {
  return {
    id: r.id,
    rideId: r.ride_id,
    guestId: r.guest_id,
    guestName: r.guest_name,
    seats: r.seats,
    payMethod: r.pay_method,
    status: r.status,
    payStatus: r.pay_status,
    message: undef(r.message),
    rating: undef(r.rating),
    releaseAt: r.release_at ? new Date(r.release_at).toISOString() : undefined,
    refundPct: undef(r.refund_pct),
    pickupIdx: undef(r.pickup_idx),
    dropoffIdx: undef(r.dropoff_idx),
    farePerSeat: undef(r.fare_per_seat),
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
    viaRequest: r.via_request,
    respondedAt: r.responded_at ? new Date(r.responded_at).toISOString() : undefined,
    noShow: undef(r.no_show),
    driverRating: undef(r.driver_rating),
    createdAt: new Date(r.created_at).toISOString()
  };
}

export function messageFromRow(r: Row): Message {
  return {
    id: r.id,
    bookingId: r.booking_id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    text: r.text,
    ...(r.flags && r.flags.length > 0 ? { flags: r.flags } : {}),
    createdAt: new Date(r.created_at).toISOString()
  };
}

export function notificationFromRow(r: Row): AppNotification {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind,
    bookingId: undef(r.booking_id),
    rideId: undef(r.ride_id),
    requestId: undef(r.request_id),
    createdAt: new Date(r.created_at).toISOString(),
    read: r.read
  };
}

export function alertFromRow(r: Row): RideAlert {
  return {
    id: r.id,
    userId: r.user_id,
    from: undef(r.from_district),
    to: undef(r.to_district),
    createdAt: new Date(r.created_at).toISOString()
  };
}

export function requestFromRow(r: Row, offers: Row[]): RideRequest {
  return {
    id: r.id,
    riderId: r.rider_id,
    riderName: r.rider_name,
    from: r.from_spot,
    to: r.to_spot,
    date: r.date,
    seats: r.seats,
    note: undef(r.note),
    status: r.status,
    offers: offers
      .filter((o) => o.request_id === r.id)
      .map((o) => ({ rideId: o.ride_id, driverId: o.driver_id, createdAt: new Date(o.created_at).toISOString() })),
    createdAt: new Date(r.created_at).toISOString()
  };
}

export function blockFromRow(r: Row) {
  return {
    blockerId: r.blocker_id,
    targetId: r.target_id,
    targetName: r.target_name,
    createdAt: new Date(r.created_at).toISOString()
  };
}

export function profileFromRows(pub: Row | null, priv: Row | null, local: Profile): Profile {
  if (!pub) return local;
  return {
    ...local,
    id: pub.id,
    name: pub.name ?? "",
    photo: undef(pub.photo),
    bio: undef(pub.bio),
    prefs: undef(pub.prefs),
    memberSince: pub.member_since ? new Date(pub.member_since).toISOString() : local.memberSince,
    phone: priv?.phone ?? local.phone ?? "",
    driver: priv?.driver ?? local.driver,
    verified: { phone: Boolean(pub.verified_phone), nid: Boolean(pub.verified_nid), licence: Boolean(pub.verified_nid) }
  };
}

export function trustFromRow(r: Row): TrustSummary {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    driverAvg: num(r.driver_avg),
    driverCount: r.driver_count ?? 0,
    passengerAvg: num(r.passenger_avg),
    passengerCount: r.passenger_count ?? 0,
    cancelled: r.cancelled ?? 0,
    noShows: r.no_shows ?? 0,
    trips: r.trips ?? 0,
    requestsResolved: r.requests_resolved ?? 0,
    requestsAnswered: r.requests_answered ?? 0
  };
}
