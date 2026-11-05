-- Every write goes through these functions. They carry the same rules as
-- src/lib/store.ts, but here they are the authority: the app's local copy is
-- only a cache. All are security definer and check the caller themselves.
-- Error messages match the app's wording so they can be shown as-is.

-- ---------------------------------------------------------------- helpers

create or replace function app.new_id(prefix text) returns text
language sql volatile as $$
  select prefix || '-' || substr(md5(gen_random_uuid()::text), 1, 10)
$$;

-- Accept an id chosen by the app (so its cached row and the server row match),
-- as long as it looks like one of ours.
create or replace function app.pick_id(given text, prefix text) returns text
language sql volatile as $$
  select case when given ~ ('^' || prefix || '-[a-z0-9]{6,16}$') then given else app.new_id(prefix) end
$$;

create or replace function app.notify(uid text, kind text, booking text default null, ride text default null, request text default null)
returns void language sql volatile security definer set search_path = public, app as $$
  insert into public.notifications (user_id, kind, booking_id, ride_id, request_id)
  values (uid, kind, booking, ride, request)
  on conflict do nothing
$$;

create or replace function app.bump_stats(uid text, points int default 0, driver_trips int default 0, guest_trips int default 0, seats int default 0)
returns void language sql volatile security definer set search_path = public, app as $$
  insert into public.user_stats as s (user_id, points, driver_trips, guest_trips, seats_filled)
  values (uid, points, driver_trips, guest_trips, seats)
  on conflict (user_id) do update set
    points = s.points + excluded.points,
    driver_trips = s.driver_trips + excluded.driver_trips,
    guest_trips = s.guest_trips + excluded.guest_trips,
    seats_filled = s.seats_filled + excluded.seats_filled
$$;

create or replace function app.add_strike(uid text, kind text) returns void
language sql volatile security definer set search_path = public, app as $$
  insert into public.strikes as s (user_id, cancelled, no_shows)
  values (uid, case when kind = 'cancelled' then 1 else 0 end, case when kind = 'noShow' then 1 else 0 end)
  on conflict (user_id) do update set
    cancelled = s.cancelled + excluded.cancelled,
    no_shows = s.no_shows + excluded.no_shows
$$;

-- Road distance between two spots: great-circle km × 1.25 (as lib/geo.ts).
create or replace function app.road_km(a jsonb, b jsonb) returns int
language sql immutable as $$
  select round(
    2 * 6371 * asin(sqrt(
      power(sin(radians(((b->>'lat')::float - (a->>'lat')::float) / 2)), 2) +
      cos(radians((a->>'lat')::float)) * cos(radians((b->>'lat')::float)) *
      power(sin(radians(((b->>'lng')::float - (a->>'lng')::float) / 2)), 2)
    )) * 1.25
  )::int
$$;

create or replace function app.route_points(r public.rides) returns jsonb
language sql immutable as $$
  select jsonb_build_array(r.from_spot) || coalesce(r.stops, '[]'::jsonb) || jsonb_build_array(r.to_spot)
$$;

create or replace function app.route_km(points jsonb, from_idx int, to_idx int) returns int
language sql immutable as $$
  select coalesce(sum(app.road_km(points->(i - 1), points->i)), 0)::int
  from generate_series(from_idx + 1, to_idx) i
$$;

create or replace function app.segment_fare(r public.rides, pickup int, dropoff int) returns int
language plpgsql immutable as $$
declare pts jsonb := app.route_points(r); last int := jsonb_array_length(pts) - 1; total int; part int;
begin
  if pickup <= 0 and dropoff >= last then return r.price_per_seat; end if;
  total := app.route_km(pts, 0, last);
  part := app.route_km(pts, pickup, dropoff);
  if total <= 0 then return r.price_per_seat; end if;
  return least(r.price_per_seat, greatest(100, round(r.price_per_seat::numeric * part / total / 10) * 10));
end $$;

-- Where a rider gets on and off: {pickup, dropoff} indices into the route,
-- or null when the origin doesn't come before the destination.
create or replace function app.route_indices(r public.rides, from_district text, to_district text) returns jsonb
language plpgsql immutable as $$
declare
  districts text[] := array(select p->>'district' from jsonb_array_elements(app.route_points(r)) p);
  n int := array_length(districts, 1);
  i_from int := 0;
  i_to int := n - 1;
  i int;
begin
  if from_district is not null then
    i_from := array_position(districts, from_district) - 1;
    if i_from is null then return null; end if;
  end if;
  if to_district is not null then
    i_to := null;
    for i in reverse n..1 loop
      if districts[i] = to_district then i_to := i - 1; exit; end if;
    end loop;
    if i_to is null then return null; end if;
  end if;
  if i_from >= i_to then return null; end if;
  return jsonb_build_object('pickup', i_from, 'dropoff', i_to);
end $$;

create or replace function app.seats_left(rid text) returns int
language sql stable security definer set search_path = public, app as $$
  select greatest(0, r.seats_total - coalesce((
    select sum(b.seats) from public.bookings b where b.ride_id = r.id and b.status = 'accepted'
  ), 0))::int
  from public.rides r where r.id = rid
$$;

-- Trust numbers everyone may see, without exposing the underlying rows.
create or replace view public.trust_summary as
  select p.id as user_id,
    (select round(avg(stars)::numeric, 2) from public.driver_ratings d where d.driver_id = p.id) as driver_avg,
    (select count(*) from public.driver_ratings d where d.driver_id = p.id)::int as driver_count,
    (select round(avg(stars)::numeric, 2) from public.passenger_ratings g where g.guest_id = p.id) as passenger_avg,
    (select count(*) from public.passenger_ratings g where g.guest_id = p.id)::int as passenger_count,
    coalesce(s.cancelled, 0) as cancelled,
    coalesce(s.no_shows, 0) as no_shows,
    ((select count(*) from public.rides r where r.driver_id = p.id and r.status = 'completed')
      + (select count(*) from public.bookings b where b.guest_id = p.id and b.status = 'accepted' and b.pay_status = 'released')
      + coalesce(s.cancelled, 0))::int as trips,
    (select count(*) from public.bookings b join public.rides r on r.id = b.ride_id
      where r.driver_id = p.id and b.via_request and (b.responded_at is not null or b.status = 'expired'))::int as requests_resolved,
    (select count(*) from public.bookings b join public.rides r on r.id = b.ride_id
      where r.driver_id = p.id and b.via_request and b.responded_at is not null)::int as requests_answered
  from public.profiles p left join public.strikes s on s.user_id = p.id;
grant select on public.trust_summary to authenticated;

-- ---------------------------------------------------------------- profile

-- Creates or updates the caller's profile. Public fields go to profiles,
-- phone/NID/plate/payout to profiles_private (owner-only).
create or replace function public.upsert_my_profile(p jsonb) returns public.profiles
language plpgsql volatile security definer set search_path = public, app as $$
declare
  me text := app.require_user();
  drv jsonb := p->'driver';
  row public.profiles;
begin
  insert into public.profiles as pr (id, name, photo, bio, prefs, verified_phone, verified_nid, is_driver, member_since)
  values (
    me,
    left(coalesce(p->>'name', ''), 80),
    p->>'photo',
    nullif(left(app.censor(coalesce(p->>'bio', '')), 200), ''),
    p->'prefs',
    coalesce((p->'verified'->>'phone')::boolean, false),
    drv is not null,
    drv is not null,
    coalesce((p->>'memberSince')::timestamptz, now())
  )
  on conflict (id) do update set
    name = excluded.name,
    photo = excluded.photo,
    bio = excluded.bio,
    prefs = excluded.prefs,
    verified_phone = excluded.verified_phone,
    verified_nid = pr.verified_nid or excluded.verified_nid,
    is_driver = pr.is_driver or excluded.is_driver,
    updated_at = now()
  returning * into row;

  insert into public.profiles_private as pp (id, phone, driver)
  values (me, nullif(p->>'phone', ''), drv)
  on conflict (id) do update set
    phone = excluded.phone,
    driver = coalesce(excluded.driver, pp.driver),
    updated_at = now();
  return row;
end $$;

-- ---------------------------------------------------------------- rides

create or replace function public.create_ride(p jsonb) returns public.rides
language plpgsql volatile security definer set search_path = public, app as $$
declare
  me text := app.require_user();
  prof public.profiles;
  priv public.profiles_private;
  r public.rides;
  t public.trust_summary;
  stats public.user_stats;
  a public.ride_alerts;
begin
  select * into prof from public.profiles where id = me;
  select * into priv from public.profiles_private where id = me;
  if prof.id is null then raise exception 'Set up your profile first.'; end if;
  if priv.driver is null then raise exception 'Complete your driver profile first.'; end if;
  if coalesce((p->>'pricePerSeat')::int, 0) <= 0 or btrim(coalesce(p->>'car', '')) = ''
     or coalesce(p->'from'->>'name', '') = '' or coalesce(p->'to'->>'name', '') = ''
     or coalesce((p->>'seatsTotal')::int, 0) <= 0 then
    raise exception 'Invalid ride details';
  end if;
  if (p->>'departure')::timestamptz < now() - interval '1 hour' then
    raise exception 'The departure time must be in the future.';
  end if;
  if coalesce((p->>'instantBook')::boolean, false) then
    select * into stats from public.user_stats where user_id = me;
    if coalesce(stats.seats_filled, 0) < 5 then
      raise exception 'Instant Book unlocks after 5 seats filled.';
    end if;
  end if;
  select * into t from public.trust_summary where user_id = me;
  select * into stats from public.user_stats where user_id = me;

  insert into public.rides (id, driver_id, driver, from_spot, to_spot, stops, departure, seats_total,
    price_per_seat, car, luggage, rules, note, instant_book, series_id)
  values (
    app.pick_id(p->>'id', 'ride'),
    me,
    jsonb_strip_nulls(jsonb_build_object(
      'id', me, 'name', coalesce(nullif(prof.name, ''), 'Driver'),
      'rating', t.driver_avg, 'trips', coalesce(stats.driver_trips, 0), 'accent', '#2f6f64',
      'verified', prof.verified_nid, 'photo', prof.photo, 'bio', prof.bio, 'prefs', prof.prefs,
      'memberSince', prof.member_since, 'plate', priv.driver->>'plate', 'carColor', priv.driver->>'carColor'
    )),
    p->'from', p->'to', coalesce(p->'stops', '[]'::jsonb),
    (p->>'departure')::timestamptz,
    (p->>'seatsTotal')::int,
    (p->>'pricePerSeat')::int,
    left(btrim(p->>'car'), 80),
    coalesce(p->>'luggage', 'medium'),
    coalesce(p->'rules', '[]'::jsonb),
    nullif(app.censor(coalesce(p->>'note', '')), ''),
    coalesce((p->>'instantBook')::boolean, false),
    case when p->>'seriesId' ~ '^series-[a-z0-9]{6,16}$' then p->>'seriesId' end
  )
  returning * into r;

  -- Tell anyone watching this route.
  for a in select * from public.ride_alerts where user_id <> me loop
    if app.route_indices(r, a.from_district, a.to_district) is not null
       and not app.is_blocked_between(me, a.user_id) then
      perform app.notify(a.user_id, 'alertMatch', null, r.id);
    end if;
  end loop;
  return r;
end $$;

-- Rides cancelled by their driver: open requests close, held fares refund.
create or replace function public.cancel_ride(ride_id text) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); r public.rides; b public.bookings;
begin
  select * into r from public.rides where id = ride_id for update;
  if r.id is null or r.driver_id <> me then raise exception 'Ride not found.'; end if;
  if r.status = 'completed' then raise exception 'Cannot cancel completed ride'; end if;
  if r.status = 'cancelled' then return; end if;
  if exists (select 1 from public.bookings x where x.ride_id = r.id and x.status = 'accepted') then
    perform app.add_strike(me, 'cancelled');
  end if;
  for b in select * from public.bookings x where x.ride_id = r.id and x.status = 'accepted' loop
    perform app.notify(b.guest_id, 'rideCancelled', b.id, r.id);
  end loop;
  update public.rides set status = 'cancelled' where id = r.id;
  update public.bookings set
    status = 'cancelled',
    pay_status = case when pay_status = 'held' then 'refunded' else pay_status end,
    refund_pct = case when pay_status = 'held' then 100 else refund_pct end
  where bookings.ride_id = r.id and status in ('pending', 'accepted');
end $$;

-- Cancels the not-yet-departed rides of a series. Returns how many.
create or replace function public.cancel_ride_series(series text) returns int
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); rid text; n int := 0;
begin
  for rid in select id from public.rides
    where series_id = series and driver_id = me and status = 'active' and departure > now() loop
    perform public.cancel_ride(rid);
    n := n + 1;
  end loop;
  return n;
end $$;

-- The driver marks the trip done; held fares enter a 24-hour release window.
create or replace function public.complete_ride(ride_id text) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); r public.rides; sold int; b public.bookings;
begin
  select * into r from public.rides where id = ride_id for update;
  if r.id is null or r.driver_id <> me then raise exception 'Ride not found.'; end if;
  if r.status <> 'active' then return; end if;
  select coalesce(sum(seats), 0) into sold from public.bookings x
    where x.ride_id = r.id and x.status = 'accepted' and x.pay_status = 'held';
  update public.rides set status = 'completed' where id = r.id;
  update public.bookings set pay_status = 'releasing', release_at = now() + interval '24 hours'
    where bookings.ride_id = r.id and status = 'accepted' and pay_status = 'held';
  perform app.bump_stats(me, 50 + 10 * sold, 1, 0, sold);
  for b in select * from public.bookings x where x.ride_id = r.id and x.status = 'accepted' loop
    perform app.notify(b.guest_id, 'rateTrip', b.id, r.id);
  end loop;
  if sold > 0 then perform app.notify(me, 'ratePassengers', null, r.id); end if;
end $$;

-- ---------------------------------------------------------------- bookings

-- Seats are counted under a row lock on the ride, so two riders asking for
-- the last seat at the same moment can't both get it.
create or replace function public.request_booking(p jsonb) returns public.bookings
language plpgsql volatile security definer set search_path = public, app as $$
declare
  me text := app.require_user();
  prof public.profiles;
  r public.rides;
  b public.bookings;
  seats int := coalesce((p->>'seats')::int, 0);
  last int;
  pickup int := (p->>'pickupIdx')::int;
  dropoff int := (p->>'dropoffIdx')::int;
  is_segment boolean;
  instant boolean;
begin
  if seats <= 0 then raise exception 'Seats requested must be greater than zero.'; end if;
  select * into r from public.rides where id = p->>'rideId' for update;
  if r.id is null or r.status <> 'active' then raise exception 'Ride not found'; end if;
  if r.driver_id = me then raise exception 'You can''t book your own ride.'; end if;
  if app.is_blocked_between(me, r.driver_id) then raise exception 'You can''t book this ride.'; end if;
  if r.departure < now() - interval '12 hours' then raise exception 'This ride has already left.'; end if;
  if exists (select 1 from public.bookings x where x.ride_id = r.id and x.guest_id = me and x.status in ('pending', 'accepted')) then
    raise exception 'You already have a request on this ride.';
  end if;
  if app.seats_left(r.id) < seats then raise exception 'Not enough seats left.'; end if;
  select * into prof from public.profiles where id = me;

  last := jsonb_array_length(app.route_points(r)) - 1;
  is_segment := pickup is not null and dropoff is not null and pickup >= 0 and dropoff <= last
    and pickup < dropoff and (pickup > 0 or dropoff < last);
  instant := r.instant_book;

  insert into public.bookings (id, ride_id, guest_id, guest_name, seats, pay_method, status, pay_status,
    message, pickup_idx, dropoff_idx, fare_per_seat, expires_at, via_request)
  values (
    app.pick_id(p->>'id', 'bk'),
    r.id, me, coalesce(nullif(prof.name, ''), 'Guest'), seats,
    coalesce(p->>'payMethod', 'bkash'),
    case when instant then 'accepted' else 'pending' end,
    case when instant then 'held' else 'unpaid' end,
    nullif(app.censor(btrim(coalesce(p->>'message', ''))), ''),
    case when is_segment then pickup end,
    case when is_segment then dropoff end,
    case when is_segment then app.segment_fare(r, pickup, dropoff) end,
    case when instant then null else least(now() + interval '12 hours', r.departure) end,
    not instant
  )
  returning * into b;
  perform app.notify(r.driver_id, 'requestNew', b.id, r.id);
  return b;
end $$;

-- The driver accepts or declines a request. Accepting collects the fare
-- into escrow (simulated until the payment gateway is wired in).
create or replace function public.update_booking_status(booking_id text, new_status text) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); b public.bookings; r public.rides;
begin
  select * into b from public.bookings where id = booking_id for update;
  if b.id is null then raise exception 'Request not found.'; end if;
  select * into r from public.rides where id = b.ride_id for update;
  if r.driver_id <> me then raise exception 'Only the driver can answer this request.'; end if;
  if new_status not in ('accepted', 'declined') then raise exception 'Unknown status.'; end if;
  if b.status = new_status then return; end if;
  if b.status <> 'pending' then
    raise exception 'This request can''t be changed any more.';
  end if;
  if new_status = 'accepted' then
    if r.status <> 'active' then raise exception 'Cannot accept a booking for a cancelled ride.'; end if;
    if app.seats_left(r.id) < b.seats then raise exception 'Not enough seats left to accept this request.'; end if;
  end if;
  update public.bookings set
    status = new_status,
    pay_status = case when new_status = 'accepted' then 'held' else pay_status end,
    responded_at = now()
  where id = b.id;
  perform app.notify(b.guest_id, case when new_status = 'accepted' then 'requestAccepted' else 'requestDeclined' end, b.id, r.id);
end $$;

-- The rider cancels. Refund ladder: full more than 24h out, half inside
-- 24h, none after departure (the fare goes to the driver).
create or replace function public.cancel_my_booking(booking_id text) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); b public.bookings; r public.rides; pct int;
begin
  select * into b from public.bookings where id = booking_id for update;
  if b.id is null or b.guest_id <> me then raise exception 'Request not found.'; end if;
  if b.status not in ('pending', 'accepted') then return; end if;
  select * into r from public.rides where id = b.ride_id;
  if b.status = 'accepted' then
    perform app.add_strike(me, 'cancelled');
    perform app.notify(r.driver_id, 'bookingCancelled', b.id, r.id);
  end if;
  if b.pay_status = 'held' then
    pct := case
      when now() < r.departure - interval '24 hours' then 100
      when now() < r.departure then 50
      else 0 end;
    update public.bookings set status = 'cancelled', refund_pct = pct,
      pay_status = case when pct > 0 then 'refunded' else 'released' end
    where id = b.id;
  else
    update public.bookings set status = 'cancelled' where id = b.id;
  end if;
end $$;

-- The rider confirms the trip (releasing the fare now) and rates the driver.
create or replace function public.confirm_release_and_rate(booking_id text, stars int default null) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); b public.bookings; r public.rides;
begin
  select * into b from public.bookings where id = booking_id for update;
  if b.id is null or b.guest_id <> me then raise exception 'Request not found.'; end if;
  if b.pay_status <> 'releasing' then return; end if;
  select * into r from public.rides where id = b.ride_id;
  update public.bookings set pay_status = 'released', rating = coalesce(stars, rating) where id = b.id;
  if stars is not null then
    insert into public.driver_ratings (booking_id, driver_id, stars)
    values (b.id, r.driver_id, greatest(1, least(5, stars))) on conflict do nothing;
  end if;
  perform app.bump_stats(me, 20, 0, 1, 0);
end $$;

create or replace function public.report_no_show(booking_id text, who text) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); b public.bookings; r public.rides;
begin
  select * into b from public.bookings where id = booking_id for update;
  if b.id is null then raise exception 'Booking not found.'; end if;
  select * into r from public.rides where id = b.ride_id;
  if b.status <> 'accepted' or b.no_show is not null then raise exception 'This booking can''t be reported.'; end if;
  if now() < r.departure then raise exception 'You can report a no-show only after departure time.'; end if;
  if b.pay_status not in ('held', 'releasing') then raise exception 'This fare is already settled.'; end if;
  if who = 'guest' then
    if me <> r.driver_id then raise exception 'Only the driver can report a passenger no-show.'; end if;
    update public.bookings set no_show = 'guest', pay_status = 'released' where id = b.id;
    perform app.add_strike(b.guest_id, 'noShow');
  elsif who = 'driver' then
    if me <> b.guest_id then raise exception 'Only the passenger can report a driver no-show.'; end if;
    update public.bookings set no_show = 'driver', pay_status = 'refunded', refund_pct = 100 where id = b.id;
    perform app.add_strike(r.driver_id, 'noShow');
  else
    raise exception 'Unknown party.';
  end if;
end $$;

create or replace function public.rate_passenger(booking_id text, stars int) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); b public.bookings; r public.rides;
begin
  select * into b from public.bookings where id = booking_id for update;
  if b.id is null then raise exception 'Booking not found.'; end if;
  select * into r from public.rides where id = b.ride_id;
  if r.driver_id <> me then raise exception 'Only the driver can rate passengers.'; end if;
  if r.status <> 'completed' or b.status <> 'accepted' then raise exception 'Rate passengers after the trip.'; end if;
  if b.driver_rating is not null then raise exception 'Already rated.'; end if;
  update public.bookings set driver_rating = greatest(1, least(5, stars)) where id = b.id;
  insert into public.passenger_ratings (booking_id, guest_id, stars) values (b.id, b.guest_id, greatest(1, least(5, stars)));
  perform app.bump_stats(me, 10);
end $$;

-- ---------------------------------------------------------------- chat

-- Chat opens only between the two people on a confirmed, still-open trip.
-- Contact details are hidden here no matter what the app sent.
create or replace function public.send_message(booking_id text, body text, message_id text default null) returns public.messages
language plpgsql volatile security definer set search_path = public, app as $$
declare
  me text := app.require_user();
  b public.bookings;
  r public.rides;
  prof public.profiles;
  history text[];
  g jsonb;
  m public.messages;
begin
  if btrim(coalesce(body, '')) = '' then raise exception 'Message is empty.'; end if;
  select * into b from public.bookings where id = booking_id;
  if b.id is null then raise exception 'Booking not found'; end if;
  select * into r from public.rides where id = b.ride_id;
  if me not in (b.guest_id, r.driver_id) then raise exception 'Unauthorized'; end if;
  if b.status <> 'accepted' or r.status <> 'active' then raise exception 'This chat is closed.'; end if;
  select * into prof from public.profiles where id = me;
  history := array(
    select text from (
      select x.text, x.created_at from public.messages x
      where x.booking_id = b.id and x.sender_id = me and x.created_at > now() - interval '15 minutes'
      order by x.created_at desc limit 5
    ) recent order by created_at
  );
  g := app.guard_message(left(body, 2000), history);
  insert into public.messages (id, booking_id, sender_id, sender_name, text, flags)
  values (
    app.pick_id(message_id, 'msg'), b.id, me, coalesce(nullif(prof.name, ''), 'User'),
    g->>'text', array(select jsonb_array_elements_text(g->'flags'))
  )
  returning * into m;
  return m;
end $$;

-- ---------------------------------------------------------------- notifications, alerts

create or replace function public.mark_notifications_read() returns void
language sql volatile security definer set search_path = public, app as $$
  update public.notifications set read = true where user_id = app.require_user() and not read
$$;

create or replace function public.add_alert(from_district text, to_district text, alert_id text default null) returns public.ride_alerts
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); a public.ride_alerts;
begin
  select * into a from public.ride_alerts x
    where x.user_id = me and x.from_district is not distinct from add_alert.from_district
      and x.to_district is not distinct from add_alert.to_district;
  if a.id is not null then return a; end if;
  insert into public.ride_alerts (id, user_id, from_district, to_district)
  values (app.pick_id(alert_id, 'alert'), me, from_district, to_district)
  returning * into a;
  return a;
end $$;

create or replace function public.remove_alert(alert_id text) returns void
language sql volatile security definer set search_path = public, app as $$
  delete from public.ride_alerts where id = alert_id and user_id = app.require_user()
$$;

-- ---------------------------------------------------------------- report & block

create or replace function public.block_user(target text, target_name text) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user();
begin
  if target = me then return; end if;
  insert into public.blocks (blocker_id, target_id, target_name) values (me, target, left(target_name, 80))
  on conflict do nothing;
end $$;

create or replace function public.unblock_user(target text) returns void
language sql volatile security definer set search_path = public, app as $$
  delete from public.blocks where blocker_id = app.require_user() and target_id = target
$$;

create or replace function public.report_user(p jsonb) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user();
begin
  insert into public.reports (id, reporter_id, target_id, target_name, reason, note, booking_id)
  values (
    app.pick_id(p->>'id', 'rpt'), me, p->>'targetId', left(coalesce(p->>'targetName', ''), 80), p->>'reason',
    nullif(left(app.censor(btrim(coalesce(p->>'note', ''))), 500), ''), p->>'bookingId'
  );
end $$;

-- ---------------------------------------------------------------- seat requests

create or replace function public.post_ride_request(p jsonb) returns public.ride_requests
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); prof public.profiles; q public.ride_requests;
begin
  if coalesce(p->'from'->>'district', '') = '' or coalesce(p->'to'->>'district', '') = '' then
    raise exception 'Choose where from and where to.';
  end if;
  if p->'from'->>'district' = p->'to'->>'district' then raise exception 'Pick two different places.'; end if;
  if coalesce((p->>'seats')::int, 0) not between 1 and 6 then raise exception 'Seats must be between 1 and 6.'; end if;
  select * into prof from public.profiles where id = me;
  insert into public.ride_requests (id, rider_id, rider_name, from_spot, to_spot, date, seats, note)
  values (
    app.pick_id(p->>'id', 'rq'), me, coalesce(nullif(prof.name, ''), 'Rider'), p->'from', p->'to',
    (p->>'date')::date, (p->>'seats')::int, nullif(left(app.censor(btrim(coalesce(p->>'note', ''))), 300), '')
  )
  returning * into q;
  return q;
end $$;

create or replace function public.offer_ride_to_request(request_id text, ride_id text) returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare me text := app.require_user(); q public.ride_requests; r public.rides;
begin
  select * into q from public.ride_requests where id = request_id;
  select * into r from public.rides where id = ride_id;
  if q.id is null or q.status <> 'open' then raise exception 'This request is no longer open.'; end if;
  if r.id is null or r.driver_id <> me then raise exception 'Choose one of your own rides.'; end if;
  if app.is_blocked_between(me, q.rider_id) then raise exception 'This request is no longer open.'; end if;
  if r.status <> 'active' or (r.departure at time zone 'Asia/Dhaka')::date <> q.date
     or app.seats_left(r.id) < q.seats
     or app.route_indices(r, q.from_spot->>'district', q.to_spot->>'district') is null then
    raise exception 'That ride doesn''t match this request.';
  end if;
  insert into public.ride_request_offers (request_id, ride_id, driver_id) values (q.id, r.id, me)
  on conflict do nothing;
  if found then perform app.notify(q.rider_id, 'seatOffer', null, r.id, q.id); end if;
end $$;

create or replace function public.close_ride_request(request_id text) returns void
language sql volatile security definer set search_path = public, app as $$
  update public.ride_requests set status = 'closed' where id = request_id and rider_id = app.require_user()
$$;

-- ---------------------------------------------------------------- lifecycle

-- Expires unanswered requests, auto-releases fares after the 24h window and
-- queues "trip tomorrow" reminders. Scheduled every 5 minutes (0005_cron).
create or replace function app.sweep_lifecycle() returns void
language plpgsql volatile security definer set search_path = public, app as $$
declare b record;
begin
  for b in update public.bookings set status = 'expired'
    where status = 'pending' and expires_at <= now() returning id, guest_id, ride_id loop
    perform app.notify(b.guest_id, 'requestExpired', b.id, b.ride_id);
  end loop;
  update public.bookings set pay_status = 'released'
    where pay_status = 'releasing' and release_at <= now();
  for b in select x.id, x.guest_id, r.id as ride_id, r.driver_id from public.bookings x
    join public.rides r on r.id = x.ride_id
    where x.status = 'accepted' and r.status = 'active'
      and r.departure > now() and r.departure <= now() + interval '24 hours' loop
    perform app.notify(b.guest_id, 'tripTomorrow', b.id, b.ride_id);
    perform app.notify(b.driver_id, 'tripTomorrow', b.id, b.ride_id);
  end loop;
end $$;

-- ---------------------------------------------------------------- grants

revoke all on all functions in schema app from public;
revoke all on all functions in schema public from public;
grant execute on function app.current_user_id(), app.require_user(), app.is_blocked_between(text, text),
  app.can_see_booking(text) to authenticated;
grant execute on function
  public.upsert_my_profile(jsonb), public.create_ride(jsonb), public.cancel_ride(text),
  public.cancel_ride_series(text), public.complete_ride(text), public.request_booking(jsonb),
  public.update_booking_status(text, text), public.cancel_my_booking(text),
  public.confirm_release_and_rate(text, int), public.report_no_show(text, text),
  public.rate_passenger(text, int), public.send_message(text, text, text),
  public.mark_notifications_read(), public.add_alert(text, text, text), public.remove_alert(text),
  public.block_user(text, text), public.unblock_user(text), public.report_user(jsonb),
  public.post_ride_request(jsonb), public.offer_ride_to_request(text, text), public.close_ride_request(text)
to authenticated;
