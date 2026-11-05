import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The backend is optional: without these two build-time variables the app
// runs entirely on the device, exactly as before. Both values are public by
// design; row-level security in the database decides what each user can see.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: "deshride.auth.v1" }
      })
    : null;

export function getClient(): SupabaseClient | null {
  return client;
}

export function backendConfigured(): boolean {
  return client !== null;
}

// Tests swap in a fake client.
export function setClientForTests(fake: SupabaseClient | null) {
  client = fake;
}
