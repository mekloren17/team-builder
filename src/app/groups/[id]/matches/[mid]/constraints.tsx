"use client";

import { useState, useTransition } from "react";
import { button, ErrorText } from "@/components/ui";
import type { PairConstraintRow } from "@/lib/match";
import { setPairConstraint } from "../actions";

/** Admin: keep two players together or apart when the teams are generated. */
export function Constraints({
  groupId,
  matchId,
  players,
  constraints,
}: {
  groupId: string;
  matchId: string;
  players: { id: string; name: string }[];
  constraints: PairConstraintRow[];
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [type, setType] = useState<"together" | "apart">("apart");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  function save(pa: string, pb: string, t: "together" | "apart" | null) {
    setError(null);
    start(async () => {
      const result = await setPairConstraint(groupId, matchId, pa, pb, t);
      if (result?.error) setError(result.error);
      else if (t) {
        setA("");
        setB("");
      }
    });
  }

  const select = "min-h-12 min-w-0 flex-1 border-2 border-ink bg-sheet px-3 font-medium";

  return (
    <div className="space-y-3">
      {constraints.length > 0 && (
        <ul className="space-y-1">
          {constraints.map((c) => (
            <li key={c.id} className="flex min-h-10 items-center justify-between gap-3">
              <span>
                {name(c.player_a)} <span className="font-semibold text-ink-soft">{c.type === "together" ? "with" : "not with"}</span>{" "}
                {name(c.player_b)}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => save(c.player_a, c.player_b, null)}
                className={button.danger}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <select value={a} onChange={(e) => setA(e.target.value)} className={select} aria-label="First player">
          <option value="">Player…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "together" | "apart")}
          className={select}
          aria-label="Constraint"
        >
          <option value="apart">not with</option>
          <option value="together">with</option>
        </select>
        <select value={b} onChange={(e) => setB(e.target.value)} className={select} aria-label="Second player">
          <option value="">Player…</option>
          {players
            .filter((p) => p.id !== a)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          disabled={!a || !b || a === b || busy}
          onClick={() => save(a, b, type)}
          className={button.small}
        >
          Add
        </button>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
