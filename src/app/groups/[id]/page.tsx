import { Suspense } from "react";
import Link from "next/link";
import { isProvisional } from "@/lib/engine/engine";
import { PlayerCard } from "@/components/player-card";
import { formatMatchDate, listedSince, MATCH_COLUMNS, STATUS_LABEL, type MatchRow } from "@/lib/match";
import { displayOverall, hasProfile, isGuest, mainPosition, type PlayerRow } from "@/lib/player";
import { createClient } from "@/lib/supabase/server";
import { loadGroup } from "./data";

type Props = { params: Promise<{ id: string }> };

export default function GroupPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Suspense>
        <Group params={params} />
      </Suspense>
    </main>
  );
}

async function Group({ params }: Props) {
  const { id } = await params;
  const { group, players, me, canManage } = await loadGroup(id, `/groups/${id}`);
  const ranked = [...players].sort((a, b) => (displayOverall(b) ?? 0) - (displayOverall(a) ?? 0));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-zinc-500">
          ← Your groups
        </Link>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          {canManage && (
            <Link href={`/groups/${id}/settings`} className="shrink-0 text-sm font-medium underline">
              Settings & invites
            </Link>
          )}
        </div>
        <p className="text-zinc-500">
          {group.default_format}-a-side · {players.length} {players.length === 1 ? "player" : "players"}
        </p>
      </header>

      {!hasProfile(me) ? (
        <section className="rounded-2xl bg-zinc-100 p-6 text-center dark:bg-zinc-900">
          <h2 className="text-xl font-semibold">Create your player card</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            A few questions about how you play. It takes two minutes.
          </p>
          <Link
            href={`/groups/${id}/profile`}
            className="mt-4 inline-flex h-12 items-center rounded-full bg-foreground px-8 font-medium text-background"
          >
            Start
          </Link>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-3">
          <Card player={me} size="lg" />
          <Link href={`/groups/${id}/profile`} className="text-sm text-zinc-500 underline">
            Edit my profile
          </Link>
        </section>
      )}

      <Matches groupId={id} myPlayerId={me.id} canManage={canManage} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Players</h2>
        <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
          {ranked.map((p) => (
            <Card key={p.id} player={p} size="sm" />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Next matches (and the ones of the last week), with how many signed up and whether I'm in. */
async function Matches({ groupId, myPlayerId, canManage }: { groupId: string; myPlayerId: string; canManage: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(`${MATCH_COLUMNS}, match_players (player_id)`)
    .eq("group_id", groupId)
    .gte("starts_at", listedSince())
    .order("starts_at");
  const matches = (data ?? []) as (MatchRow & { match_players: { player_id: string }[] })[];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Matches</h2>
        {canManage && (
          <Link href={`/groups/${groupId}/matches/new`} className="text-sm font-medium underline">
            New match
          </Link>
        )}
      </div>
      {matches.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          No matches planned.{canManage ? "" : " An admin will create the next one."}
        </p>
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => {
            const signed = m.match_players.length;
            const imIn = m.match_players.some((p) => p.player_id === myPlayerId);
            return (
              <li key={m.id}>
                <Link
                  href={`/groups/${groupId}/matches/${m.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="font-semibold">{formatMatchDate(m.starts_at)}</span>
                    <span className="ml-2 text-sm text-zinc-500">
                      {m.format}-a-side · {STATUS_LABEL[m.status]}
                    </span>
                  </span>
                  <span className="text-sm">
                    {signed} in{imIn && <span className="ml-2 font-semibold text-emerald-600">✓ you</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Card({ player, size }: { player: PlayerRow; size: "sm" | "lg" }) {
  return (
    <PlayerCard
      name={player.display_name}
      overall={displayOverall(player)}
      position={mainPosition(player.positions)}
      attributes={player.attributes}
      foot={player.foot}
      provisional={isProvisional(player.matches_played)}
      guest={isGuest(player)}
      photoUrl={player.photo_url}
      size={size}
    />
  );
}
