import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user and a Supabase client acting as them; sends to the sign-in page otherwise. */
export async function requireUser(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
