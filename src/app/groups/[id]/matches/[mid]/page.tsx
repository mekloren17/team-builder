import { Suspense } from "react";
import Link from "next/link";
import { effectiveMu, splitStrengths, winProbability } from "@/lib/engine/engine";
import { Lineup, type LineupPlayer } from "@/components/lineup";
import { formatMatchDate, formIcon, STATUS_LABEL } from "@/lib/match";
import { displayOverall, hasProfile, toBalancePlayer, UNKNOWN_LEVEL, type PlayerRow } from "@/lib/player";
import { deleteMatch, reopenMatch } from "../actions";
import { AttendanceToggle, MyAttendance } from "./attendance";
import { Constraints } from "./constraints";
import { loadMatch } from "./data";

type Props = { params: Promise<{ id: string; mid: string }> };

export default function MatchPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6">
      <Suspense>
        <Match params={params} />
      </Suspense>
    </main>
  );
}

async function Match({ params }: Props) {
  const { id, mid } = await params;
  const { group, players, me, canManage, match, signups, constraints } = await loadMatch(
    id,
    mid,
    `/groups/${id}/matches/${mid}`,
  );
  const byId = new Map(players.map((p) => [p.id, p]));
  const signed = signups.filter((s) => byId.has(s.player_id));
  const mySignup = signed.find((s) => s.player_id === me.id);
  const notSigned = players.filter((p) => !signed.some((s) => s.player_id === p.id));
  const open = match.status === "open";
  const target = match.format * 2;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Link href={`/groups/${id}`} className="text-sm text-zinc-500">
          ← {group.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{formatMatchDate(match.starts_at)}</h1>
        <p className="text-zinc-500">
          {match.format}-a-side · {STATUS_LABEL[match.status]}
        </p>
      </header>

      {open && (
        <MyAttendance groupId={id} matchId={mid} playerId={me.id} signedForm={mySignup?.form ?? null} />
      )}

      {match.status !== "open" && <Teams players={byId} signups={signed} winProbA={match.win_prob_a} />}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Signed up · {signed.length}
          {open && signed.length < target && <span className="normal-case"> (need {target} for full teams)</span>}
        </h2>
        {signed.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">Nobody yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {signed.map((s) => {
              const p = byId.get(s.player_id)!;
              return (
                <li key={s.player_id} className="flex items-center justify-between px-4 py-2.5">
                  <span>
                    {p.display_name}
                    {!hasProfile(p) && p.user_id && <span className="ml-2 text-xs text-amber-600">no profile yet</span>}
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="tabular-nums text-zinc-500">
                      {displayOverall(p) ?? UNKNOWN_LEVEL} {formIcon(s.form)}
                    </span>
                    {canManage && open && p.id !== me.id && (
                      <AttendanceToggle groupId={id} matchId={mid} playerId={p.id} attending={false} label="Remove" />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canManage && open && (
        <section className="space-y-6 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Admin</h2>

          {notSigned.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Add players</h3>
              <ul className="space-y-1">
                {notSigned.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>
                      {p.display_name}
                      {!p.user_id && <span className="ml-2 text-zinc-500">guest</span>}
                    </span>
                    <AttendanceToggle groupId={id} matchId={mid} playerId={p.id} attending label="Add" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {signed.length >= 2 && (
            <div className="space-y-2">
              <h3 className="font-medium">Keep together or apart</h3>
              <Constraints
                groupId={id}
                matchId={mid}
                players={signed.map((s) => ({ id: s.player_id, name: byId.get(s.player_id)!.display_name }))}
                constraints={constraints}
              />
            </div>
          )}

          <Link
            href={`/groups/${id}/matches/${mid}/teams`}
            aria-disabled={signed.length < 4}
            className={`flex h-12 items-center justify-center rounded-full bg-foreground font-medium text-background ${
              signed.length < 4 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Generate teams
          </Link>
        </section>
      )}

      {canManage && match.status === "teams_set" && (
        <section className="flex flex-wrap gap-3">
          <Link
            href={`/groups/${id}/matches/${mid}/teams`}
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-300 font-medium dark:border-zinc-700"
          >
            Change teams
          </Link>
          <form action={reopenMatch.bind(null, id, mid)} className="flex-1">
            <button type="submit" className="h-11 w-full rounded-full border border-zinc-300 font-medium dark:border-zinc-700">
              Reopen sign-ups
            </button>
          </form>
        </section>
      )}

      {canManage && match.status !== "played" && (
        <form action={deleteMatch.bind(null, id, mid)}>
          <button type="submit" className="text-sm text-red-600 underline">
            Delete match
          </button>
        </form>
      )}
    </div>
  );
}

function Teams({
  players,
  signups,
  winProbA,
}: {
  players: Map<string, PlayerRow>;
  signups: { player_id: string; form: number; team: "A" | "B" | null; position: LineupPlayer["position"] }[];
  winProbA: number | null;
}) {
  const team = (t: "A" | "B"): LineupPlayer[] =>
    signups
      .filter((s) => s.team === t)
      .map((s) => {
        const p = players.get(s.player_id)!;
        return {
          id: p.id,
          name: p.display_name,
          overall: displayOverall(p) ?? UNKNOWN_LEVEL,
          photoUrl: p.photo_url,
          position: s.position,
          form: s.form,
        };
      });
  const eff = (t: "A" | "B") =>
    signups
      .filter((s) => s.team === t)
      .map((s) => {
        const b = toBalancePlayer(players.get(s.player_id)!, s.form);
        return effectiveMu(b.mu, b.form);
      });
  const { sA, sB } = splitStrengths(eff("A"), eff("B"));
  return (
    <Lineup
      teamA={team("A")}
      teamB={team("B")}
      strengthA={sA}
      strengthB={sB}
      winProbA={winProbA ?? winProbability(sA, sB)}
    />
  );
}
