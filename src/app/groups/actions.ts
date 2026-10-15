"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ageFromBirthYear, initialOverall, type Freq, type Level, type Pos, type Years } from "@/lib/engine/engine";
import { requireUser } from "@/lib/auth";
import type { Foot } from "@/lib/player";

export async function createGroup(formData: FormData) {
  const { supabase } = await requireUser("/groups/new");
  const name = String(formData.get("name") ?? "").trim();
  const format = Number(formData.get("format")) === 7 ? 7 : 5;
  if (!name) return;

  const { data: groupId, error } = await supabase.rpc("create_group", { group_name: name, group_format: format });
  if (error) throw new Error(error.message);
  redirect(`/groups/${groupId}`);
}

export async function joinGroup(code: string) {
  const { supabase } = await requireUser(`/join/${code}`);
  const { data: groupId, error } = await supabase.rpc("join_group", { code });
  if (error) throw new Error(error.message);
  redirect(`/groups/${groupId}`);
}

export interface ProfileInput {
  displayName: string;
  birthYear: number;
  level: Level;
  years: Years;
  freq: Freq;
  positions: Pos[];
  gkRotation: boolean;
  foot: Foot;
  attributes: number[];
  gkRating: number | null;
}

/** Saves the questionnaire; the starting overall is computed here with the engine. */
export async function saveProfile(groupId: string, input: ProfileInput) {
  const { supabase } = await requireUser(`/groups/${groupId}/profile`);
  const overall = initialOverall({
    age: ageFromBirthYear(input.birthYear),
    level: input.level,
    years: input.years,
    freq: input.freq,
    attrs: input.attributes,
    positions: input.positions,
    gkRotation: input.gkRotation,
  });

  const { error } = await supabase.rpc("save_my_profile", {
    p_display_name: input.displayName,
    p_birth_year: input.birthYear,
    p_max_level: input.level,
    p_years_played: input.years,
    p_frequency: input.freq,
    p_positions: input.positions,
    p_gk_rotation: input.gkRotation,
    p_foot: input.foot,
    p_attributes: input.attributes,
    p_gk_rating: input.gkRating,
    p_prior_overall: overall,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(`/groups/${groupId}`);
}

export async function addGuest(groupId: string, formData: FormData) {
  const { supabase } = await requireUser(`/groups/${groupId}/settings`);
  const name = String(formData.get("name") ?? "").trim();
  const overall = Number(formData.get("overall"));
  const positions = formData.getAll("positions").map(String);
  if (!name || !(overall >= 40 && overall <= 92)) return;

  const { error } = await supabase.rpc("add_guest", {
    gid: groupId,
    guest_name: name,
    estimated_overall: Math.round(overall),
    guest_positions: positions,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/groups/${groupId}`, "layout");
}

export async function removeGuest(groupId: string, playerId: string) {
  const { supabase } = await requireUser(`/groups/${groupId}/settings`);
  const { error } = await supabase.rpc("remove_guest", { pid: playerId });
  if (error) throw new Error(error.message);
  revalidatePath(`/groups/${groupId}`, "layout");
}

export async function setMemberRole(groupId: string, playerId: string, role: "admin" | "player") {
  const { supabase } = await requireUser(`/groups/${groupId}/settings`);
  const { error } = await supabase.rpc("set_member_role", { pid: playerId, new_role: role });
  if (error) throw new Error(error.message);
  revalidatePath(`/groups/${groupId}`, "layout");
}
