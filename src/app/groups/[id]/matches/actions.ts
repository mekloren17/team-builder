"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignPositions, effectiveMu, splitStrengths, winProbability, type Pos } from "@/lib/engine/engine";
import { requireUser } from "@/lib/auth";
import { PLAYER_COLUMNS, toBalancePlayer, type PlayerRow } from "@/lib/player";
import type { GoalEntry, MatchPlayerRow } from "@/lib/match";
import { groupRatings, type ConfirmedMatch, type RatingPlayer } from "@/lib/ratings";
import { createAdminClient } from "@/lib/supabase/admin";

const matchPath = (groupId: string, matchId: string) => `/groups/${groupId}/matches/${matchId}`;

export async function createMatch(groupId: string, startsAt: string, format: 5 | 7) {
  const { supabase } = await requireUser(`/groups/${groupId}/matches/new`);
  const { data: matchId, error } = await supabase.rpc("create_match", {
    gid: groupId,
    p_starts_at: startsAt,
    p_format: format,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`, "layout");
  redirect(matchPath(groupId, matchId));
}

export async function deleteMatch(groupId: string, matchId: string) {
  const { supabase } = await requireUser(matchPath(groupId, matchId));
  const { error } = await supabase.rpc("delete_match", { mid: matchId });
  if (error) throw new Error(error.message);
  revalidatePath(`/groups/${groupId}`, "layout");
  redirect(`/groups/${groupId}`);
}

export async function setAttendance(groupId: string, matchId: string, playerId: string, attending: boolean, form = 3) {
  const { supabase } = await requireUser(matchPath(groupId, matchId));
  const { error } = await supabase.rpc("set_attendance", {
    mid: matchId,
    pid: playerId,
    attending,
    p_form: form,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`, "layout"); // home, match list and match pages all show it
}

export async function setPairConstraint(
  groupId: string,
  matchId: string,
  playerA: string,
  playerB: string,
  type: "together" | "apart" | null,
) {
  const { supabase } = await requireUser(matchPath(groupId, matchId));
  const { error } = await supabase.rpc("set_pair_constraint", {
    mid: matchId,
    pa: playerA,
    pb: playerB,
    constraint_type: type,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`, "layout");
}

/**
 * Saves the chosen teams. Strengths, win probability and positions on the pitch are recomputed
 * here from the database, so they never depend on what the browser sends.
 */
export async function saveTeams(groupId: string, matchId: string, teamA: string[], teamB: string[]) {
  const { supabase } = await requireUser(`${matchPath(groupId, matchId)}/teams`);
  const [{ data: match }, { data: signups }, { data: players }] = await Promise.all([
    supabase.from("matches").select("format").eq("id", matchId).single(),
    supabase.from("match_players").select("player_id, form").eq("match_id", matchId),
    supabase.from("players").select(PLAYER_COLUMNS).eq("group_id", groupId),
  ]);
  if (!match || !signups || !players) return { error: "Match not found" };

  const form = new Map((signups as Pick<MatchPlayerRow, "player_id" | "form">[]).map((s) => [s.player_id, s.form]));
  const byId = new Map((players as PlayerRow[]).map((p) => [p.id, p]));
  const toBalance = (id: string) => toBalancePlayer(byId.get(id)!, form.get(id) ?? 3);
  const a = teamA.filter((id) => byId.has(id)).map(toBalance);
  const b = teamB.filter((id) => byId.has(id)).map(toBalance);
  const eff = (t: typeof a) => t.map((p) => effectiveMu(p.mu, p.form));
  const { sA, sB } = splitStrengths(eff(a), eff(b));

  const positions: Record<string, Pos> = {};
  for (const team of [a, b]) for (const s of assignPositions(team, match.format).slots) positions[s.id] = s.pos;

  const { error } = await supabase.rpc("save_teams", {
    mid: matchId,
    team_a: teamA,
    team_b: teamB,
    positions,
    p_win_prob_a: winProbability(sA, sB),
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`, "layout");
  redirect(matchPath(groupId, matchId));
}

export async function reopenMatch(groupId: string, matchId: string) {
  const { supabase } = await requireUser(matchPath(groupId, matchId));
  const { error } = await supabase.rpc("reopen_match", { mid: matchId });
  if (error) throw new Error(error.message);
  revalidatePath(`/groups/${groupId}`, "layout");
}

// ---------- Result and ratings ----------

/**
 * Enters the score, with goals and assists if known. An owner or admin makes it final at once;
 * a player's waits for the other team. The database checks the scorers against the score.
 */
export async function submitResult(
  groupId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
  goals: GoalEntry[] = [],
) {
  const { supabase } = await requireUser(matchPath(groupId, matchId));
  const { data: status, error } = await supabase.rpc("submit_result", {
    mid: matchId,
    p_score_a: scoreA,
    p_score_b: scoreB,
    p_goals: goals,
  });
  if (error) return { error: error.message };
  if (status === "confirmed") {
    const failed = await recomputeRatings(groupId, matchId);
    if (failed) return failed;
  }
  revalidatePath(`/groups/${groupId}`, "layout");
}

export async function confirmResult(groupId: string, matchId: string) {
  const { supabase } = await requireUser(matchPath(groupId, matchId));
  const { error } = await supabase.rpc("confirm_result", { mid: matchId });
  if (error) return { error: error.message };
  const failed = await recomputeRatings(groupId, matchId);
  if (failed) return failed;
  revalidatePath(`/groups/${groupId}`, "layout");
}

export async function disputeResult(groupId: string, matchId: string) {
  const { supabase } = await requireUser(matchPath(groupId, matchId));
  const { error } = await supabase.rpc("dispute_result", { mid: matchId });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`, "layout");
}

/**
 * Recomputes every rating of the group from all its confirmed results and saves them, with the
 * before/after of the match just confirmed. Everything is read again from the database here:
 * nothing comes from the browser.
 */
async function recomputeRatings(groupId: string, matchId: string) {
  const admin = createAdminClient();
  const [{ data: players, error: e1 }, { data: matches, error: e2 }] = await Promise.all([
    admin.from("players").select("id, prior_overall").eq("group_id", groupId),
    admin
      .from("matches")
      .select("format, score_a, score_b, match_players (player_id, team, form)")
      .eq("group_id", groupId)
      .eq("result_status", "confirmed"),
  ]);
  if (e1 || e2 || !players || !matches) return { error: "Result saved, but the ratings could not be updated." };

  const ratings = groupRatings(players as RatingPlayer[], matches as ConfirmedMatch[]);
  const { error } = await admin.rpc("apply_ratings", {
    gid: groupId,
    ratings: Object.fromEntries(ratings),
    mid: matchId,
  });
  if (error) return { error: `Result saved, but the ratings could not be updated: ${error.message}` };
  return null;
}
