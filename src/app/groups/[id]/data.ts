import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
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
