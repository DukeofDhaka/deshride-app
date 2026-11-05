-- DeshRide schema. Plain Postgres: the only Supabase-specific call is
-- auth.uid(), reached solely through app.current_user_id() (0003), so the
-- database can move to RDS or self-hosted Postgres by swapping that function.

create extension if not exists pgcrypto;
create schema if not exists app;

-- Public face of a user: what other riders and drivers may see.
create table if not exists public.profiles (
  id text primary key,
  name text not null default '',
  photo text,
  bio text check (bio is null or char_length(bio) <= 200),
  prefs jsonb,
  member_since timestamptz not null default now(),
  verified_phone boolean not null default false,
  verified_nid boolean not null default false,
  is_driver boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Private details: only the owner can read these (phone, NIDs, payout wallet).
create table if not exists public.profiles_private (
  id text primary key references public.profiles(id) on delete cascade,
  phone text,
  driver jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.rides (
  id text primary key,
  driver_id text not null references public.profiles(id),
  -- Snapshot shown on listings (name, rating, car, plate…). Never a phone number.
  driver jsonb not null,
  from_spot jsonb not null,
  to_spot jsonb not null,
  stops jsonb not null default '[]'::jsonb,
  departure timestamptz not null,
  seats_total int not null check (seats_total between 1 and 8),
  price_per_seat int not null check (price_per_seat > 0),
  car text not null,
  luggage text not null check (luggage in ('small', 'medium', 'large')),
  rules jsonb not null default '[]'::jsonb,
  note text,
  instant_book boolean not null default false,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  series_id text,
  created_at timestamptz not null default now()
);
create index if not exists rides_departure_idx on public.rides (departure) where status = 'active';
create index if not exists rides_driver_idx on public.rides (driver_id);

create table if not exists public.bookings (
  id text primary key,
  ride_id text not null references public.rides(id),
  guest_id text not null references public.profiles(id),
  guest_name text not null,
  seats int not null check (seats > 0),
  pay_method text not null check (pay_method in ('bkash', 'nagad', 'card')),
  status text not null check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  pay_status text not null check (pay_status in ('unpaid', 'held', 'releasing', 'released', 'refunded')),
  message text,
  rating int check (rating between 1 and 5),
  release_at timestamptz,
  refund_pct int,
  pickup_idx int,
  dropoff_idx int,
  fare_per_seat int,
  expires_at timestamptz,
  via_request boolean not null default false,
  responded_at timestamptz,
  no_show text check (no_show in ('guest', 'driver')),
  driver_rating int check (driver_rating between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists bookings_ride_idx on public.bookings (ride_id);
create index if not exists bookings_guest_idx on public.bookings (guest_id);

create table if not exists public.messages (
  id text primary key,
  booking_id text not null references public.bookings(id),
  sender_id text not null references public.profiles(id),
  sender_name text not null,
  text text not null check (char_length(text) <= 2000),
  flags text[] not null default '{}',
  -- clock_timestamp, not now(): messages sent in one transaction still order correctly.
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists messages_booking_idx on public.messages (booking_id, created_at);

create table if not exists public.notifications (
  id text primary key default ('ntf-' || substr(md5(gen_random_uuid()::text), 1, 10)),
  user_id text not null references public.profiles(id),
  kind text not null,
  booking_id text,
  ride_id text,
  request_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
-- One "trip tomorrow" reminder per person per booking.
create unique index if not exists notifications_trip_once
  on public.notifications (user_id, kind, booking_id) where kind = 'tripTomorrow';

create table if not exists public.ride_alerts (
  id text primary key,
  user_id text not null references public.profiles(id),
  from_district text,
  to_district text,
  created_at timestamptz not null default now(),
  unique (user_id, from_district, to_district)
);

create table if not exists public.blocks (
  blocker_id text not null references public.profiles(id),
  target_id text not null references public.profiles(id),
  target_name text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, target_id)
);

create table if not exists public.reports (
  id text primary key,
  reporter_id text not null references public.profiles(id),
  target_id text not null,
  target_name text not null,
  reason text not null check (reason in ('unsafeDriving', 'harassment', 'offAppPayment', 'noShow', 'other')),
  note text,
  booking_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.ride_requests (
  id text primary key,
  rider_id text not null references public.profiles(id),
  rider_name text not null,
  from_spot jsonb not null,
  to_spot jsonb not null,
  date date not null,
  seats int not null check (seats between 1 and 6),
  note text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.ride_request_offers (
  request_id text not null references public.ride_requests(id),
  ride_id text not null references public.rides(id),
  driver_id text not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (request_id, ride_id)
);

create table if not exists public.driver_ratings (
  booking_id text primary key references public.bookings(id),
  driver_id text not null,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.passenger_ratings (
  booking_id text primary key references public.bookings(id),
  guest_id text not null,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.strikes (
  user_id text primary key,
  cancelled int not null default 0,
  no_shows int not null default 0
);

create table if not exists public.user_stats (
  user_id text primary key,
  points int not null default 0,
  driver_trips int not null default 0,
  guest_trips int not null default 0,
  seats_filled int not null default 0
);
