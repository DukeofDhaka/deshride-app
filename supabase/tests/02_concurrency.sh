#!/usr/bin/env bash
# Two riders grab the last seat at the same moment; exactly one may win.
set -euo pipefail
PSQL=("$@")
D='44444444-4444-4444-4444-444444444444'
"${PSQL[@]}" -q -o /dev/null <<SQL
set role authenticated;
select set_config('request.jwt.claim.sub', '$D', false);
select public.upsert_my_profile('{"name":"Driver D","driver":{"plate":"X","carColor":"Red"}}');
reset role;
insert into public.user_stats (user_id, seats_filled) values ('$D', 5) on conflict (user_id) do update set seats_filled = 5;
set role authenticated;
select set_config('request.jwt.claim.sub', '$D', false);
select public.create_ride('{"id":"ride-race000001","from":{"name":"Dhaka","district":"Dhaka","lat":23.75,"lng":90.38},
  "to":{"name":"Sylhet","district":"Sylhet","lat":24.9,"lng":91.87},"departure":"2099-02-01T08:00:00Z","seatsTotal":1,
  "pricePerSeat":1200,"car":"Axio","luggage":"small","instantBook":true}');
SQL
for i in 1 2 3 4; do
  U="5555555${i}-5555-5555-5555-555555555555"
  "${PSQL[@]}" -q -c "set role authenticated" -c "select set_config('request.jwt.claim.sub', '$U', false)" \
    -c "select public.upsert_my_profile('{\"name\":\"Racer $i\"}')" >/dev/null
done
for i in 1 2 3 4; do
  U="5555555${i}-5555-5555-5555-555555555555"
  ("${PSQL[@]}" -q -c "set role authenticated" -c "select set_config('request.jwt.claim.sub', '$U', false)" \
    -c "select public.request_booking('{\"rideId\":\"ride-race000001\",\"seats\":1,\"payMethod\":\"bkash\"}')" >/dev/null 2>&1 || true) &
done
wait
N=$("${PSQL[@]}" -Atc "select count(*) from public.bookings where ride_id = 'ride-race000001' and status = 'accepted'")
if [ "$N" != "1" ]; then echo "CONCURRENCY FAILED: $N riders got the last seat"; exit 1; fi
echo "CONCURRENCY OK: 1 of 4 simultaneous riders got the last seat"
