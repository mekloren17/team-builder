// Team Builder — population and match simulator.
// Each simulated player has a hidden "true level"; the app only sees the questionnaire
// (with self-overrating) and match results. We check that ratings converge to the
// true level and that generated teams are actually balanced.
//
// Run: node --experimental-strip-types simulate.ts [seeds] > results.json

import {
  ageFactor, experienceScore, frequencyScore, initialOverall, newRating, updateAfterMatch, balanceTeams,
  DEFAULT_PARAMS, DEFAULT_BATCH, clamp, estimateRatings, type HistoryMatch, type BatchParams, type Profile, type Params, type Rating, type Level, type Years, type Freq, type Pos,
} from '../src/lib/engine/engine.ts';

// ---------- population settings (edit these to change the simulated group) ----------
export const POPULATION = {
  size: 50,
  ageMin: 20,
  ageMax: 45,
  overratingMean: 0.3, // average self-overrating, in attribute steps (1..5 scale)
  overratingSd: 0.5, // how much people differ in overrating
  unexplainedSd: 5, // level not captured by the questionnaire, in overall points
  gkShare: 0.1, // share of players who prefer goal
  attendanceMin: 0.12, // probability of showing up to a given match
  attendanceMax: 0.45,
  formSd: 3, // day-to-day form swing, in overall points
  share5aside: 0.6,
  matches: 200,
};

// ---------- RNG ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const gauss = (r: Rng) => {
  const u = 1 - r(), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const poisson = (r: Rng, lam: number) => {
  const L = Math.exp(-lam);
  let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
};

// ---------- population ----------
const LEVELS: Level[] = ['never', 'amateur', 'youth', 'semipro', 'elite'];
const YEARS: Years[] = ['0-2', '3-5', '6-10', '10+'];
const FREQS: Freq[] = ['lt1m', '1-3m', '1w', '2w'];
const OUTFIELD: Pos[] = ['DEF', 'MID', 'ATT'];

export interface SimPlayer {
  id: string;
  profile: Profile;
  trueLevel: number;
  overrating: number;
  attendance: number;
}

function pickWeighted<T>(r: Rng, items: T[], w: number[]): T {
  const tot = w.reduce((s, x) => s + x, 0);
  let x = r() * tot;
  for (let i = 0; i < items.length; i++) { x -= w[i]; if (x <= 0) return items[i]; }
  return items[items.length - 1];
}

export function generatePopulation(seed: number, P = POPULATION): SimPlayer[] {
  const r = mulberry32(seed);
  return Array.from({ length: P.size }, (_, i) => {
    const z = gauss(r); // latent talent
    const levelIdx = clamp(Math.round(1.0 + 0.9 * z + 0.8 * gauss(r)), 0, 4);
    const age = P.ageMin + Math.floor(r() * (P.ageMax - P.ageMin + 1));
    const yearsIdx = clamp(Math.round(1.1 + 0.4 * levelIdx + 0.9 * gauss(r)), 0, 3);
    const freq = pickWeighted(r, FREQS, [0.15, 0.35, 0.35, 0.15]);
    const trueAttr = 60 + 12 * (0.6 * z + 0.8 * gauss(r)); // true "attribute score", 0-100 scale
    const overrating = P.overratingMean + P.overratingSd * gauss(r);
    const declaredMean = 1 + (trueAttr - 30) / 15 + overrating;
    const attrs = Array.from({ length: 6 }, () => clamp(Math.round(declaredMean + 0.7 * gauss(r)), 1, 5));
    const isGk = r() < P.gkShare;
    const positions: Pos[] = isGk ? ['GK'] : [OUTFIELD[Math.floor(r() * 3)]];
    if (!isGk && r() < 0.4) {
      const extra = OUTFIELD[Math.floor(r() * 3)];
      if (!positions.includes(extra)) positions.push(extra);
    }
    const profile: Profile = { age, level: LEVELS[levelIdx], years: YEARS[yearsIdx], freq, attrs, positions, gkRotation: r() < 0.3 };
    const trueLevel =
      ageFactor(age) * (0.45 * experienceScore(profile) + 0.25 * frequencyScore(profile) + 0.3 * trueAttr) + P.unexplainedSd * gauss(r);
    const attendance = P.attendanceMin + r() * (P.attendanceMax - P.attendanceMin);
    return { id: `p${i}`, profile, trueLevel, overrating, attendance };
  });
}

// ---------- match outcome model ----------
// Goals ~ Poisson(lam * exp(±c * d)), d = difference in true team level (incl. today's form).
// c is calibrated so that a 5-point true gap gives the team ~68% (win + half draw),
// i.e. the same curve the engine assumes with D = 15.
function expectedScore(lam: number, c: number, d: number) {
  const la = lam * Math.exp(c * d), lb = lam * Math.exp(-c * d);
  const pmf = (l: number) => { const p = [Math.exp(-l)]; for (let k = 1; k < 40; k++) p.push(p[k - 1] * l / k); return p; };
  const pa = pmf(la), pb = pmf(lb);
  let win = 0, draw = 0;
  for (let a = 0; a < 40; a++) for (let b = 0; b < 40; b++) { const p = pa[a] * pb[b]; if (a > b) win += p; else if (a === b) draw += p; }
  return win + draw / 2;
}
function calibrate(lam: number) {
  let lo = 0, hi = 0.2;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (expectedScore(lam, m, 5) < 0.683) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const LAM = { 5: 5, 7: 6 } as const;
const C = { 5: calibrate(LAM[5]), 7: calibrate(LAM[7]) };


// ---------- batch estimator ----------
// The engine's estimateRatings, with kappa and goal variance taken from the simulated goal model.
export const BATCH = { tau: 6 };
const batchParams = (formStep: number): BatchParams => ({
  tau: BATCH.tau,
  kappa: { 5: 2 * LAM[5] * C[5], 7: 2 * LAM[7] * C[7] },
  goalVar: { 5: 2 * LAM[5], 7: 2 * LAM[7] },
  formStep,
  extraPlayer: DEFAULT_BATCH.extraPlayer, // the simulator only plays even matches
});

// ---------- one season ----------
type Strategy = 'random' | 'static' | 'dynamic' | 'batch' | 'oracle';

interface MatchLog {
  i: number;
  format: 5 | 7;
  gap: number; // |true strength A - true strength B| of the chosen split
  goalDiff: number;
}

interface SeasonResult {
  matches: MatchLog[];
  // dynamic only:
  errorByPlayed?: { played: number; err: number }[]; // centred absolute error after k matches played
  spearmanByMatch?: number[];
  ratings?: Rating[];
  trajectories?: Record<string, { match: number; mu: number }[]>;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function spearman(a: number[], b: number[]) {
  const rank = (xs: number[]) => { const idx = xs.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = new Array(xs.length); idx.forEach(([, i], k) => (r[i] = k)); return r; };
  const ra = rank(a), rb = rank(b), n = a.length;
  let d2 = 0; for (let i = 0; i < n; i++) d2 += (ra[i] - rb[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

export function runSeason(pop: SimPlayer[], strategy: Strategy, seed: number, params: Params = DEFAULT_PARAMS, P = POPULATION, track: string[] = []): SeasonResult {
  const rAtt = mulberry32(seed * 7919 + 1); // attendance + form: identical across strategies
  const rOut = mulberry32(seed * 7919 + 2); // goals
  const rSplit = mulberry32(seed * 7919 + 3); // random splits
  const ratings = new Map(pop.map((p) => [p.id, newRating(p.profile, params)]));
  const initial = new Map(pop.map((p) => [p.id, initialOverall(p.profile)]));
  const trueMean = mean(pop.map((p) => p.trueLevel));
  const logs: MatchLog[] = [];
  const errAcc = new Map<number, number[]>();
  const spearmanByMatch: number[] = [];
  const traj: Record<string, { match: number; mu: number }[]> = Object.fromEntries(track.map((id) => [id, [{ match: 0, mu: ratings.get(id)!.mu }]]));
  let prevTeams: string[][] = [];
  const learns = strategy === 'dynamic' || strategy === 'batch';
  const hist: HistoryMatch[] = [];
  const prior = new Map(initial);

  const recordErr = (played: number, p: SimPlayer, muMean: number) => {
    const e = Math.abs((ratings.get(p.id)!.mu - muMean) - (p.trueLevel - trueMean));
    if (!errAcc.has(played)) errAcc.set(played, []);
    errAcc.get(played)!.push(e);
  };
  if (learns) {
    const muMean = mean(pop.map((p) => ratings.get(p.id)!.mu));
    for (const p of pop) recordErr(0, p, muMean);
  }

  for (let m = 1; m <= P.matches; m++) {
    const format: 5 | 7 = rAtt() < P.share5aside ? 5 : 7;
    const n = format * 2;
    // weighted sample without replacement (Efraimidis–Spirakis)
    const present = pop.map((p) => ({ p, key: Math.pow(rAtt(), 1 / p.attendance) })).sort((a, b) => b.key - a.key).slice(0, n).map((x) => x.p);
    const trueForm = new Map(present.map((p) => [p.id, P.formSd * gauss(rAtt)]));
    const declaredForm = new Map(present.map((p) => [p.id, clamp(Math.round(3 + trueForm.get(p.id)! / 3 + 0.7 * gauss(rAtt)), 1, 5)]));
    const todayTrue = (p: SimPlayer) => p.trueLevel + trueForm.get(p.id)!;

    let teamA: string[], teamB: string[];
    if (strategy === 'random') {
      const shuffled = present.map((p) => ({ id: p.id, k: rSplit() })).sort((a, b) => a.k - b.k).map((x) => x.id);
      teamA = shuffled.slice(0, format); teamB = shuffled.slice(format);
    } else {
      const bp = present.map((p) => ({
        id: p.id,
        mu: learns ? ratings.get(p.id)!.mu : strategy === 'static' ? initial.get(p.id)! : todayTrue(p),
        form: strategy === 'oracle' ? 3 : declaredForm.get(p.id)!,
        positions: p.profile.positions,
        gkRotation: p.profile.gkRotation,
      }));
      const [best] = balanceTeams(bp, { previousTeams: prevTeams }, params);
      teamA = best.teamA; teamB = best.teamB;
    }
    prevTeams = [teamA, teamB];
    const byId = new Map(present.map((p) => [p.id, p]));
    const sA = mean(teamA.map((id) => todayTrue(byId.get(id)!)));
    const sB = mean(teamB.map((id) => todayTrue(byId.get(id)!)));
    const d = sA - sB;
    const gA = poisson(rOut, LAM[format] * Math.exp(C[format] * d));
    const gB = poisson(rOut, LAM[format] * Math.exp(-C[format] * d));
    logs.push({ i: m, format, gap: Math.abs(d), goalDiff: Math.abs(gA - gB) });

    if (learns) {
      if (strategy === 'dynamic') {
        const part = (ids: string[]) => ids.map((id) => ({ rating: ratings.get(id)!, form: declaredForm.get(id)! }));
        const res = updateAfterMatch(part(teamA), part(teamB), gA, gB, params);
        teamA.forEach((id, k) => ratings.set(id, res.a[k]));
        teamB.forEach((id, k) => ratings.set(id, res.b[k]));
      } else {
        hist.push({ teamA, teamB, formA: teamA.map((id) => declaredForm.get(id)!), formB: teamB.map((id) => declaredForm.get(id)!), goalsA: gA, goalsB: gB, format });
        const est = estimateRatings(prior, hist, batchParams(params.formStep));
        for (const p of pop) { const r = ratings.get(p.id)!; ratings.set(p.id, { ...r, mu: est.get(p.id)! }); }
        for (const id of [...teamA, ...teamB]) { const r = ratings.get(id)!; ratings.set(id, { ...r, matches: r.matches + 1 }); }
      }
      const muMean = mean(pop.map((p) => ratings.get(p.id)!.mu));
      for (const id of [...teamA, ...teamB]) recordErr(ratings.get(id)!.matches, byId.get(id)!, muMean);
      spearmanByMatch.push(spearman(pop.map((p) => ratings.get(p.id)!.mu), pop.map((p) => p.trueLevel)));
      for (const id of track) if (byId.has(id)) traj[id].push({ match: m, mu: ratings.get(id)!.mu });
    }
  }

  if (!learns) return { matches: logs };
  const errorByPlayed = [...errAcc.entries()].sort((a, b) => a[0] - b[0]).map(([played, es]) => ({ played, err: mean(es) }));
  return { matches: logs, errorByPlayed, spearmanByMatch, ratings: pop.map((p) => ratings.get(p.id)!), trajectories: traj };
}

// ---------- experiment ----------
function main() {
  const seeds = Number(process.argv[2] ?? 30);
  const strategies: Strategy[] = ['random', 'static', 'dynamic', 'batch', 'oracle'];
  const learners: Strategy[] = ['dynamic', 'batch'];
  const windows = [[1, 20], [21, 60], [61, 120], [121, 200]];

  // 1. strategy comparison with default params
  const gaps: Record<string, number[][]> = Object.fromEntries(strategies.map((s) => [s, windows.map(() => [])]));
  const blow: Record<string, number[]> = Object.fromEntries(strategies.map((s) => [s, []]));
  const close: Record<string, number[]> = Object.fromEntries(strategies.map((s) => [s, []]));
  const allGaps: Record<string, number[]> = Object.fromEntries(strategies.map((s) => [s, []]));
  const errByPlayed: Record<string, Map<number, number[]>> = { dynamic: new Map(), batch: new Map() };
  const spearAcc: Record<string, number[][]> = { dynamic: [], batch: [] };
  const popStats = { initialErr: [] as number[], overrating: [] as number[], levels: Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<string, number>, trueLevel: [] as number[], initial: [] as number[], playedPerPlayer: [] as number[] };
  const example: Record<string, any> = {};

  for (let s = 1; s <= seeds; s++) {
    const pop = generatePopulation(s);
    const tm = mean(pop.map((p) => p.trueLevel)), im = mean(pop.map((p) => initialOverall(p.profile)));
    for (const p of pop) {
      popStats.initialErr.push(Math.abs((initialOverall(p.profile) - im) - (p.trueLevel - tm)));
      popStats.overrating.push(p.overrating);
      popStats.levels[p.profile.level]++;
      popStats.trueLevel.push(p.trueLevel);
      popStats.initial.push(initialOverall(p.profile));
    }
    // players to follow in the example: biggest over-rater, biggest under-rater, most accurate
    let track: string[] = [];
    if (s === 1) {
      const off = pop.map((p) => ({ id: p.id, d: (initialOverall(p.profile) - im) - (p.trueLevel - tm) }));
      off.sort((a, b) => a.d - b.d);
      const acc = [...off].sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
      track = [off[off.length - 1].id, off[0].id, acc.id];
    }
    for (const st of strategies) {
      const res = runSeason(pop, st, s, DEFAULT_PARAMS, POPULATION, learners.includes(st) ? track : []);
      windows.forEach(([a, b], k) => gaps[st][k].push(mean(res.matches.filter((x) => x.i >= a && x.i <= b).map((x) => x.gap))));
      blow[st].push(mean(res.matches.map((x) => (x.goalDiff >= 5 ? 1 : 0))));
      close[st].push(mean(res.matches.map((x) => (x.goalDiff <= 2 ? 1 : 0))));
      allGaps[st].push(...res.matches.map((x) => x.gap));
      if (learners.includes(st)) {
        const E = errByPlayed[st];
        for (const { played, err } of res.errorByPlayed!) { if (!E.has(played)) E.set(played, []); E.get(played)!.push(err); }
        spearAcc[st].push(res.spearmanByMatch!);
        if (st === 'dynamic') popStats.playedPerPlayer.push(...res.ratings!.map((r) => r.matches));
        if (s === 1) {
          example[st] = track.map((id, k) => {
            const p = pop.find((x) => x.id === id)!;
            return {
              id, role: ['overrater', 'underrater', 'accurate'][k],
              trueLevel: p.trueLevel, trueRelative: p.trueLevel - tm, initial: initialOverall(p.profile),
              trajectory: res.trajectories![id].map((t) => ({ match: t.match, mu: t.mu })),
              muMeanShift: im - tm,
            };
          });
        }
      }
    }
  }

  // 2. parameter sweep (dynamic only)
  const sweep: any[] = [];
  for (const kBase of [2, 3, 4, 6]) {
    for (const sigmaDecay of [0.9, 0.93, 0.96]) {
      const params = { ...DEFAULT_PARAMS, kBase, sigmaDecay };
      const e15: number[] = [], e40: number[] = [], late: number[] = [];
      for (let s = 1; s <= seeds; s++) {
        const pop = generatePopulation(s);
        const res = runSeason(pop, 'dynamic', s, params);
        const at = (k: number) => res.errorByPlayed!.find((x) => x.played === k)?.err;
        if (at(15) !== undefined) e15.push(at(15)!);
        if (at(40) !== undefined) e40.push(at(40)!);
        late.push(mean(res.matches.filter((x) => x.i > 100).map((x) => x.gap)));
      }
      sweep.push({ kBase, sigmaDecay, err15: mean(e15), err40: e40.length ? mean(e40) : null, gapLate: mean(late) });
    }
  }

  const sweepBatch: any[] = [];
  for (const tau of [3, 4.5, 6, 8]) {
    BATCH.tau = tau;
    const e15: number[] = [], e40: number[] = [], late: number[] = [];
    for (let s = 1; s <= seeds; s++) {
      const res = runSeason(generatePopulation(s), 'batch', s);
      const at = (k: number) => res.errorByPlayed!.find((x) => x.played === k)?.err;
      if (at(15) !== undefined) e15.push(at(15)!);
      if (at(40) !== undefined) e40.push(at(40)!);
      late.push(mean(res.matches.filter((x) => x.i > 100).map((x) => x.gap)));
    }
    sweepBatch.push({ tau, err15: mean(e15), err40: mean(e40), gapLate: mean(late) });
  }
  BATCH.tau = 6;

  const pct = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(q * (s.length - 1))]; };
  const out = {
    seeds,
    population: POPULATION,
    params: DEFAULT_PARAMS,
    calibration: { c5: C[5], c7: C[7] },
    populationSummary: {
      levelShare: Object.fromEntries(Object.entries(popStats.levels).map(([k, v]) => [k, v / (seeds * POPULATION.size)])),
      trueLevel: { mean: mean(popStats.trueLevel), p10: pct(popStats.trueLevel, 0.1), p90: pct(popStats.trueLevel, 0.9) },
      initialOverall: { mean: mean(popStats.initial), p10: pct(popStats.initial, 0.1), p90: pct(popStats.initial, 0.9) },
      initialRelativeError: mean(popStats.initialErr),
      overratingMean: mean(popStats.overrating),
      matchesPerPlayer: { mean: mean(popStats.playedPerPlayer), p10: pct(popStats.playedPerPlayer, 0.1), p90: pct(popStats.playedPerPlayer, 0.9) },
    },
    strategies: Object.fromEntries(strategies.map((st) => [st, {
      gapByWindow: windows.map(([a, b], k) => ({ from: a, to: b, gap: mean(gaps[st][k]) })),
      gapAll: mean(allGaps[st]),
      gapP90: pct(allGaps[st], 0.9),
      shareGapUnder2: mean(allGaps[st].map((g) => (g < 2 ? 1 : 0))),
      blowoutShare: mean(blow[st]),
      closeShare: mean(close[st]),
    }])),
    errorByPlayed: Object.fromEntries(learners.map((st) => [st, [...errByPlayed[st].entries()].sort((a, b) => a[0] - b[0]).filter(([k]) => k <= 60).map(([played, es]) => ({ played, err: mean(es), n: es.length }))])),
    spearmanByMatch: Object.fromEntries(learners.map((st) => [st, [0, 9, 19, 49, 99, 149, 199].map((i) => ({ match: i + 1, rho: mean(spearAcc[st].map((r) => r[i])) }))])),
    initialSpearman: mean(Array.from({ length: seeds }, (_, k) => { const pop = generatePopulation(k + 1); return spearman(pop.map((p) => initialOverall(p.profile)), pop.map((p) => p.trueLevel)); })),
    example,
    sweep,
    sweepBatch,
  };
  console.log(JSON.stringify(out, null, 2));
}

if (process.argv[1]?.endsWith('simulate.ts')) main();
