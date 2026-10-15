import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { FixtureMatch } from "@/components/fixtures";
import { listedSince, MATCH_COLUMNS } from "@/lib/match";
import { createClient } from "@/lib/supabase/server";
import { PLAYER_COLUMNS, type PlayerRow } from "@/lib/player";

export interface GroupRow {
  id: string;
  name: string;
  invite_code: string;
  default_format: 5 | 7;
  owner_id: string;
}

/** The group, its players and the signed-in member. 404 if the user is not a member (RLS hides the group). */
export async function loadGroup(groupId: string, path: string) {
  const { supabase, user } = await requireUser(path);
  const [{ data: group }, { data: players }] = await Promise.all([
    supabase.from("groups").select("id, name, invite_code, default_format, owner_id").eq("id", groupId).maybeSingle(),
    supabase.from("players").select(PLAYER_COLUMNS).eq("group_id", groupId).order("display_name"),
  ]);
  if (!group || !players) notFound();

  const all = players as PlayerRow[];
  const me = all.find((p) => p.user_id === user.id);
  if (!me) notFound();
  return { group: group as GroupRow, players: all, me, canManage: me.role !== "player" };
}

/** Matches from a week ago on, oldest first, with who signed up. */
export async function loadMatches(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(`${MATCH_COLUMNS}, match_players (player_id)`)
    .eq("group_id", groupId)
    .gte("starts_at", listedSince())
    .order("starts_at");
  const matches = (data ?? []) as FixtureMatch[];
  const now = Date.now();
  // the next match is the first not played that started less than 3 hours ago (still on the pitch)
  const next = matches.find((m) => m.status !== "played" && new Date(m.starts_at).getTime() > now - 3 * 3600 * 1000);
  return { matches, next };
}
