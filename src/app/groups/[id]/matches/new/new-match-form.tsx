"use client";

import { useState, useTransition } from "react";
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
    <form onSubmit={submit} className="space-y-5">
      <label className="block space-y-2">
        <span className="font-medium">Date and time</span>
        <input
          type="datetime-local"
          required
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="h-12 w-full rounded-xl border border-zinc-300 bg-transparent px-4 dark:border-zinc-700"
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="font-medium">Format</legend>
        <div className="grid grid-cols-2 gap-3">
          {([5, 7] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
              className={`h-12 rounded-xl border ${
                format === f ? "border-foreground bg-foreground text-background" : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {f}-a-side
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!when || saving}
        className="h-12 w-full rounded-full bg-foreground font-medium text-background disabled:opacity-40"
      >
        {saving ? "Creating…" : "Create match"}
      </button>
    </form>
  );
}
