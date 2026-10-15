"use client";

import { useState, useTransition } from "react";
import { assignPositions, effectiveMu, splitStrengths, winProbability, type BalancePlayer } from "@/lib/engine/engine";
import { Lineup, type LineupPlayer } from "@/components/lineup";
import { formIcon } from "@/lib/match";
import { saveTeams } from "../../actions";

export interface EditorPlayer extends BalancePlayer {
  name: string;
  overall: number;
  photoUrl: string | null;
}

export interface Option {
  label: string;
  teamA: string[];
  teamB: string[];
}

/** Choose one of the proposals, move players by tapping them, save. */
export function TeamEditor({
  groupId,
  matchId,
  format,
  players,
  options,
  initiallyShown,
}: {
  groupId: string;
  matchId: string;
  format: 5 | 7;
  players: EditorPlayer[];
  options: Option[];
  initiallyShown: number;
}) {
  const [shown, setShown] = useState(initiallyShown);
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"list" | "pitch">("list");
  const [teamA, setTeamA] = useState(options[0].teamA);
  const [teamB, setTeamB] = useState(options[0].teamB);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const byId = new Map(players.map((p) => [p.id, p]));
  const eff = (ids: string[]) => ids.map((id) => byId.get(id)!).map((p) => effectiveMu(p.mu, p.form));
  const { sA, sB } = splitStrengths(eff(teamA), eff(teamB));
  const probA = winProbability(sA, sB);
  const sizeGap = Math.abs(teamA.length - teamB.length);
  const edited = teamA.join() !== options[selected].teamA.join() || teamB.join() !== options[selected].teamB.join();

  function choose(i: number) {
    setSelected(i);
    setTeamA(options[i].teamA);
    setTeamB(options[i].teamB);
  }

  function move(id: string) {
    if (teamA.includes(id)) {
      setTeamA(teamA.filter((x) => x !== id));
      setTeamB([...teamB, id]);
    } else {
      setTeamB(teamB.filter((x) => x !== id));
      setTeamA([...teamA, id]);
    }
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await saveTeams(groupId, matchId, teamA, teamB);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.slice(0, shown).map((o, i) => (
          <button
            key={o.label}
            type="button"
            onClick={() => choose(i)}
            aria-pressed={selected === i}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
              selected === i ? "border-foreground bg-foreground text-background" : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {o.label}
          </button>
        ))}
        {shown < options.length && (
          <button
            type="button"
            onClick={() => {
              choose(shown);
              setShown(shown + 1);
            }}
            className="shrink-0 rounded-full border border-dashed border-zinc-400 px-4 py-2 text-sm font-medium"
          >
            + Another option
          </button>
        )}
      </div>

      <div className="rounded-xl bg-zinc-100 p-4 text-center dark:bg-zinc-900">
        <div className="text-sm text-zinc-500">Chance of winning{edited && " (edited)"}</div>
        <div className="mt-1 flex items-center justify-center gap-3 text-2xl font-bold tabular-nums">
          <span>A {Math.round(probA * 100)}%</span>
          <span className="text-zinc-400">–</span>
          <span>{Math.round((1 - probA) * 100)}% B</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-300 dark:bg-zinc-700">
          <div className="h-full bg-foreground" style={{ width: `${probA * 100}%` }} />
        </div>
      </div>

      {sizeGap > 1 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          The teams differ by {sizeGap} players.
        </p>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-full bg-zinc-100 p-1 text-sm font-medium dark:bg-zinc-900">
        {(["list", "pitch"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded-full py-2 ${view === v ? "bg-background shadow" : "text-zinc-500"}`}
          >
            {v === "list" ? "Edit teams" : "See on the pitch"}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <div className="grid grid-cols-2 gap-3">
          <TeamColumn title="Team A" strength={sA} ids={teamA} byId={byId} onTap={move} />
          <TeamColumn title="Team B" strength={sB} ids={teamB} byId={byId} onTap={move} />
        </div>
      ) : (
        <Lineup
          teamA={onPitch(teamA, byId, format)}
          teamB={onPitch(teamB, byId, format)}
          strengthA={sA}
          strengthB={sB}
          winProbA={probA}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={saving || teamA.length === 0 || teamB.length === 0}
        onClick={save}
        className="h-12 w-full rounded-full bg-foreground font-medium text-background disabled:opacity-40"
      >
        {saving ? "Saving…" : "Use these teams"}
      </button>
    </div>
  );
}

function TeamColumn({
  title,
  strength,
  ids,
  byId,
  onTap,
}: {
  title: string;
  strength: number;
  ids: string[];
  byId: Map<string, EditorPlayer>;
  onTap: (id: string) => void;
}) {
  const sorted = [...ids].sort((a, b) => byId.get(b)!.overall - byId.get(a)!.overall);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">{title}</h2>
        <span className="text-sm tabular-nums text-zinc-500">{strength.toFixed(1)}</span>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((id) => {
          const p = byId.get(id)!;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onTap(id)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <span className="truncate">
                  {p.name}
                  {p.positions.includes("GK") && <span className="ml-1 text-xs text-zinc-500">GK</span>}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  {p.overall} {formIcon(p.form)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Positions as they will be saved (same assignPositions the server uses). */
function onPitch(ids: string[], byId: Map<string, EditorPlayer>, format: 5 | 7): LineupPlayer[] {
  const team = ids.map((id) => byId.get(id)!);
  const pos = new Map(assignPositions(team, format).slots.map((s) => [s.id, s.pos]));
  return team.map((p) => ({
    id: p.id,
    name: p.name,
    overall: p.overall,
    photoUrl: p.photoUrl,
    position: pos.get(p.id) ?? null,
    form: p.form,
  }));
}
