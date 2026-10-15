// Team Builder — core engine
// Overall from profile, dynamic rating (mu/sigma), team balancing.
// Pure functions, no I/O: the same module will run inside the web app.

export type Level = 'never' | 'amateur' | 'youth' | 'semipro' | 'elite';
export type Years = '0-2' | '3-5' | '6-10' | '10+';
export type Freq = 'lt1m' | '1-3m' | '1w' | '2w';
export type Pos = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface Profile {
  age: number;
  level: Level;
  years: Years;
  freq: Freq;
  attrs: number[]; // Pace, Shooting, Passing, Dribbling, Defending, Physical — each 1..5
  positions: Pos[];
  gkRotation: boolean;
}

export interface Rating {
  mu: number;
  sigma: number;
  matches: number;
}

export interface Params {
  kBase: number; // max rating change per match for a new player (before margin)
  sigma0: number; // starting uncertainty
  sigmaMin: number;
  sigmaDecay: number; // sigma multiplier after each match
  D: number; // logistic scale: points of team difference
  formStep: number; // points per form step away from 3
  extraPlayer: number; // points of strength of having one player more (odd number of players); a guess, to calibrate with real matches
}

export const DEFAULT_PARAMS: Params = {
  kBase: 4,
  sigma0: 8,
  sigmaMin: 2.5,
  sigmaDecay: 0.93,
  D: 15,
  formStep: 2,
  extraPlayer: 5,
};

// ---------- 1. Starting overall ----------

const LEVEL_POINTS: Record<Level, number> = { never: 30, amateur: 50, youth: 65, semipro: 80, elite: 92 };
const YEARS_ADJ: Record<Years, number> = { '0-2': -10, '3-5': -3, '6-10': 0, '10+': 3 };
const FREQ_POINTS: Record<Freq, number> = { lt1m: 35, '1-3m': 55, '1w': 70, '2w': 85 };

export function ageFactor(age: number): number {
  if (age <= 30) return 1.0;
  if (age <= 35) return 0.97;
  if (age <= 40) return 0.93;
  if (age <= 45) return 0.88;
  return 0.82;
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function experienceScore(p: Profile): number {
  return LEVEL_POINTS[p.level] + YEARS_ADJ[p.years];
}
export function frequencyScore(p: Profile): number {
  return FREQ_POINTS[p.freq];
}
export function attributeScore(p: Profile): number {
  return 30 + 15 * (mean(p.attrs) - 1);
}

export function initialOverall(p: Profile): number {
  const B = (0.45 * experienceScore(p) + 0.25 * frequencyScore(p) + 0.3 * attributeScore(p)) * ageFactor(p.age);
  return clamp(Math.round(B), 40, 92);
}

export function newRating(p: Profile, params: Params = DEFAULT_PARAMS): Rating {
  return { mu: initialOverall(p), sigma: params.sigma0, matches: 0 };
}

/** Card attributes orbit the overall: attr_i = OVR + 6 (a_i - mean a). */
export function cardAttributes(overall: number, attrs: number[]): number[] {
  const m = mean(attrs);
  return attrs.map((a) => clamp(Math.round(overall + 6 * (a - m)), 30, 99));
}

export const PROVISIONAL_MATCHES = 10;

/** With the batch rating there is no sigma: a rating is provisional until the player has 10 matches. */
export function isProvisional(matchesPlayed: number): boolean {
  return matchesPlayed < PROVISIONAL_MATCHES;
}

/** Age in a given year, from the birth year asked in the questionnaire. */
export function ageFromBirthYear(birthYear: number, year: number = new Date().getFullYear()): number {
  return year - birthYear;
}

// ---------- 2. Expected result and rating update ----------

export function effectiveMu(mu: number, form: number, params: Params = DEFAULT_PARAMS): number {
  return mu + params.formStep * (form - 3);
}

export function winProbability(sA: number, sB: number, params: Params = DEFAULT_PARAMS): number {
  return 1 / (1 + Math.pow(10, -(sA - sB) / params.D));
}

export function marginFactor(goalDiff: number): number {
  const g = Math.abs(goalDiff);
  if (g <= 2) return 1;
  if (g <= 5) return 1.25;
  return 1.5;
}

export interface Participant {
  rating: Rating;
  form: number; // 1..5
}

export function teamStrength(team: Participant[], params: Params = DEFAULT_PARAMS): number {
  return mean(team.map((p) => effectiveMu(p.rating.mu, p.form, params)));
}

/** Returns the new ratings for team A and team B, in the same order. */
export function updateAfterMatch(
  teamA: Participant[],
  teamB: Participant[],
  scoreA: number,
  scoreB: number,
  params: Params = DEFAULT_PARAMS,
): { a: Rating[]; b: Rating[]; expectedA: number } {
  const eA = winProbability(teamStrength(teamA, params), teamStrength(teamB, params), params);
  const rA = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
  const M = marginFactor(scoreA - scoreB);
  const upd = (p: Participant, r: number, e: number): Rating => {
    const k = params.kBase * (p.rating.sigma / params.sigma0);
    return {
      mu: p.rating.mu + k * M * (r - e),
      sigma: Math.max(params.sigmaMin, p.rating.sigma * params.sigmaDecay),
      matches: p.rating.matches + 1,
    };
  };
  return {
    a: teamA.map((p) => upd(p, rA, eA)),
    b: teamB.map((p) => upd(p, 1 - rA, 1 - eA)),
    expectedA: eA,
  };
}

// ---------- 2b. Batch rating (recommended after simulation) ----------
// Every rating is recomputed from the whole match history: the level that best explains
// all goal differences, starting from the questionnaire overall.
//   goal difference ≈ kappa · (mean level A − mean level B + form difference)
// Weighted ridge regression, solved exactly. 50 players → a 50×50 system, ~1 ms.

export interface HistoryMatch {
  teamA: string[];
  teamB: string[];
  formA: number[]; // declared form (1..5) of each player, same order as teamA
  formB: number[];
  goalsA: number;
  goalsB: number;
  format: 5 | 7;
}

export interface BatchParams {
  tau: number; // how far (sd, overall points) the questionnaire may be from the true level
  kappa: Record<5 | 7, number>; // goals of difference per point of team-level difference
  goalVar: Record<5 | 7, number>; // variance of goal difference in an even match
  formStep: number;
  extraPlayer: number; // as in Params: strength of having one player more
}

export const DEFAULT_BATCH: BatchParams = {
  tau: 6,
  kappa: { 5: 0.305, 7: 0.333 },
  goalVar: { 5: 10, 7: 12 },
  formStep: 2,
  extraPlayer: 5,
};

export function estimateRatings(prior: Map<string, number>, history: HistoryMatch[], params: BatchParams = DEFAULT_BATCH): Map<string, number> {
  const ids = [...prior.keys()];
  const n = ids.length, ix = new Map(ids.map((id, i) => [id, i]));
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  const v = new Array(n).fill(0);
  const inv = 1 / (params.tau * params.tau);
  ids.forEach((id, i) => { M[i][i] += inv; v[i] += prior.get(id)! * inv; });
  for (const h of history) {
    const kappa = params.kappa[h.format];
    const w = (kappa * kappa) / params.goalVar[h.format];
    const row = new Map<number, number>();
    for (const id of h.teamA) if (ix.has(id)) row.set(ix.get(id)!, 1 / h.teamA.length);
    for (const id of h.teamB) if (ix.has(id)) row.set(ix.get(id)!, -1 / h.teamB.length);
    // known part of the strength difference: form, and the extra player (as in splitStrengths)
    const known = params.formStep * (mean(h.formA) - mean(h.formB)) + params.extraPlayer * (h.teamA.length - h.teamB.length);
    const y = (h.goalsA - h.goalsB) / kappa - known;
    for (const [i, ai] of row) {
      v[i] += w * ai * y;
      for (const [j, aj] of row) M[i][j] += w * ai * aj;
    }
  }
  const x = solveLinear(M, v);
  return new Map(ids.map((id, i) => [id, x[i]]));
}

function solveLinear(M: number[][], v: number[]): number[] {
  const n = v.length, A = M.map((r, i) => [...r, v[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      if (f) for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = A[r][n];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / A[r][r];
  }
  return x;
}

// ---------- 3. Balancing ----------

export interface BalancePlayer {
  id: string;
  mu: number;
  form: number;
  positions: Pos[];
  gkRotation: boolean;
}

export interface BalanceOptions {
  previousTeams?: string[][]; // teams of the last match, to encourage variety
  together?: [string, string][];
  apart?: [string, string][];
  proposals?: number; // how many to return (default 3)
  weights?: { gk: number; role: number; repeat: number };
}

export interface Proposal {
  teamA: string[];
  teamB: string[];
  strengthA: number;
  strengthB: number;
  winProbA: number;
  penalty: number;
}

const DEFAULT_WEIGHTS = { gk: 10, role: 1.5, repeat: 0.2 };

/**
 * Strength of two teams that may differ by one player: mean level, plus half of `extraPlayer` points
 * to the bigger team and minus half to the smaller one. With equal teams it is the mean level.
 * (Counting the extra player in full would give 6 against 5 equal players ~97% to win: far too much.)
 */
export function splitStrengths(
  effA: number[],
  effB: number[],
  extraPlayer: number = DEFAULT_PARAMS.extraPlayer,
): { sA: number; sB: number } {
  const bonus = (extraPlayer * (effA.length - effB.length)) / 2;
  return { sA: mean(effA) + bonus, sB: mean(effB) - bonus };
}

/**
 * Exhaustive search over all splits. 10 → 126 splits, 14 → 1716.
 * With an odd number of players one team has one player more (decided with Lorenzo, 15/10/2026).
 */
export function balanceTeams(
  players: BalancePlayer[],
  opts: BalanceOptions = {},
  params: Params = DEFAULT_PARAMS,
): Proposal[] {
  const n = players.length;
  if (n < 2) throw new Error('balanceTeams needs at least 2 players');
  const sizesA = n % 2 === 0 ? [n / 2] : [Math.floor(n / 2), Math.ceil(n / 2)];
  const w = opts.weights ?? DEFAULT_WEIGHTS;
  const eff = players.map((p) => effectiveMu(p.mu, p.form, params));
  const isGk = players.map((p) => p.positions.includes('GK'));
  const gkCount = isGk.filter(Boolean).length;
  const idx = new Map(players.map((p, i) => [p.id, i]));

  // previous teammates, as index pairs
  const prevSame = new Set<string>();
  for (const t of opts.previousTeams ?? []) {
    const ids = t.map((id) => idx.get(id)).filter((i): i is number => i !== undefined);
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) prevSame.add(pairKey(ids[a], ids[b]));
  }
  const together = (opts.together ?? []).map(([x, y]) => [idx.get(x), idx.get(y)]).filter(([a, b]) => a !== undefined && b !== undefined) as [number, number][];
  const apart = (opts.apart ?? []).map(([x, y]) => [idx.get(x), idx.get(y)]).filter(([a, b]) => a !== undefined && b !== undefined) as [number, number][];

  const results: { mask: number; penalty: number; sA: number; sB: number }[] = [];
  // player 0 always in team A → each split counted once
  const rest = n - 1;
  const iterate = (start: number, chosen: number, mask: number, size: number) => {
    if (chosen === size) {
      evaluate(mask);
      return;
    }
    for (let i = start; i <= rest; i++) {
      if (rest - i + 1 < size - chosen) break;
      iterate(i + 1, chosen + 1, mask | (1 << i), size);
    }
  };
  const evaluate = (mask: number) => {
    const inA = (i: number) => (mask & (1 << i)) !== 0;
    for (const [a, b] of together) if (inA(a) !== inA(b)) return;
    for (const [a, b] of apart) if (inA(a) === inA(b)) return;
    let sumA = 0, sumB = 0, nA = 0, gkA = 0, gkB = 0;
    let defA = 0, defB = 0, attA = 0, attB = 0;
    for (let i = 0; i < n; i++) {
      const p = players[i];
      if (inA(i)) {
        sumA += eff[i];
        nA++;
        if (isGk[i]) gkA++;
        if (p.positions.includes('DEF')) defA++;
        if (p.positions.includes('ATT')) attA++;
      } else {
        sumB += eff[i];
        if (isGk[i]) gkB++;
        if (p.positions.includes('DEF')) defB++;
        if (p.positions.includes('ATT')) attB++;
      }
    }
    // same as splitStrengths, inlined for speed
    const nB = n - nA, bonus = (params.extraPlayer * (nA - nB)) / 2;
    const sA = sumA / nA + bonus, sB = sumB / nB - bonus;
    let penalty = Math.abs(sA - sB);
    if (gkCount >= 2 && (gkA === 0 || gkB === 0)) penalty += w.gk;
    if (defA === 0) penalty += w.role;
    if (defB === 0) penalty += w.role;
    if (attA === 0) penalty += w.role;
    if (attB === 0) penalty += w.role;
    if (prevSame.size > 0) {
      let repeats = 0;
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (inA(a) === inA(b) && prevSame.has(pairKey(a, b))) repeats++;
      penalty += w.repeat * repeats;
    }
    results.push({ mask, penalty, sA, sB });
  };
  for (const size of sizesA) iterate(1, 1, 1, size); // bit 0 = player 0, already in A

  results.sort((x, y) => x.penalty - y.penalty);
  const want = opts.proposals ?? 3;
  const picked: typeof results = [];
  for (const r of results) {
    // a new proposal must move at least 2 players compared with each one already picked
    if (picked.every((p) => splitDistance(p.mask, r.mask, n) >= 2)) picked.push(r);
    if (picked.length === want) break;
  }
  return picked.map((r) => ({
    teamA: players.filter((_, i) => (r.mask & (1 << i)) !== 0).map((p) => p.id),
    teamB: players.filter((_, i) => (r.mask & (1 << i)) === 0).map((p) => p.id),
    strengthA: r.sA,
    strengthB: r.sB,
    winProbA: winProbability(r.sA, r.sB, params),
    penalty: r.penalty,
  }));
}

function pairKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** How many players change team between two splits (player 0 is always in A; teams may differ by one). */
function splitDistance(m1: number, m2: number, n: number): number {
  let out = 0, inn = 0;
  for (let i = 0; i < n; i++) {
    if ((m1 & (1 << i)) && !(m2 & (1 << i))) out++;
    if (!(m1 & (1 << i)) && (m2 & (1 << i))) inn++;
  }
  return Math.max(out, inn);
}

// ---------- 4. Positions on the pitch ----------

export const FORMATIONS: Record<5 | 7, { name: string; slots: Pos[] }[]> = {
  5: [
    { name: '1-2-2', slots: ['GK', 'DEF', 'DEF', 'ATT', 'ATT'] },
    { name: '1-1-2-1', slots: ['GK', 'DEF', 'MID', 'MID', 'ATT'] },
  ],
  7: [
    { name: '1-3-2-1', slots: ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'ATT'] },
    { name: '1-2-3-1', slots: ['GK', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT'] },
  ],
};

/** Assigns players to slots of the formation that leaves the fewest players out of their preferred positions. */
export function assignPositions(team: BalancePlayer[], format: 5 | 7): { formation: string; slots: { id: string; pos: Pos; preferred: boolean }[] } {
  let best: { formation: string; slots: { id: string; pos: Pos; preferred: boolean }[]; misses: number } | null = null;
  for (const f of FORMATIONS[format]) {
    const slots = f.slots.slice(0, team.length);
    while (slots.length < team.length) slots.push('MID'); // extra players (subs) shown as midfielders
    const assignment = greedyAssign(team, slots);
    const misses = assignment.filter((a) => !a.preferred).length;
    if (!best || misses < best.misses) best = { formation: f.name, slots: assignment, misses };
  }
  return { formation: best!.formation, slots: best!.slots };
}

function greedyAssign(team: BalancePlayer[], slots: Pos[]) {
  // goalkeeper first: who prefers GK, else who accepts rotation, else lowest-rated
  const left = [...team];
  const out: { id: string; pos: Pos; preferred: boolean }[] = [];
  const takeGk = () => {
    let i = left.findIndex((p) => p.positions.includes('GK'));
    if (i < 0) i = left.findIndex((p) => p.gkRotation);
    if (i < 0) i = left.reduce((bi, p, j) => (p.mu < left[bi].mu ? j : bi), 0);
    const p = left.splice(i, 1)[0];
    out.push({ id: p.id, pos: 'GK', preferred: p.positions.includes('GK') || p.gkRotation });
  };
  const outfield = slots.filter((s) => s !== 'GK');
  if (slots.includes('GK')) takeGk();
  // fill the scarcest slot types first
  const order: Pos[] = ['DEF', 'ATT', 'MID'];
  const remaining: Pos[] = [...outfield];
  for (const pos of order) {
    let count = remaining.filter((s) => s === pos).length;
    while (count > 0) {
      const i = left.findIndex((p) => p.positions.includes(pos) && !p.positions.includes('GK'));
      const j = i >= 0 ? i : left.findIndex((p) => p.positions.includes(pos));
      if (j < 0) break;
      const p = left.splice(j, 1)[0];
      out.push({ id: p.id, pos, preferred: true });
      remaining.splice(remaining.indexOf(pos), 1);
      count--;
    }
  }
  for (const pos of remaining) {
    const p = left.shift()!;
    out.push({ id: p.id, pos, preferred: p.positions.includes(pos) });
  }
  return out;
}
