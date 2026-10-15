"use client";

import { useState, useTransition } from "react";
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
    <section className="space-y-3 rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900">
      <h2 className="font-semibold">{imIn ? "You're in. How do you feel today?" : "Are you playing? How do you feel today?"}</h2>
      <div className="grid grid-cols-5 gap-2">
        {FORM_LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            disabled={busy}
            onClick={() => {
              setForm(l.value);
              if (imIn) save(true, l.value);
            }}
            aria-pressed={form === l.value}
            className={`flex flex-col items-center rounded-xl border px-1 py-2 text-xs ${
              form === l.value ? "border-foreground bg-foreground text-background" : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <span className="text-xl leading-none">{l.icon}</span>
            <span className="mt-1">{l.label}</span>
          </button>
        ))}
      </div>
      {imIn ? (
        <button type="button" disabled={busy} onClick={() => save(false)} className="text-sm text-zinc-500 underline">
          I can&apos;t make it anymore
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => save(true)}
          className="h-12 w-full rounded-full bg-foreground font-medium text-background disabled:opacity-50"
        >
          I&apos;m in
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
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
      className="text-sm underline disabled:opacity-50"
    >
      {label}
    </button>
  );
}
