"use client";

import { useState, useTransition } from "react";
import { button, ErrorText, FormIcon } from "@/components/ui";
import { FORM_LEVELS } from "@/lib/match";
import { setAttendance } from "../actions";

/** "I'm in" with the form of the day, or "I'm out". */
export function MyAttendance({
  groupId,
  matchId,
  playerId,
  signedForm,
}: {
  groupId: string;
  matchId: string;
  playerId: string;
  signedForm: number | null; // null: not signed up
}) {
  const [form, setForm] = useState(signedForm ?? 3);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const imIn = signedForm !== null;

  function save(attending: boolean, f = form) {
    setError(null);
    start(async () => {
      const result = await setAttendance(groupId, matchId, playerId, attending, f);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 font-semibold">
          {imIn ? (
            <span className="stamp-in inline-block">
              <span className="mr-2 inline-block border-2 border-red px-2 font-display text-lg font-extrabold uppercase text-red">You&apos;re in</span>
              How are the legs today?
            </span>
          ) : (
            "How are the legs today?"
          )}
        </legend>
        <div className="grid grid-cols-5 border-2 border-ink">
          {FORM_LEVELS.map((l) => {
            const on = form === l.value;
            return (
              <button
                key={l.value}
                type="button"
                disabled={busy}
                onClick={() => {
                  setForm(l.value);
                  if (imIn) save(true, l.value);
                }}
                aria-pressed={on}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 border-r border-rule px-0.5 text-sm font-semibold transition-colors duration-150 last:border-r-0 ${
                  on ? "bg-ink text-paper" : "bg-sheet text-ink hover:bg-paper-deep"
                }`}
              >
                <FormIcon form={l.value} className="size-6" />
                {l.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      {imIn ? (
        <button type="button" disabled={busy} onClick={() => save(false)} className={button.quiet}>
          Something came up, take me off the list
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => save(true)}
          className={`${button.primary} min-h-14 w-full text-2xl transition-transform duration-150 active:scale-[0.98]`}
        >
          {busy ? "Signing you up…" : "I'm in"}
        </button>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

/** Admin: sign someone in or out (guests included). */
export function AttendanceToggle({
  groupId,
  matchId,
  playerId,
  attending,
  label,
}: {
  groupId: string;
  matchId: string;
  playerId: string;
  attending: boolean;
  label: string;
}) {
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => start(async () => void (await setAttendance(groupId, matchId, playerId, attending)))}
      className={attending ? button.small : button.danger}
    >
      {busy ? "…" : label}
    </button>
  );
}
