-- Background jobs and live updates. Both are optional extras on plain
-- Postgres, so each step checks the feature exists first.

-- Run the lifecycle sweep every 5 minutes (Supabase ships pg_cron; on RDS,
-- enable pg_cron in the parameter group or call app.sweep_lifecycle() from a
-- scheduled Lambda instead).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'deshride-sweep';
    perform cron.schedule('deshride-sweep', '*/5 * * * *', 'select app.sweep_lifecycle()');
  end if;
end $$;

-- Stream row changes to the app (Supabase Realtime). Row-level security still
-- decides who receives each change.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['rides', 'bookings', 'messages', 'notifications', 'ride_requests',
      'ride_request_offers', 'ride_alerts', 'blocks', 'user_stats', 'profiles'] loop
      if not exists (
        select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
