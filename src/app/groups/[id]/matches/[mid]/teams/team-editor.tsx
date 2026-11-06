"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight, Hand, Plus } from "lucide-react";
import { assignPositions, effectiveMu, splitStrengths, winProbability, type BalancePlayer } from "@/lib/engine/engine";
import { Lineup, type LineupPlayer } from "@/components/lineup";
import { button, ErrorText, FormIcon, Mark, WinBar } from "@/components/ui";
import { saveTeams } from "../../actions";

export interface EditorPlayer extends BalancePlayer {
  name: string;
  overall: number;
  photoUrl: string | null;
  guest: boolean;
}

export interface Option {
  label: string;
  teamA: string[];
  teamB: string[];
}

/** Choose one of the proposals (or pick the teams by hand), move players by tapping them, save. */
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
  // "manual" = the admin picks both teams from scratch.
  const [selected, setSelected] = useState<number | "manual">(options.length > 0 ? 0 : "manual");
  const [view, setView] = useState<"list" | "pitch">("list");
  const [teamA, setTeamA] = useState<string[]>(options[0]?.teamA ?? []);
  const [teamB, setTeamB] = useState<string[]>(options[0]?.teamB ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const byId = new Map(players.map((p) => [p.id, p]));
  const eff = (ids: string[]) => ids.map((id) => byId.get(id)!).map((p) => effectiveMu(p.mu, p.form));
  const bothFilled = teamA.length > 0 && teamB.length > 0;
  const { sA, sB } = bothFilled ? splitStrengths(eff(teamA), eff(teamB)) : { sA: NaN, sB: NaN };
  const probA = winProbability(sA, sB);
  const sizeGap = Math.abs(teamA.length - teamB.length);
  const manual = selected === "manual";
  const edited =
    !manual && (teamA.join() !== options[selected].teamA.join() || teamB.join() !== options[selected].teamB.join());
  const toPick = players.filter((p) => !teamA.includes(p.id) && !teamB.includes(p.id));

  function choose(i: number) {
    setSelected(i);
    setTeamA(options[i].teamA);
    setTeamB(options[i].teamB);
  }

  function pickByHand() {
    setSelected("manual");
    setTeamA([]);
    setTeamB([]);
    setView("list");
  }

  function pick(id: string, team: "A" | "B") {
    if (team === "A") setTeamA([...teamA, id]);
    else setTeamB([...teamB, id]);
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

  const tab = (on: boolean) =>
    `min-h-11 shrink-0 rounded-md border-2 border-line px-4 text-sm font-semibold transition-colors duration-150 ${
      on ? "bg-chalk text-turf" : "bg-panel text-chalk hover:bg-raised"
    }`;

  return (
    <div className="space-y-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Proposals">
        {options.slice(0, shown).map((o, i) => (
          <button key={o.label} type="button" onClick={() => choose(i)} aria-pressed={selected === i} className={tab(selected === i)}>
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
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border-2 border-dashed border-line px-4 text-sm font-semibold hover:bg-panel"
          >
            <Plus className="size-4" aria-hidden /> Another option
          </button>
        )}
        <button
          type="button"
          onClick={pickByHand}
          aria-pressed={manual}
          className={`${tab(manual)} inline-flex items-center gap-1`}
        >
          <Hand className="size-4" aria-hidden /> Pick myself
        </button>
      </div>

      <div className="rounded-md border-2 border-line bg-panel p-4">
        <p className="mb-2 text-sm font-semibold text-chalk-soft">Chance of winning{edited && " (after your changes)"}</p>
        {bothFilled ? (
          <WinBar probA={probA} labelA="Team A" labelB="Team B" />
        ) : (
          <p className="text-sm text-chalk-soft">Put at least one player in each team to see it.</p>
        )}
      </div>

      {sizeGap > 1 && <ErrorText>The teams differ by {sizeGap} players. Move someone back.</ErrorText>}

      <div className="grid grid-cols-2" role="group" aria-label="View">
        {(["list", "pitch"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            disabled={v === "pitch" && !bothFilled}
            className={`${tab(view === v)} disabled:opacity-45`}
          >
            {v === "list" ? "Edit teams" : "See on the pitch"}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <>
          {toPick.length > 0 && <PickList players={toPick} onPick={pick} />}
          <p className="flex items-center gap-2 text-sm text-chalk-soft">
            <ArrowLeftRight className="size-4" aria-hidden /> Tap a player to send them to the other team.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TeamColumn title="Team A" strength={sA} ids={teamA} byId={byId} onTap={move} />
            <TeamColumn title="Team B" strength={sB} ids={teamB} byId={byId} onTap={move} />
          </div>
        </>
      ) : (
        <Lineup
          teamA={onPitch(teamA, byId, format)}
          teamB={onPitch(teamB, byId, format)}
          strengthA={sA}
          strengthB={sB}
          winProbA={probA}
        />
      )}

      {error && <ErrorText>{error}</ErrorText>}
      <button
        type="button"
        disabled={saving || !bothFilled || toPick.length > 0}
        onClick={save}
        className={`${button.primary} w-full`}
      >
        {saving ? "Saving…" : toPick.length > 0 ? `${toPick.length} still to pick` : "Use these teams"}
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
    <div className="rounded-md border-2 border-line bg-panel">
      <div className="flex items-baseline justify-between border-b-2 border-line px-3 py-2">
        <h2 className={`font-display text-lg font-black uppercase ${title.endsWith("B") ? "text-bib-orange" : "text-bib"}`}>{title}</h2>
        {ids.length > 0 && <Mark value={strength.toFixed(1)} size="sm" />}
      </div>
      {ids.length === 0 && <p className="px-3 py-4 text-sm text-chalk-soft">Nobody yet</p>}
      <ul>
        {sorted.map((id) => {
          const p = byId.get(id)!;
          return (
            <li key={id} className="border-b border-rule last:border-b-0">
              <button
                type="button"
                onClick={() => onTap(id)}
                className="flex min-h-12 w-full items-center justify-between gap-2 px-3 text-left transition-colors duration-150 hover:bg-raised"
              >
                <span className="min-w-0 truncate font-semibold">
                  {p.name}
                  {p.positions.includes("GK") && <span className="ml-1 text-xs font-bold text-chalk-soft">GK</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <FormIcon form={p.form} className="size-4" />
                  <Mark value={p.overall} size="sm" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Players not in a team yet (only when picking by hand): one tap sends them to A or B. */
function PickList({ players, onPick }: { players: EditorPlayer[]; onPick: (id: string, team: "A" | "B") => void }) {
  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  return (
    <div className="rounded-md border-2 border-line bg-panel">
      <h2 className="border-b-2 border-line px-3 py-2 font-display text-lg font-black uppercase">
        Still to pick ({players.length})
      </h2>
      <ul>
        {sorted.map((p) => (
          <li key={p.id} className="flex min-h-12 items-center justify-between gap-2 border-b border-rule px-3 py-1 last:border-b-0">
            <span className="min-w-0 truncate font-semibold">
              {p.name}
              {p.positions.includes("GK") && <span className="ml-1 text-xs font-bold text-chalk-soft">GK</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <FormIcon form={p.form} className="size-4" />
              <Mark value={p.overall} size="sm" />
              <button type="button" onClick={() => onPick(p.id, "A")} className={`${button.small} font-black text-bib`} aria-label={`${p.name} to Team A`}>
                A
              </button>
              <button type="button" onClick={() => onPick(p.id, "B")} className={`${button.small} font-black text-bib-orange`} aria-label={`${p.name} to Team B`}>
                B
              </button>
            </span>
          </li>
        ))}
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
    guest: p.guest,
    position: pos.get(p.id) ?? null,
    form: p.form,
  }));
}
