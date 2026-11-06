"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { button, ErrorText, input, Mark, Panel } from "@/components/ui";
import { RESULT_LABEL, type GoalEntry, type ResultStatus } from "@/lib/match";
import { confirmResult, disputeResult, submitResult } from "../actions";

export interface ResultPlayer {
  id: string;
  name: string;
  team: "A" | "B";
}

export interface ResultState {
  status: ResultStatus | null;
  scoreA: number | null;
  scoreB: number | null;
  /** Name of who entered it, and their team (null if not a player of the match). */
  enteredBy: string | null;
  enteredByTeam: "A" | "B" | null;
  /** Goals with a known scorer (the rest of the score are own goals or not known). */
  goals: GoalEntry[];
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

  const save = (a: number, b: number, goals: GoalEntry[]) => run(() => submitResult(groupId, matchId, a, b, goals));

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
        <Scorers goals={result.goals} players={players} />
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
            initialGoals={result.goals}
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

/** Each goal under the score, "Scorer (Assist)", one column per team. */
function Scorers({ goals, players }: { goals: GoalEntry[]; players: ResultPlayer[] }) {
  const name = new Map(players.map((p) => [p.id, p.name]));
  const known = goals.filter((g) => g.scorer && name.has(g.scorer));
  if (known.length === 0) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-4 border-t border-rule pt-3 text-sm">
      {(["A", "B"] as const).map((t) => (
        <ul key={t} className={`space-y-1 ${t === "B" ? "text-right" : ""}`}>
          {known
            .filter((g) => g.team === t)
            .map((g, i) => (
              <li key={i}>
                <span className="font-semibold">{name.get(g.scorer!)}</span>
                {g.assist && name.has(g.assist) && <span className="text-chalk-soft"> ({name.get(g.assist)})</span>}
              </li>
            ))}
        </ul>
      ))}
    </div>
  );
}

type Slot = { scorer: string | null; assist: string | null };

/** One slot per goal of the team: those with a known scorer first, then empty ones. */
function slotsFor(team: "A" | "B", goals: GoalEntry[], score: number): Slot[] {
  const known = goals.filter((g) => g.team === team).map((g) => ({ scorer: g.scorer, assist: g.assist }));
  return [...known, ...Array.from({ length: Math.max(0, score - known.length) }, () => ({ scorer: null, assist: null }))];
}

function ScoreForm({
  title,
  note,
  initialA = 0,
  initialB = 0,
  initialGoals = [],
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
  initialGoals?: GoalEntry[];
  players: ResultPlayer[];
  busy: boolean;
  error: string | null;
  onSave: (a: number, b: number, goals: GoalEntry[]) => void;
  onCancel?: () => void;
}) {
  const [slots, setSlots] = useState<Record<"A" | "B", Slot[]>>({
    A: slotsFor("A", initialGoals, initialA),
    B: slotsFor("B", initialGoals, initialB),
  });
  const [showScorers, setShowScorers] = useState(initialGoals.length > 0);
  const score = { A: slots.A.length, B: slots.B.length };

  // The score is the number of goal slots: + adds an empty one, − removes the last one.
  function setScore(t: "A" | "B", n: number) {
    const cur = slots[t];
    const next = n > cur.length ? [...cur, ...Array.from({ length: n - cur.length }, () => ({ scorer: null, assist: null }))] : cur.slice(0, n);
    setSlots({ ...slots, [t]: next });
  }

  function setSlot(t: "A" | "B", i: number, slot: Slot) {
    // an assist needs a scorer, and someone else
    const fixed = { ...slot, assist: slot.scorer && slot.assist !== slot.scorer ? slot.assist : null };
    setSlots({ ...slots, [t]: slots[t].map((s, j) => (j === i ? fixed : s)) });
  }

  function submit() {
    const goals: GoalEntry[] = (["A", "B"] as const).flatMap((t) =>
      slots[t].filter((s) => s.scorer).map((s) => ({ team: t, scorer: s.scorer, assist: s.assist })),
    );
    onSave(score.A, score.B, goals);
  }

  return (
    <Panel className="p-4">
      <h3 className="font-display text-lg font-extrabold uppercase">{title}</h3>
      <p className="mb-4 text-sm text-chalk-soft">{note}</p>
      <div className="grid gap-3">
        <Stepper label="Team A" color="text-bib" value={score.A} onChange={(n) => setScore("A", n)} />
        <Stepper label="Team B" color="text-bib-orange" value={score.B} onChange={(n) => setScore("B", n)} />
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
            const team = players.filter((p) => p.team === t);
            return (
              <div key={t} className="rounded-md border-2 border-line">
                <div className="border-b-2 border-line px-3 py-2">
                  <span className={`font-display font-black uppercase ${t === "A" ? "text-bib" : "text-bib-orange"}`}>
                    Team {t}
                  </span>
                </div>
                {slots[t].length === 0 ? (
                  <p className="px-3 py-3 text-sm text-chalk-soft">No goals.</p>
                ) : (
                  <ol>
                    {slots[t].map((s, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 border-b border-rule px-3 py-2 last:border-b-0"
                      >
                        <span className="text-xs font-semibold uppercase text-chalk-soft">Goal {i + 1}</span>
                        <select
                          aria-label={`Team ${t}, goal ${i + 1}: scorer`}
                          value={s.scorer ?? ""}
                          onChange={(e) => setSlot(t, i, { ...s, scorer: e.target.value || null })}
                          className={`${input} min-h-11 px-2 text-sm`}
                        >
                          <option value="">Scorer?</option>
                          {team.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label={`Team ${t}, goal ${i + 1}: assist`}
                          value={s.assist ?? ""}
                          disabled={!s.scorer}
                          onChange={(e) => setSlot(t, i, { ...s, assist: e.target.value || null })}
                          className={`${input} min-h-11 px-2 text-sm disabled:opacity-45`}
                        >
                          <option value="">No assist</option>
                          {team
                            .filter((p) => p.id !== s.scorer)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
          <p className="text-xs text-chalk-soft">A goal left without a scorer counts as an own goal or not known.</p>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <div className={`mt-4 grid gap-3 ${onCancel ? "grid-cols-2" : ""}`}>
        {onCancel && (
          <button type="button" onClick={onCancel} className={button.secondary}>
            Cancel
          </button>
        )}
        <button type="button" disabled={busy} onClick={submit} className={button.primary}>
          {busy ? "Saving…" : `Save ${score.A}–${score.B}`}
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
