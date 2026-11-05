// Keeps this phone's local cache in step with the shared database.
//
//   startSync()  sign in (anonymously for now), then pull everything this user
//                may see into the localStorage keys store.ts already reads
//   live         Supabase Realtime: any change to a watched table re-pulls
//   writes       store.ts calls `call(op, args)` → a Postgres function (RPC)
//
// The rest of the app keeps using the synchronous store functions; it never
// talks to the network directly. Moving to AWS later means rewriting this
// file (and client.ts) against the new API, nothing else.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../../types";
import { getProfile, replaceCache, setRemote, TRUST_KEY } from "../store";
import { getClient } from "./client";
import {
  alertFromRow,
  blockFromRow,
  bookingFromRow,
  messageFromRow,
  notificationFromRow,
  profileFromRows,
  requestFromRow,
  rideFromRow,
  trustFromRow
} from "./mappers";

const WATCHED = [
  "rides",
  "bookings",
  "messages",
  "notifications",
  "ride_requests",
  "ride_request_offers",
  "ride_alerts",
  "blocks",
  "user_stats",
  "profiles"
];

let started = false;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> | null = null;
let again = false;
// Writes still on their way to the server. A pull now would briefly drop
// their optimistic rows from the cache, so pulls wait until these land.
let pendingWrites = 0;

function emitConnection(online: boolean) {
  try {
    window.dispatchEvent(new CustomEvent("deshride-connection", { detail: { online } }));
  } catch {
    // no window
  }
}

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? ([] as unknown)) as T;
}

// Pull everything this user may see. Row-level security does the filtering.
export async function pullAll(db: SupabaseClient, me: string): Promise<void> {
  const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const [upcoming, mine, bookings, notifications, alerts, blocks, requests, offers, stats, pub, priv] =
    await Promise.all([
      must<any[]>(db.from("rides").select("*").eq("status", "active").gt("departure", since).order("departure").limit(500)),
      must<any[]>(db.from("rides").select("*").eq("driver_id", me).order("departure", { ascending: false }).limit(200)),
      must<any[]>(db.from("bookings").select("*").order("created_at", { ascending: false }).limit(500)),
      must<any[]>(db.from("notifications").select("*").order("created_at", { ascending: false }).limit(200)),
      must<any[]>(db.from("ride_alerts").select("*")),
      must<any[]>(db.from("blocks").select("*")),
      must<any[]>(db.from("ride_requests").select("*").order("date").limit(300)),
      must<any[]>(db.from("ride_request_offers").select("*")),
      must<any[]>(db.from("user_stats").select("*").eq("user_id", me)),
      must<any[]>(db.from("profiles").select("*").eq("id", me)),
      must<any[]>(db.from("profiles_private").select("*").eq("id", me))
    ]);

  // Rides behind my bookings may have finished or been cancelled; fetch those too.
  const known = new Map<string, any>();
  for (const r of [...upcoming, ...mine]) known.set(r.id, r);
  const missing = [...new Set(bookings.map((b) => b.ride_id))].filter((id) => !known.has(id));
  if (missing.length > 0) {
    for (const r of await must<any[]>(db.from("rides").select("*").in("id", missing))) known.set(r.id, r);
  }
  const bookingIds = bookings.filter((b) => b.status === "accepted").map((b) => b.id);
  const messages =
    bookingIds.length > 0
      ? await must<any[]>(db.from("messages").select("*").in("booking_id", bookingIds).order("created_at").limit(2000))
      : [];

  // Trust numbers for everyone on screen: drivers, passengers, requesters.
  const people = new Set<string>([me]);
  known.forEach((r) => people.add(r.driver_id));
  bookings.forEach((b) => people.add(b.guest_id));
  requests.forEach((q) => people.add(q.rider_id));
  const trustRows = await must<any[]>(db.from("trust_summary").select("*").in("user_id", [...people]));

  replaceCache("deshride.rides.v1", [...known.values()].map(rideFromRow));
  replaceCache("deshride.bookings.v1", bookings.map(bookingFromRow));
  replaceCache("deshride.messages.v1", messages.map(messageFromRow));
  replaceCache("deshride.notifications.v1", notifications.map(notificationFromRow));
  replaceCache("deshride.alerts.v1", alerts.map(alertFromRow));
  replaceCache("deshride.blocks.v1", blocks.map(blockFromRow));
  replaceCache("deshride.ride-requests.v1", requests.map((q) => requestFromRow(q, offers)));
  replaceCache(TRUST_KEY, Object.fromEntries(trustRows.map((t) => [t.user_id, trustFromRow(t)])));
  const s = stats[0];
  replaceCache("deshride.stats.v1", {
    points: s?.points ?? 0,
    driverTrips: s?.driver_trips ?? 0,
    guestTrips: s?.guest_trips ?? 0,
    seatsFilled: s?.seats_filled ?? 0
  });
  replaceCache("deshride.profile.v1", profileFromRows(pub[0] ?? null, priv[0] ?? null, getProfile()));
}

// Coalesce bursts of changes (one booking touches several tables) into one pull.
function scheduleRefresh(db: SupabaseClient, me: string, delay = 250) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    if (pendingWrites > 0) {
      scheduleRefresh(db, me);
      return;
    }
    void refreshNow(db, me);
  }, delay);
}

async function refreshNow(db: SupabaseClient, me: string) {
  if (inflight) {
    again = true;
    return inflight;
  }
  inflight = pullAll(db, me)
    .then(() => emitConnection(true))
    .catch(() => emitConnection(false))
    .finally(() => {
      inflight = null;
      if (again) {
        again = false;
        scheduleRefresh(db, me, 0);
      }
    });
  return inflight;
}

// Signs in, adopts the server identity, pulls, and starts listening.
// Resolves once the first pull has landed (or failed), so the first screen
// shows real data. Without a configured backend it does nothing.
export async function startSync(): Promise<void> {
  const db = getClient();
  if (!db || started) return;
  started = true;

  let session = (await db.auth.getSession()).data.session;
  if (!session) {
    const { data, error } = await db.auth.signInAnonymously();
    if (error || !data.session) {
      started = false;
      emitConnection(false);
      return;
    }
    session = data.session;
  }
  const me = session.user.id;

  // The account id becomes the profile id. Anything typed in before the
  // first sign-in (name, phone, preferences) carries over.
  const local = getProfile();
  if (local.id !== me) {
    const adopted: Profile = { ...local, id: me };
    replaceCache("deshride.profile.v1", adopted);
  }

  // Writes go out one at a time, in the order they happened, so e.g. the
  // driver profile always reaches the server before the ride that needs it.
  let queue: Promise<unknown> = Promise.resolve();
  setRemote({
    call: (op, args) => {
      pendingWrites += 1;
      const run = queue
        .then(async () => {
          const { error } = await db.rpc(op, args);
          if (error) throw new Error(error.message);
        })
        .finally(() => {
          pendingWrites -= 1;
          scheduleRefresh(db, me);
        });
      queue = run.catch(() => undefined);
      return run;
    },
    refresh: () => scheduleRefresh(db, me, 0)
  });

  // Make sure the server has a profile row before anything references it.
  const p = getProfile();
  await db.rpc("upsert_my_profile", { p }).then(({ error }) => {
    if (error) emitConnection(false);
  });

  await refreshNow(db, me);

  const channel = db.channel("deshride-live");
  for (const table of WATCHED) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, () => scheduleRefresh(db, me));
  }
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") emitConnection(true);
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") emitConnection(false);
  });

  // Catch up after the app was in the background or the network dropped.
  const catchUp = () => scheduleRefresh(db, me, 0);
  window.addEventListener("online", catchUp);
  window.addEventListener("offline", () => emitConnection(false));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") catchUp();
  });
  // Rides can expire while the screen sits open; re-pull every 2 minutes.
  setInterval(catchUp, 2 * 60 * 1000);
}
