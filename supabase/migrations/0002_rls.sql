-- Row-level security. Reads are filtered per user; every write goes through
-- the security-definer functions in 0003, so tables grant no insert/update.

-- The one place that knows how the signed-in user is identified. On Supabase
-- that is auth.uid(); after a move to AWS, swap this body to read the user id
-- from a verified Cognito JWT claim (e.g. current_setting('request.jwt.claim.sub')).
create or replace function app.current_user_id() returns text
language sql stable as $$
  select auth.uid()::text
$$;

create or replace function app.require_user() returns text
language plpgsql stable as $$
declare uid text := app.current_user_id();
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  return uid;
end $$;

create or replace function app.is_blocked_between(a text, b text) returns boolean
language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and target_id = b) or (blocker_id = b and target_id = a)
  )
$$;

create or replace function app.can_see_booking(bid text) returns boolean
language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.bookings bk join public.rides r on r.id = bk.ride_id
    where bk.id = bid and app.current_user_id() in (bk.guest_id, r.driver_id)
  )
$$;

alter table public.profiles enable row level security;
alter table public.profiles_private enable row level security;
alter table public.rides enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.ride_alerts enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.ride_requests enable row level security;
alter table public.ride_request_offers enable row level security;
alter table public.driver_ratings enable row level security;
alter table public.passenger_ratings enable row level security;
alter table public.strikes enable row level security;
alter table public.user_stats enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);

drop policy if exists private_read_own on public.profiles_private;
create policy private_read_own on public.profiles_private for select to authenticated
  using (id = app.current_user_id());

drop policy if exists rides_read on public.rides;
create policy rides_read on public.rides for select to authenticated
  using (driver_id = app.current_user_id() or not app.is_blocked_between(app.current_user_id(), driver_id));

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select to authenticated
  using (
    guest_id = app.current_user_id()
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = app.current_user_id())
  );

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (app.can_see_booking(booking_id));

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = app.current_user_id());

drop policy if exists alerts_read on public.ride_alerts;
create policy alerts_read on public.ride_alerts for select to authenticated
  using (user_id = app.current_user_id());

drop policy if exists blocks_read on public.blocks;
create policy blocks_read on public.blocks for select to authenticated
  using (blocker_id = app.current_user_id());

drop policy if exists requests_read on public.ride_requests;
create policy requests_read on public.ride_requests for select to authenticated
  using (
    rider_id = app.current_user_id()
    or (status = 'open' and not app.is_blocked_between(app.current_user_id(), rider_id))
  );

drop policy if exists offers_read on public.ride_request_offers;
create policy offers_read on public.ride_request_offers for select to authenticated
  using (
    driver_id = app.current_user_id()
    or exists (select 1 from public.ride_requests q where q.id = request_id and q.rider_id = app.current_user_id())
  );

drop policy if exists stats_read_own on public.user_stats;
create policy stats_read_own on public.user_stats for select to authenticated
  using (user_id = app.current_user_id());

-- reports, ratings and strikes have no read policy: only the aggregates in
-- public.trust_summary (0003) are exposed.

grant usage on schema public to authenticated;
grant usage on schema app to authenticated;
grant select on public.profiles, public.profiles_private, public.rides, public.bookings, public.messages,
  public.notifications, public.ride_alerts, public.blocks, public.ride_requests,
  public.ride_request_offers, public.user_stats to authenticated;
revoke insert, update, delete on all tables in schema public from authenticated, anon;
revoke all on all tables in schema public from anon;
