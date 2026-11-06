"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { button, ErrorText, Mark, Panel } from "@/components/ui";
import { RESULT_LABEL, statText, type ResultStatus, type ScorerStats } from "@/lib/match";
import { confirmResult, disputeResult, submitResult } from "../actions";

export interface ResultPlayer {
  id: string;
  name: string;
  team: "A" | "B";
  goals: number;
  assists: number;
}

export interface ResultState {
  status: ResultStatus | null;
  scoreA: number | null;
  scoreB: number | null;
  /** Name of who entered it, and their team (null if not a player of the match). */
  enteredBy: string | null;
  enteredByTeam: "A" | "B" | null;
}

/**
 * The score of the match (with scorers and assists) and what the signed-in member can do with it:
 * enter it (players of the match, admins), confirm or dispute it (the other team, admins),
 * correct it (admins).
 */
export function Result({
  groupId,
  matchId,
  result,
  players,
  canEnter,
  canAnswer,
  canManage,
}: {
  groupId: string;
  matchId: string;
  result: ResultState;
  players: ResultPlayer[];
  canEnter: boolean;
  canAnswer: boolean;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function run(action: () => Promise<{ error: string } | null | undefined | void>) {
    setError(null);
    start(async () => {
      const r = await action();
      if (r && "error" in r) setError(r.error);
      else setEditing(false);
    });
  }

  const save = (a: number, b: number, stats: ScorerStats) => run(() => submitResult(groupId, matchId, a, b, stats));

  // No result yet: the form, for whoever may enter it.
  if (result.status === null) {
    if (!canEnter)
      return <Panel className="p-4 text-sm text-chalk-soft">The score will appear here after the match.</Panel>;
    return (
      <ScoreForm
        title="Enter the result"
        note={canManage ? "As an admin, your score is final at once." : "A player of the other team confirms it."}
        players={players}
        busy={busy}
        error={error}
        onSave={save}
      />
    );
  }

  const otherTeam =
    result.enteredByTeam === "A" ? "Team B" : result.enteredByTeam === "B" ? "Team A" : "the other team";
  // A disputed or final result is changed only by an admin; a pending one also by who may enter it.
  const canCorrect = canManage || (result.status === "pending" && canEnter && !canAnswer);

  return (
    <div className="space-y-3">
      <Panel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-lg font-black uppercase text-bib">Team A</span>
          <span className="flex items-center gap-3">
            <Mark value={result.scoreA ?? 0} size="lg" led />
            <span className="text-2xl font-bold text-chalk-soft">–</span>
            <Mark value={result.scoreB ?? 0} size="lg" led />
          </span>
          <span className="font-display text-lg font-black uppercase text-bib-orange">Team B</span>
        </div>
        <Scorers players={players} />
        <p className="mt-3 text-center text-sm font-semibold">
          <span
            className={
              result.status === "confirmed" ? "text-ok" : result.status === "disputed" ? "text-foul" : "text-led"
            }
          >
            {RESULT_LABEL[result.status]}
          </span>
          {result.enteredBy && <span className="text-chalk-soft"> · entered by {result.enteredBy}</span>}
        </p>
        {result.status === "pending" && (
          <p className="mt-1 text-center text-sm text-chalk-soft">
            A player of {otherTeam} or an admin confirms score and scorers. The marks change after that.
          </p>
        )}
        {result.status === "disputed" && (
          <p className="mt-1 text-center text-sm text-chalk-soft">
            An admin enters the right score, and that one is final.
          </p>
        )}
      </Panel>

      {result.status === "pending" && canAnswer && !editing && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => confirmResult(groupId, matchId))}
            className={button.primary}
          >
            {busy ? "Saving…" : "Confirm"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => disputeResult(groupId, matchId))}
            className={button.secondary}
          >
            That&apos;s wrong
          </button>
        </div>
      )}
      {result.status === "disputed" && canManage && !editing && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => confirmResult(groupId, matchId))}
          className={`${button.secondary} w-full`}
        >
          Keep this score
        </button>
      )}

      {canCorrect &&
        (editing ? (
          <ScoreForm
            title={result.status === "confirmed" ? "Correct the result" : "Enter the right score"}
            note={
              canManage
                ? "Your score is final, and the marks are recomputed."
                : "It still needs the other team's confirmation."
            }
            initialA={result.scoreA ?? 0}
            initialB={result.scoreB ?? 0}
            players={players}
            busy={busy}
            error={error}
            onSave={save}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <button type="button" onClick={() => setEditing(true)} className={button.quiet}>
            {result.status === "confirmed" ? "Correct the result" : "Change the score"}
          </button>
        ))}

      {!editing && error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

/** Who scored and assisted, under the score, one column per team. */
function Scorers({ players }: { players: ResultPlayer[] }) {
  if (!players.some((p) => p.goals > 0 || p.assists > 0)) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-4 border-t border-rule pt-3 text-sm">
      {(["A", "B"] as const).map((t) => (
        <ul key={t} className={`space-y-1 ${t === "B" ? "text-right" : ""}`}>
          {players
            .filter((p) => p.team === t && (p.goals > 0 || p.assists > 0))
            .sort((x, y) => y.goals - x.goals || y.assists - x.assists)
            .map((p) => (
              <li key={p.id}>
                <span className="font-semibold">{p.name}</span>{" "}
                <span className="tabular text-chalk-soft">{statText(p.goals, p.assists)}</span>
              </li>
            ))}
        </ul>
      ))}
    </div>
  );
}

function ScoreForm({
  title,
  note,
  initialA = 0,
  initialB = 0,
  players,
  busy,
  error,
  onSave,
  onCancel,
}: {
  title: string;
  note: string;
  initialA?: number;
  initialB?: number;
  players: ResultPlayer[];
  busy: boolean;
  error: string | null;
  onSave: (a: number, b: number, stats: ScorerStats) => void;
  onCancel?: () => void;
}) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [stats, setStats] = useState<ScorerStats>(() =>
    Object.fromEntries(players.filter((p) => p.goals || p.assists).map((p) => [p.id, { g: p.goals, a: p.assists }])),
  );
  const [showScorers, setShowScorers] = useState(Object.keys(stats).length > 0);

  const sum = (t: "A" | "B", k: "g" | "a") =>
    players.filter((p) => p.team === t).reduce((s, p) => s + (stats[p.id]?.[k] ?? 0), 0);
  const score = { A: a, B: b };
  const problem = (["A", "B"] as const)
    .map((t) =>
      sum(t, "g") > score[t]
        ? `Team ${t} has more scorers than goals.`
        : sum(t, "a") > sum(t, "g")
          ? `Team ${t} has more assists than goals.`
          : null,
    )
    .find(Boolean);

  function change(id: string, k: "g" | "a", v: number) {
    const next = { ...(stats[id] ?? { g: 0, a: 0 }), [k]: v };
    const rest = { ...stats };
    delete rest[id];
    setStats(next.g || next.a ? { ...rest, [id]: next } : rest);
  }

  return (
    <Panel className="p-4">
      <h3 className="font-display text-lg font-extrabold uppercase">{title}</h3>
      <p className="mb-4 text-sm text-chalk-soft">{note}</p>
      <div className="grid gap-3">
        <Stepper label="Team A" color="text-bib" value={a} onChange={setA} />
        <Stepper label="Team B" color="text-bib-orange" value={b} onChange={setB} />
      </div>

      <button
        type="button"
        onClick={() => setShowScorers(!showScorers)}
        aria-expanded={showScorers}
        className="mt-4 flex min-h-11 w-full items-center justify-between text-left font-semibold"
      >
        <span>
          Scorers and assists <span className="font-normal text-chalk-soft">(optional)</span>
        </span>
        <ChevronDown className={`size-5 transition-transform ${showScorers ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {showScorers && (
        <div className="mt-2 space-y-4">
          {(["A", "B"] as const).map((t) => {
            const goalsLeft = score[t] - sum(t, "g");
            const assistsLeft = sum(t, "g") - sum(t, "a");
            return (
              <div key={t} className="rounded-md border-2 border-line">
                <div className="flex items-baseline justify-between border-b-2 border-line px-3 py-2">
                  <span className={`font-display font-black uppercase ${t === "A" ? "text-bib" : "text-bib-orange"}`}>
                    Team {t}
                  </span>
                  <span className="text-xs font-semibold uppercase text-chalk-soft">Goals · Assists</span>
                </div>
                <ul>
                  {players
                    .filter((p) => p.team === t)
                    .map((p) => {
                      const s = stats[p.id] ?? { g: 0, a: 0 };
                      return (
                        <li
                          key={p.id}
                          className="flex min-h-12 items-center justify-between gap-2 border-b border-rule px-3 py-1 last:border-b-0"
                        >
                          <span className="min-w-0 truncate text-sm font-semibold">{p.name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <Mini
                              label={`${p.name} goals`}
                              value={s.g}
                              canAdd={goalsLeft > 0}
                              onChange={(v) => change(p.id, "g", v)}
                            />
                            <Mini
                              label={`${p.name} assists`}
                              value={s.a}
                              canAdd={assistsLeft > 0}
                              onChange={(v) => change(p.id, "a", v)}
                            />
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            );
          })}
          <p className="text-xs text-chalk-soft">
            Goals left without a scorer count as own goals or forgotten. An assist needs a goal of the same team.
          </p>
        </div>
      )}

      {(problem || error) && (
        <div className="mt-3">
          <ErrorText>{problem ?? error}</ErrorText>
        </div>
      )}
      <div className={`mt-4 grid gap-3 ${onCancel ? "grid-cols-2" : ""}`}>
        {onCancel && (
          <button type="button" onClick={onCancel} className={button.secondary}>
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={busy || !!problem}
          onClick={() => onSave(a, b, stats)}
          className={button.primary}
        >
          {busy ? "Saving…" : `Save ${a}–${b}`}
        </button>
      </div>
    </Panel>
  );
}

function Stepper({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border-2 border-line px-4 py-2">
      <span className={`font-display text-base font-black uppercase ${color}`}>{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className={button.small}
          aria-label={`${label}: one goal less`}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="w-10 text-center" aria-live="polite" aria-label={`${label} goals`}>
          <Mark value={value} size="md" led />
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(99, value + 1))}
          className={button.small}
          aria-label={`${label}: one goal more`}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Small counter for one player's goals or assists. */
function Mini({
  label,
  value,
  canAdd,
  onChange,
}: {
  label: string;
  value: number;
  canAdd: boolean;
  onChange: (v: number) => void;
}) {
  const btn =
    "grid size-8 place-items-center rounded-md border-2 border-line text-chalk transition-colors hover:bg-raised disabled:opacity-35";
  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
        className={btn}
        aria-label={`${label}: one less`}
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
      <span
        className={`tabular w-5 text-center font-display text-lg font-black ${value ? "text-chalk" : "text-chalk-faint"}`}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canAdd}
        className={btn}
        aria-label={`${label}: one more`}
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
