-- Server rule checks. Run with supabase/tests/run.sh against a scratch
-- database. Each `as_user` switches to the app's role and identity.
\set ON_ERROR_STOP 1
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'
\set C '33333333-3333-3333-3333-333333333333'

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
end $$;

-- Expect a statement to fail with a message containing `fragment`.
create or replace function pg_temp.expect_error(stmt text, fragment text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'expected an error containing "%" from: %', fragment, stmt;
exception when others then
  if position(lower(fragment) in lower(sqlerrm)) = 0 then
    raise exception 'wrong error for %: got "%", wanted "%"', stmt, sqlerrm, fragment;
  end if;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- Profiles ---------------------------------------------------------------
set role authenticated;
select pg_temp.as_user(:'A');
select public.upsert_my_profile('{"name":"Arif","phone":"01711000000","verified":{"phone":true},
  "driver":{"ownerNid":"1234567890","plate":"Dhaka Metro GA 11-2233","carColor":"Blue"}}');
select pg_temp.as_user(:'B');
select public.upsert_my_profile('{"name":"Nusrat","phone":"01811000000","bio":"call me 01811223344"}');
select pg_temp.as_user(:'C');
select public.upsert_my_profile('{"name":"Cyrus","phone":"01911000000"}');

-- B can't see A's phone, NID or plate; can see their own.
select pg_temp.as_user(:'B');
do $$ begin
  assert (select count(*) from public.profiles_private where id = '11111111-1111-1111-1111-111111111111') = 0, 'B read A''s private row';
  assert (select phone from public.profiles_private where id = '22222222-2222-2222-2222-222222222222') = '01811000000', 'B can''t read own phone';
  assert (select bio from public.profiles where id = '22222222-2222-2222-2222-222222222222') = 'call me [HIDDEN]', 'bio not censored';
end $$;

-- Rides ------------------------------------------------------------------
select pg_temp.as_user(:'A');
select pg_temp.expect_error($q$select public.create_ride('{"from":{"name":"Dhaka","district":"Dhaka","lat":23.75,"lng":90.38},
  "to":{"name":"Sylhet","district":"Sylhet","lat":24.9,"lng":91.87},"departure":"2099-01-01T08:00:00Z","seatsTotal":1,
  "pricePerSeat":1200,"car":"Axio","luggage":"small","instantBook":true}')$q$, 'Instant Book unlocks');
select public.create_ride('{"id":"ride-test000001","from":{"name":"Dhaka","district":"Dhaka","lat":23.75,"lng":90.38},
  "to":{"name":"Sylhet","district":"Sylhet","lat":24.9,"lng":91.87},"departure":"2099-01-01T08:00:00Z","seatsTotal":1,
  "pricePerSeat":1200,"car":"Axio","luggage":"small","note":"WhatsApp me 01711000000"}');
do $$ begin
  assert (select driver ? 'phone' from public.rides where id = 'ride-test000001') = false, 'phone in ride snapshot';
  assert (select driver->>'plate' from public.rides where id = 'ride-test000001') = 'Dhaka Metro GA 11-2233', 'plate missing';
  assert (select note from public.rides where id = 'ride-test000001') not like '%0171%', 'ride note not censored';
end $$;

-- Bookings ---------------------------------------------------------------
select pg_temp.as_user(:'B');
select public.request_booking('{"id":"bk-test0000b1","rideId":"ride-test000001","seats":1,"payMethod":"bkash"}');
select pg_temp.expect_error($q$select public.update_booking_status('bk-test0000b1', 'accepted')$q$, 'Only the driver');
select pg_temp.as_user(:'C');
select public.request_booking('{"id":"bk-test0000c1","rideId":"ride-test000001","seats":1,"payMethod":"nagad"}');
do $$ begin
  assert (select count(*) from public.bookings where id = 'bk-test0000b1') = 0, 'C can see B''s booking';
end $$;
select pg_temp.as_user(:'A');
do $$ begin
  assert (select count(*) from public.bookings where ride_id = 'ride-test000001') = 2, 'driver can''t see requests';
  assert (select count(*) from public.notifications where kind = 'requestNew') = 2, 'driver not notified';
end $$;
select public.update_booking_status('bk-test0000b1', 'accepted');
select pg_temp.expect_error($q$select public.update_booking_status('bk-test0000c1', 'accepted')$q$, 'Not enough seats');

-- Writing a table directly is refused.
select pg_temp.as_user(:'B');
select pg_temp.expect_error($q$update public.bookings set pay_status = 'released' where id = 'bk-test0000b1'$q$, 'permission denied');
select pg_temp.expect_error($q$insert into public.messages (id, booking_id, sender_id, sender_name, text) values ('msg-x', 'bk-test0000b1', '22222222-2222-2222-2222-222222222222', 'N', '01811223344')$q$, 'permission denied');

-- Chat -------------------------------------------------------------------
do $$ begin
  assert (public.send_message('bk-test0000b1', 'Call 01811223344')).text = 'Call [HIDDEN]', 'number not hidden';
  perform public.send_message('bk-test0000b1', 'my no 01');
  perform public.send_message('bk-test0000b1', '712');
  assert (public.send_message('bk-test0000b1', '345678')).text = '[HIDDEN]', 'split number not hidden';
  assert 'payment' = any ((public.send_message('bk-test0000b1', 'just bKash me the fare')).flags), 'payment not flagged';
end $$;
select pg_temp.as_user(:'C');
select pg_temp.expect_error($q$select public.send_message('bk-test0000b1', 'hello')$q$, 'Unauthorized');
do $$ begin
  assert (select count(*) from public.messages where booking_id = 'bk-test0000b1') = 0, 'C can read B''s chat';
end $$;

-- Blocking -----------------------------------------------------------------
select public.block_user('11111111-1111-1111-1111-111111111111', 'Arif');
do $$ begin
  assert (select count(*) from public.rides where driver_id = '11111111-1111-1111-1111-111111111111') = 0, 'blocked driver''s rides visible';
end $$;
select pg_temp.as_user(:'A');
select public.create_ride('{"id":"ride-test000002","from":{"name":"Dhaka","district":"Dhaka","lat":23.75,"lng":90.38},
  "to":{"name":"Sylhet","district":"Sylhet","lat":24.9,"lng":91.87},"departure":"2099-01-02T08:00:00Z","seatsTotal":3,
  "pricePerSeat":1200,"car":"Axio","luggage":"small"}');
select pg_temp.as_user(:'C');
select pg_temp.expect_error($q$select public.request_booking('{"rideId":"ride-test000002","seats":1,"payMethod":"bkash"}')$q$, 'can''t book');

-- Seat requests and alerts -----------------------------------------------------
select pg_temp.as_user(:'B');
select public.add_alert('Dhaka', 'Rajshahi');
select public.post_ride_request('{"id":"rq-test000001","from":{"name":"Dhaka","district":"Dhaka","lat":23.75,"lng":90.38},
  "to":{"name":"Rajshahi","district":"Rajshahi","lat":24.37,"lng":88.6},"date":"2099-01-03","seats":1}');
select pg_temp.as_user(:'A');
select public.create_ride('{"id":"ride-test000003","from":{"name":"Dhaka","district":"Dhaka","lat":23.75,"lng":90.38},
  "to":{"name":"Rajshahi","district":"Rajshahi","lat":24.37,"lng":88.6},"departure":"2099-01-03T04:00:00Z","seatsTotal":3,
  "pricePerSeat":1400,"car":"Axio","luggage":"small"}');
select public.offer_ride_to_request('rq-test000001', 'ride-test000003');
select pg_temp.as_user(:'B');
do $$ begin
  assert (select count(*) from public.notifications where kind = 'alertMatch' and ride_id = 'ride-test000003') = 1, 'alert not sent';
  assert (select count(*) from public.notifications where kind = 'seatOffer') = 1, 'offer not sent';
  assert (select count(*) from public.ride_request_offers where request_id = 'rq-test000001') = 1, 'offer not visible to rider';
end $$;

-- Segment fares -----------------------------------------------------------------
select pg_temp.as_user(:'A');
select public.create_ride('{"id":"ride-test000004","from":{"name":"Dhaka","district":"Dhaka","lat":23.75,"lng":90.38},
  "to":{"name":"Chattogram","district":"Chattogram","lat":22.36,"lng":91.83},
  "stops":[{"name":"Cumilla","district":"Cumilla","lat":23.46,"lng":91.18}],
  "departure":"2099-01-04T02:00:00Z","seatsTotal":3,"pricePerSeat":1500,"car":"Axio","luggage":"small"}');
select pg_temp.as_user(:'B');
do $$ declare b public.bookings; begin
  b := public.request_booking('{"rideId":"ride-test000004","seats":1,"payMethod":"bkash","pickupIdx":1,"dropoffIdx":2}');
  assert b.fare_per_seat between 100 and 1490 and b.fare_per_seat % 10 = 0, format('bad segment fare %s', b.fare_per_seat);
end $$;

reset role;

-- Lifecycle sweep (as the scheduler would run it) ------------------------------------
update public.bookings set expires_at = now() - interval '1 minute' where id = 'bk-test0000c1';
select app.sweep_lifecycle();
do $$ begin
  assert (select status from public.bookings where id = 'bk-test0000c1') = 'expired', 'request not expired';
  assert (select count(*) from public.notifications where kind = 'requestExpired' and booking_id = 'bk-test0000c1') = 1, 'expiry not notified';
end $$;

-- Completion, rating and no-show ------------------------------------------------------
set role authenticated;
select pg_temp.as_user(:'A');
select public.complete_ride('ride-test000001');
select public.rate_passenger('bk-test0000b1', 5);
select pg_temp.expect_error($q$select public.rate_passenger('bk-test0000b1', 4)$q$, 'Already rated');
select pg_temp.as_user(:'B');
select public.confirm_release_and_rate('bk-test0000b1', 4);
do $$ begin
  assert (select pay_status from public.bookings where id = 'bk-test0000b1') = 'released', 'fare not released';
  assert (select driver_avg from public.trust_summary where user_id = '11111111-1111-1111-1111-111111111111') = 4, 'driver rating missing';
  assert (select passenger_avg from public.trust_summary where user_id = '22222222-2222-2222-2222-222222222222') = 5, 'passenger rating missing';
end $$;
reset role;

select 'ALL RULE CHECKS PASSED' as result;
