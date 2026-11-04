import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialOverall, cardAttributes, winProbability, updateAfterMatch, balanceTeams, assignPositions, estimateRatings, isProvisional, ageFromBirthYear, splitStrengths, skillAnswers, DEFAULT_PARAMS,
  type Profile, type BalancePlayer, type HistoryMatch,
} from './engine.ts';

const base: Profile = { age: 28, level: 'semipro', years: '10+', freq: '1w', attrs: [4, 3, 4, 3, 3, 4], positions: ['MID'], gkRotation: false };

test('spec example: semipro 10+ years, weekly, attrs 3.5, age 28 -> 75', () => {
  assert.equal(initialOverall(base), 75);
});

test('overall is clamped to 40..92', () => {
  assert.equal(initialOverall({ ...base, level: 'never', years: '0-2', freq: 'lt1m', attrs: [1, 1, 1, 1, 1, 1], age: 50 }), 40);
  // best possible profile: 0.45*95 + 0.25*85 + 0.30*90 = 91
  assert.equal(initialOverall({ ...base, level: 'elite', freq: '2w', attrs: [5, 5, 5, 5, 5, 5] }), 91);
});

test('card attributes orbit the overall', () => {
  assert.deepEqual(cardAttributes(75, [4, 3, 4, 3, 3, 4]), [78, 72, 78, 72, 72, 78]);
});

test('5 points of difference -> about 68%', () => {
  assert.ok(Math.abs(winProbability(80, 75) - 0.683) < 0.001);
});

test('spec table: new player deltas', () => {
  const p = { rating: { mu: 70, sigma: 8, matches: 0 }, form: 3 };
  const mk = (muA: number, muB: number, sa: number, sb: number) =>
    updateAfterMatch([{ ...p, rating: { ...p.rating, mu: muA } }], [{ ...p, rating: { ...p.rating, mu: muB } }], sa, sb).a[0].mu - muA;
  assert.ok(Math.abs(mk(70, 70, 5, 4) - 2.0) < 0.01); // even match win
  // underdog with E = 0.30 needs a gap of 15*log10(0.7/0.3)
  const gap = 15 * Math.log10(0.7 / 0.3);
  assert.ok(Math.abs(mk(70 - gap, 70, 5, 4) - 2.8) < 0.01);
  assert.ok(Math.abs(mk(70 + gap, 70, 5, 4) - 1.2) < 0.01);
  assert.ok(Math.abs(mk(70 + gap, 70, 4, 5) - -2.8) < 0.01);
});

test('veteran moves less and sigma never drops below the minimum', () => {
  const vet = { rating: { mu: 70, sigma: 2.5, matches: 30 }, form: 3 };
  const r = updateAfterMatch([vet], [vet], 5, 4);
  assert.ok(Math.abs(r.a[0].mu - 70 - 0.625) < 1e-9);
  assert.equal(r.a[0].sigma, DEFAULT_PARAMS.sigmaMin);
});

function players(n: number): BalancePlayer[] {
  const pos = ['GK', 'DEF', 'MID', 'ATT'] as const;
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, mu: 55 + ((i * 37) % 30), form: 3, positions: [pos[i % 4]], gkRotation: false }));
}

test('balance 14 players: three distinct proposals, keepers split, fast', () => {
  const t0 = performance.now();
  const props = balanceTeams(players(14));
  const ms = performance.now() - t0;
  assert.equal(props.length, 3);
  for (const p of props) {
    assert.equal(p.teamA.length, 7);
    assert.ok(Math.abs(p.winProbA - 0.5) < 0.05);
  }
  assert.ok(ms < 200, `took ${ms}ms`);
});

test('hard constraints are respected', () => {
  const ps = players(10);
  const [best] = balanceTeams(ps, { together: [['p1', 'p2']], apart: [['p3', 'p5']] });
  const inA = (id: string) => best.teamA.includes(id);
  assert.equal(inA('p1'), inA('p2'));
  assert.notEqual(inA('p3'), inA('p5'));
});

test('batch rating: no matches -> questionnaire overall', () => {
  const prior = new Map([['a', 60], ['b', 70]]);
  const est = estimateRatings(prior, []);
  assert.ok(Math.abs(est.get('a')! - 60) < 1e-9 && Math.abs(est.get('b')! - 70) < 1e-9);
});

test('batch rating: a player who keeps winning goes up, the others go down', () => {
  const ids = ['x', 'a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4', 'b5'];
  const prior = new Map(ids.map((id) => [id, 60]));
  const history: HistoryMatch[] = Array.from({ length: 20 }, (_, m) => {
    const others = ids.slice(1);
    const rotated = [...others.slice(m % 9), ...others.slice(0, m % 9)];
    return { teamA: ['x', ...rotated.slice(0, 4)], teamB: rotated.slice(4), formA: [3, 3, 3, 3, 3], formB: [3, 3, 3, 3, 3], goalsA: 7, goalsB: 4, format: 5 as const };
  });
  const est = estimateRatings(prior, history);
  assert.ok(est.get('x')! > 66, `x = ${est.get('x')}`);
  for (const id of ids.slice(1)) assert.ok(est.get(id)! < est.get('x')!);
});

test('positions: preferred keeper goes in goal', () => {
  const team = players(5);
  const out = assignPositions(team, 5);
  assert.equal(out.slots.find((s) => s.pos === 'GK')!.id, 'p0');
  assert.equal(out.slots.length, 5);
});

test('provisional badge: fewer than 10 matches played', () => {
  assert.equal(isProvisional(0), true);
  assert.equal(isProvisional(9), true);
  assert.equal(isProvisional(10), false);
});

test('age from birth year', () => {
  assert.equal(ageFromBirthYear(1998, 2026), 28);
});

test('odd number: one team has an extra player, and gets the weaker players', () => {
  const ps = players(11);
  const props = balanceTeams(ps);
  assert.equal(props.length, 3);
  const mu = new Map(ps.map((p) => [p.id, p.mu]));
  for (const p of props) {
    assert.equal(p.teamA.length + p.teamB.length, 11);
    assert.equal(Math.abs(p.teamA.length - p.teamB.length), 1);
  }
  const [best] = props;
  const [big, small] = best.teamA.length > best.teamB.length ? [best.teamA, best.teamB] : [best.teamB, best.teamA];
  const avg = (ids: string[]) => ids.reduce((s, id) => s + mu.get(id)!, 0) / ids.length;
  assert.ok(avg(big) < avg(small), `bigger team avg ${avg(big)} should be below ${avg(small)}`);
  assert.ok(Math.abs(best.winProbA - 0.5) < 0.1);
});

test('split strengths: equal teams -> mean level; the extra player is worth extraPlayer points', () => {
  assert.deepEqual(splitStrengths([60, 70], [65, 65]), { sA: 65, sB: 65 });
  const { sA, sB } = splitStrengths([60, 60, 60], [60, 60], 5);
  assert.equal(sA - sB, 5);
  // 6 against 5 equal players: the bigger team is favourite, but far from certain
  const p = winProbability(...Object.values(splitStrengths(Array(6).fill(70), Array(5).fill(70))) as [number, number]);
  assert.ok(p > 0.6 && p < 0.75, `p = ${p}`);
});

test('batch rating: a bigger team winning by the expected margin moves nobody much', () => {
  const prior = new Map([['a', 60], ['b', 60], ['c', 60], ['d', 60], ['e', 60]]);
  // 3 against 2 with equal levels: expected margin = kappa * extraPlayer ≈ 1.5 goals
  const h: HistoryMatch = { teamA: ['a', 'b', 'c'], teamB: ['d', 'e'], formA: [3, 3, 3], formB: [3, 3], goalsA: 2, goalsB: 0, format: 5 };
  const est = estimateRatings(prior, [h]);
  for (const id of prior.keys()) assert.ok(Math.abs(est.get(id)! - 60) < 0.5, `${id} = ${est.get(id)}`);
});

test('one keeper and one "fine in goal": they end up in different teams', () => {
  const ps: BalancePlayer[] = players(10).map((p) => ({ ...p, positions: p.positions.filter((x) => x !== 'GK'), gkRotation: false }));
  ps[0] = { ...ps[0], positions: ['GK'] };
  ps[5] = { ...ps[5], gkRotation: true };
  const [best] = balanceTeams(ps);
  const inA = (id: string) => best.teamA.includes(id);
  assert.notEqual(inA(ps[0].id), inA(ps[5].id));
});

test('positions: with no keeper, a player without preferences goes in goal before a defender', () => {
  const team: BalancePlayer[] = [
    { id: 'def', mu: 50, form: 3, positions: ['DEF'], gkRotation: false },
    { id: 'guest', mu: 65, form: 3, positions: [], gkRotation: false },
    { id: 'att', mu: 70, form: 3, positions: ['ATT'], gkRotation: false },
  ];
  const out = assignPositions(team, 5);
  assert.equal(out.slots.find((s) => s.pos === 'GK')!.id, 'guest');
});

test('keeper: the overall comes from the keeper answers, not the outfield ones', () => {
  // a good keeper who would be a poor outfield player
  const keeper: Profile = { ...base, positions: ['GK'], keeper: true, attrs: [1, 1, 2, 1, 2, 2], gkAttrs: [4, 3, 4, 3, 3, 4] };
  // same answers as the spec example (attrs mean 3.5) -> same overall, 75
  assert.equal(initialOverall(keeper), 75);
  assert.deepEqual(skillAnswers(keeper), [4, 3, 4, 3, 3, 4]);
  // an outfield player who also likes goal is still rated on the outfield answers
  const outfield: Profile = { ...base, positions: ['MID', 'GK'], keeper: false, gkAttrs: [5, 5, 5, 5, 5, 5] };
  assert.equal(initialOverall(outfield), 75);
  // a keeper with no keeper answers yet falls back to the outfield ones
  assert.equal(initialOverall({ ...base, keeper: true }), 75);
});
