"use client";

import { useState, useTransition } from "react";
import { button, choice, ErrorText, input } from "@/components/ui";
import { createMatch } from "../actions";

export function NewMatchForm({ groupId, defaultFormat }: { groupId: string; defaultFormat: 5 | 7 }) {
  const [when, setWhen] = useState("");
  const [format, setFormat] = useState<5 | 7>(defaultFormat);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // datetime-local is in the phone's time zone: convert to an exact instant here, in the browser
    const startsAt = new Date(when).toISOString();
    startSaving(async () => {
      const result = await createMatch(groupId, startsAt, format);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <label className="block space-y-2">
        <span className="font-semibold">Kick-off</span>
        <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className={input} />
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">Format</legend>
        <div className="grid grid-cols-2 gap-2">
          {([5, 7] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFormat(f)} aria-pressed={format === f} className={`${choice(format === f)} text-center`}>
              {f}-a-side
            </button>
          ))}
        </div>
      </fieldset>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" disabled={!when || saving} className={`${button.primary} w-full`}>
        {saving ? "Creating…" : "Create match"}
      </button>
    </form>
  );
}
