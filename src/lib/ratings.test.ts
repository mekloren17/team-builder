import { test } from "node:test";
import assert from "node:assert/strict";
import { formatChange, groupRatings, type ConfirmedMatch } from "./ratings.ts";

const team = (ids: string[], t: "A" | "B") => ids.map((player_id) => ({ player_id, team: t, form: 3 }));

test("no matches: everyone with a questionnaire keeps it, the others get no rating", () => {
  const r = groupRatings(
    [
      { id: "a", prior_overall: 70 },
      { id: "b", prior_overall: null },
    ],
    [],
  );
  assert.equal(Math.round(r.get("a")!), 70);
  assert.equal(r.has("b"), false);
});

test("winners go up, losers go down, by the same total", () => {
  const players = ["a1", "a2", "b1", "b2"].map((id) => ({
    id,
    prior_overall: 60,
  }));
  const match: ConfirmedMatch = {
    format: 5,
    score_a: 8,
    score_b: 2,
    match_players: [...team(["a1", "a2"], "A"), ...team(["b1", "b2"], "B")],
  };
  const r = groupRatings(players, [match]);
  assert.ok(r.get("a1")! > 60 && r.get("a2")! > 60);
  assert.ok(r.get("b1")! < 60 && r.get("b2")! < 60);
  const total = [...r.values()].reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(total - 240) < 1e-9);
});

test("someone without a questionnaire who played starts from 60", () => {
  const r = groupRatings(
    [
      { id: "a", prior_overall: 70 },
      { id: "b", prior_overall: null },
    ],
    [
      {
        format: 5,
        score_a: 3,
        score_b: 3,
        match_players: [...team(["a"], "A"), ...team(["b"], "B")],
      },
    ],
  );
  assert.ok(r.has("b"));
  assert.ok(r.get("b")! > 60 && r.get("a")! < 70); // a draw pulls the two levels closer
});

test("players no longer in the group are ignored", () => {
  const r = groupRatings(
    [
      { id: "a", prior_overall: 60 },
      { id: "b", prior_overall: 60 },
    ],
    [
      {
        format: 5,
        score_a: 5,
        score_b: 1,
        match_players: [...team(["a", "gone"], "A"), ...team(["b"], "B")],
      },
    ],
  );
  assert.equal(r.has("gone"), false);
  assert.ok(r.get("a")! > 60);
});

test("changes are shown with one decimal and a sign", () => {
  assert.equal(formatChange(60, 60.43), "+0.4");
  assert.equal(formatChange(60, 58.8), "−1.2");
  assert.equal(formatChange(60, 60.02), "0.0");
});
