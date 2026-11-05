-- Demo rides so a new project isn't empty. The drivers are clearly marked
-- demo accounts; nobody can sign in as them. Departures are relative to when
-- this runs, so re-run it (it replaces the demo rows) to refresh the dates.

delete from public.rides where id like 'ride-seed-%';
insert into public.profiles (id, name, verified_phone, verified_nid, is_driver, member_since, bio, prefs) values
  ('demo-tanim', 'Tanim Rahman (demo)', true, true, true, '2024-03-01', 'Weekly Dhaka–Chattogram run for work. I leave on time.', '{"chat":"some","music":true,"pets":false,"ac":true}'),
  ('demo-mahira', 'Mahira Chowdhury (demo)', true, true, true, '2024-03-01', 'Family car, my brother co-drives.', '{"chat":"quiet","music":false,"pets":false,"ac":true}'),
  ('demo-rafiq', 'Rafiq Islam (demo)', true, true, true, '2024-03-01', null, '{"chat":"chatty","music":true,"pets":true,"ac":true}')
on conflict (id) do update set name = excluded.name, bio = excluded.bio, prefs = excluded.prefs;

with d as (select date_trunc('day', now() at time zone 'Asia/Dhaka') as today)
insert into public.rides (id, driver_id, driver, from_spot, to_spot, stops, departure, seats_total, price_per_seat, car, luggage, rules, note, instant_book)
select v.id, v.driver_id,
  jsonb_build_object('id', v.driver_id, 'name', p.name, 'rating', v.rating, 'trips', v.trips, 'accent', v.accent,
    'verified', true, 'plate', v.plate, 'carColor', v.color, 'memberSince', '2024-03-01', 'bio', p.bio, 'prefs', p.prefs),
  v.from_spot::jsonb, v.to_spot::jsonb, v.stops::jsonb,
  ((select today from d) + v.day_offset * interval '1 day' + v.at) at time zone 'Asia/Dhaka',
  v.seats, v.price, v.car, v.luggage, v.rules::jsonb, v.note, v.instant
from (values
  ('ride-seed-1', 'demo-tanim', 4.9, 132, '#2f6f64', 'Dhaka Metro GA 23-4471', 'Silver',
   '{"name":"Dhaka","district":"Dhaka","lat":23.75,"lng":90.38,"note":"Kalabagan bus stand, gate 2"}',
   '{"name":"Chattogram","district":"Chattogram","lat":22.36,"lng":91.83,"note":"GEC Circle, Wells Park side"}',
   '[{"name":"Cumilla","district":"Cumilla","lat":23.46,"lng":91.18,"note":"Matri Bhandar, highway side"}]',
   1, interval '7 hours 30 minutes', 3, 1500, 'Toyota Axio · Silver', 'medium', '["ruleNoSmoking","ruleHighwayAc","ruleMaxThreeBack"]',
   'One tea break at Cumilla Matri Bhandar. I leave on time.', true),
  ('ride-seed-2', 'demo-mahira', 4.8, 87, '#a4552f', 'Dhaka Metro KHA 15-0932', 'White',
   '{"name":"Dhaka","district":"Dhaka","lat":23.87,"lng":90.4,"note":"Uttara, Jasimuddin Road front gate"}',
   '{"name":"Sylhet","district":"Sylhet","lat":24.9,"lng":91.87,"note":"Amberkhana point"}', '[]',
   1, interval '8 hours', 2, 1300, 'Toyota Fielder · White', 'large', '["ruleNoSmoking","ruleWomenFrontSeat"]',
   'Family car, my brother co-drives. Quiet ride preferred.', false),
  ('ride-seed-3', 'demo-rafiq', 4.7, 54, '#6b5b95', 'Dhaka Metro CHA 51-7720', 'Black',
   '{"name":"Dhaka","district":"Dhaka","lat":23.72,"lng":90.38,"note":"Jatrabari, Padma-bound counter side"}',
   '{"name":"Khulna","district":"Khulna","lat":22.82,"lng":89.55,"note":"Shibbari Mor"}', '[]',
   2, interval '6 hours 45 minutes', 4, 1250, 'Toyota Noah · Black', 'large', '["ruleNoSmoking","ruleMusicOk"]',
   'Padma Bridge route, no ferry. Two pickups possible on Mawa road.', false),
  ('ride-seed-4', 'demo-tanim', 4.9, 132, '#2f6f64', 'Dhaka Metro GA 23-4471', 'Silver',
   '{"name":"Chattogram","district":"Chattogram","lat":22.36,"lng":91.83,"note":"GEC Circle"}',
   '{"name":"Cox''s Bazar","district":"Cox''s Bazar","lat":21.44,"lng":91.97,"note":"Kolatoli Mor"}', '[]',
   2, interval '9 hours', 3, 800, 'Toyota Axio · Silver', 'small', '["ruleNoSmoking","ruleHighwayAc"]',
   'Beach weekend run. Light luggage only please.', false),
  ('ride-seed-5', 'demo-mahira', 4.8, 87, '#a4552f', 'Dhaka Metro KHA 15-0932', 'White',
   '{"name":"Dhaka","district":"Dhaka","lat":23.79,"lng":90.36,"note":"Gabtoli, city side"}',
   '{"name":"Rajshahi","district":"Rajshahi","lat":24.37,"lng":88.6,"note":"Shaheb Bazar Zero Point"}', '[]',
   3, interval '7 hours', 3, 1450, 'Toyota Fielder · White', 'medium', '["ruleNoSmoking"]',
   'Bonpara–Natore route. One stop at Sirajganj food village.', false)
) as v(id, driver_id, rating, trips, accent, plate, color, from_spot, to_spot, stops, day_offset, at, seats, price, car, luggage, rules, note, instant)
join public.profiles p on p.id = v.driver_id;
