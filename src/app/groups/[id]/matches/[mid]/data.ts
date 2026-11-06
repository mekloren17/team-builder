import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MATCH_COLUMNS, MATCH_PLAYER_COLUMNS, type MatchPlayerRow, type MatchRow, type PairConstraintRow } from "@/lib/match";
import { loadGroup } from "../../data";

/** The match with its sign-ups and constraints, plus everything loadGroup returns. */
export async function loadMatch(groupId: string, matchId: string, path: string) {
  const groupData = await loadGroup(groupId, path);
  const supabase = await createClient();
  const [{ data: match }, { data: signups }, { data: constraints }] = await Promise.all([
    supabase.from("matches").select(MATCH_COLUMNS).eq("id", matchId).eq("group_id", groupId).maybeSingle(),
    supabase.from("match_players").select(MATCH_PLAYER_COLUMNS).eq("match_id", matchId),
    supabase.from("pair_constraints").select("id, player_a, player_b, type").eq("match_id", matchId),
  ]);
  if (!match) notFound();
  return {
    ...groupData,
    match: match as MatchRow,
    signups: (signups ?? []) as MatchPlayerRow[],
    constraints: (constraints ?? []) as PairConstraintRow[],
  };
}

/** Teams of the most recent other match with teams, to encourage variety. */
export async function previousTeams(groupId: string, matchId: string): Promise<string[][]> {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("matches")
    .select("id, match_players (player_id, team)")
    .eq("group_id", groupId)
    .neq("id", matchId)
    .in("status", ["teams_set", "played"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return [];
  const rows = last.match_players as { player_id: string; team: "A" | "B" | null }[];
  return (["A", "B"] as const).map((t) => rows.filter((r) => r.team === t).map((r) => r.player_id));
}
