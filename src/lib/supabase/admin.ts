import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Supabase client with the secret key: bypasses row level security. Server only, and only for
 * what no user may do directly (writing recomputed ratings). Never import it from a Client Component:
 * the key is not public and would not be there anyway.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set: ratings cannot be updated");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
