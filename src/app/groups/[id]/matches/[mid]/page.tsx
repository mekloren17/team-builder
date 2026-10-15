import { Suspense } from "react";
import Link from "next/link";
import { effectiveMu, splitStrengths, winProbability } from "@/lib/engine/engine";
import { Lineup, type LineupPlayer } from "@/components/lineup";
import { BackLink, button, Dateline, Empty, FormIcon, Headline, inWords, Mark, Page, Panel, SectionTitle } from "@/components/ui";
import { formatMatchDate, STATUS_LABEL } from "@/lib/match";
import { displayOverall, hasProfile, toBalancePlayer, UNKNOWN_LEVEL, type PlayerRow } from "@/lib/player";
import { deleteMatch, reopenMatch } from "../actions";
import { AttendanceToggle, MyAttendance } from "./attendance";
import { Constraints } from "./constraints";
import { loadMatch } from "./data";

type Props = { params: Promise<{ id: string; mid: string }> };

export default function MatchPage({ params }: Props) {
  return (
    <Page>
      <Suspense>
        <Match params={params} />
      </Suspense>
    </Page>
  );
}

async function Match({ params }: Props) {
  const { id, mid } = await params;
  const { players, me, canManage, match, signups, constraints } = await loadMatch(id, mid, `/groups/${id}/matches/${mid}`);
  const byId = new Map(players.map((p) => [p.id, p]));
  const signed = signups.filter((s) => byId.has(s.player_id));
  const mySignup = signed.find((s) => s.player_id === me.id);
  const notSigned = players.filter((p) => !signed.some((s) => s.player_id === p.id));
  const open = match.status === "open";
  const target = match.format * 2;
  const headline = !open
    ? match.status === "played"
      ? "Full time"
      : "Teams are set"
    : signed.length === 0
      ? "Who's playing?"
      : `${inWords(signed.length)} in`;

  return (
    <div>
      <BackLink href={`/groups/${id}/matches`}>Matches</BackLink>
      <Headline>{headline}</Headline>
      <Dateline>
        {formatMatchDate(match.starts_at)} · {match.format}-a-side · {STATUS_LABEL[match.status]}
      </Dateline>

      {open && (
        <div className="mt-5">
          <MyAttendance groupId={id} matchId={mid} playerId={me.id} signedForm={mySignup?.form ?? null} />
        </div>
      )}

      {match.status !== "open" && (
        <div className="mt-6">
          <Teams players={byId} signups={signed} winProbA={match.win_prob_a} />
        </div>
      )}

      <SectionTitle>
        Who&apos;s in{" "}
        <span className="tabular font-semibold text-ink-soft">
          {signed.length}/{target}
        </span>
      </SectionTitle>
      {signed.length === 0 ? (
        <Empty title="Nobody yet">Be the first: the others always follow.</Empty>
      ) : (
        <table className="w-full border-2 border-ink bg-sheet">
          <thead>
            <tr className="border-b-2 border-ink text-left font-display text-sm font-bold uppercase tracking-wide">
              <th className="py-2 pl-4">Player</th>
              <th className="py-2 text-center">Form</th>
              <th className="py-2 pr-4 text-right">Mark</th>
              {canManage && open && <th className="w-16 py-2 pr-3" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {signed.map((s) => {
              const p = byId.get(s.player_id)!;
              return (
                <tr key={s.player_id} className={`border-b border-rule last:border-b-0 ${p.id === me.id ? "bg-paper" : ""}`}>
                  <td className="py-2.5 pl-4">
                    <span className="font-semibold">{p.display_name}</span>
                    {!p.user_id && <span className="ml-2 text-xs font-semibold uppercase text-ink-soft">Guest</span>}
                    {!hasProfile(p) && p.user_id && (
                      <span className="block text-xs font-semibold text-red">No card yet: counts as {UNKNOWN_LEVEL}</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <span className="flex justify-center">
                      <FormIcon form={s.form} />
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <Mark value={displayOverall(p) ?? UNKNOWN_LEVEL} size="sm" />
                  </td>
                  {canManage && open && (
                    <td className="py-2.5 pr-3 text-right">
                      {p.id !== me.id && (
                        <AttendanceToggle groupId={id} matchId={mid} playerId={p.id} attending={false} label="Remove" />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {canManage && open && (
        <>
          <SectionTitle>Admin desk</SectionTitle>
          <div className="space-y-6">
            <Link
              href={`/groups/${id}/matches/${mid}/teams`}
              aria-disabled={signed.length < 4}
              className={`${button.primary} w-full ${signed.length < 4 ? "pointer-events-none opacity-45" : ""}`}
            >
              Make the teams
            </Link>
            {signed.length < 4 && <p className="-mt-4 text-sm text-ink-soft">You need at least 4 players to make teams.</p>}

            {notSigned.length > 0 && (
              <Panel>
                <h3 className="border-b-2 border-ink px-4 py-2 font-display text-lg font-extrabold uppercase">Add players</h3>
                <ul>
                  {notSigned.map((p) => (
                    <li key={p.id} className="flex min-h-14 items-center justify-between border-b border-rule px-4 last:border-b-0">
                      <span>
                        <span className="font-semibold">{p.display_name}</span>
                        {!p.user_id && <span className="ml-2 text-xs font-semibold uppercase text-ink-soft">Guest</span>}
                      </span>
                      <AttendanceToggle groupId={id} matchId={mid} playerId={p.id} attending label="Add" />
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {signed.length >= 2 && (
              <Panel className="p-4">
                <h3 className="font-display text-lg font-extrabold uppercase">Together or apart</h3>
                <p className="mb-3 text-sm text-ink-soft">For the brothers who always argue, or the two who carpool.</p>
                <Constraints
                  groupId={id}
                  matchId={mid}
                  players={signed.map((s) => ({ id: s.player_id, name: byId.get(s.player_id)!.display_name }))}
                  constraints={constraints}
                />
              </Panel>
            )}
          </div>
        </>
      )}

      {canManage && match.status === "teams_set" && (
        <>
          <SectionTitle>Admin desk</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/groups/${id}/matches/${mid}/teams`} className={button.secondary}>
              Change teams
            </Link>
            <form action={reopenMatch.bind(null, id, mid)}>
              <button type="submit" className={`${button.secondary} w-full`}>
                Reopen sign-ups
              </button>
            </form>
          </div>
        </>
      )}

      {canManage && match.status !== "played" && (
        <form action={deleteMatch.bind(null, id, mid)} className="mt-8">
          <button type="submit" className={button.danger}>
            Delete this match
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
