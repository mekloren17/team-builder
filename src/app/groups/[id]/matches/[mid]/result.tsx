"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { button, ErrorText, Mark, Panel } from "@/components/ui";
import { RESULT_LABEL, type ResultStatus } from "@/lib/match";
import { confirmResult, disputeResult, submitResult } from "../actions";

export interface ResultState {
  status: ResultStatus | null;
  scoreA: number | null;
  scoreB: number | null;
  /** Name of who entered it, and their team (null if not a player of the match). */
  enteredBy: string | null;
  enteredByTeam: "A" | "B" | null;
}

/**
 * The score of the match and what the signed-in member can do with it:
 * enter it (players of the match, admins), confirm or dispute it (the other team, admins),
 * correct it (admins).
 */
export function Result({
  groupId,
  matchId,
  result,
  canEnter,
  canAnswer,
  canManage,
}: {
  groupId: string;
  matchId: string;
  result: ResultState;
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

  // No result yet: the form, for whoever may enter it.
  if (result.status === null) {
    if (!canEnter)
      return <Panel className="p-4 text-sm text-chalk-soft">The score will appear here after the match.</Panel>;
    return (
      <ScoreForm
        title="Enter the result"
        note={canManage ? "As an admin, your score is final at once." : "A player of the other team confirms it."}
        busy={busy}
        error={error}
        onSave={(a, b) => run(() => submitResult(groupId, matchId, a, b))}
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
            A player of {otherTeam} or an admin confirms it. The marks change after that.
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
            busy={busy}
            error={error}
            onSave={(a, b) => run(() => submitResult(groupId, matchId, a, b))}
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

function ScoreForm({
  title,
  note,
  initialA = 0,
  initialB = 0,
  busy,
  error,
  onSave,
  onCancel,
}: {
  title: string;
  note: string;
  initialA?: number;
  initialB?: number;
  busy: boolean;
  error: string | null;
  onSave: (a: number, b: number) => void;
  onCancel?: () => void;
}) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  return (
    <Panel className="p-4">
      <h3 className="font-display text-lg font-extrabold uppercase">{title}</h3>
      <p className="mb-4 text-sm text-chalk-soft">{note}</p>
      <div className="grid gap-3">
        <Stepper label="Team A" color="text-bib" value={a} onChange={setA} />
        <Stepper label="Team B" color="text-bib-orange" value={b} onChange={setB} />
      </div>
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
        <button type="button" disabled={busy} onClick={() => onSave(a, b)} className={button.primary}>
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
