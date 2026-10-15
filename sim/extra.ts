// Follow-up experiments: finer Elo sweep, tuned Elo vs other strategies,
// and a scenario where the questionnaire is much less reliable.
import { generatePopulation, runSeason, POPULATION } from './simulate.ts';
import { DEFAULT_PARAMS } from '../src/lib/engine/engine.ts';

const seeds = Number(process.argv[2] ?? 30);
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function evalStrategy(strategy: any, params: any, pop: typeof POPULATION) {
  const err: Record<number, number[]> = {};
  const gaps: number[] = [], late: number[] = [];
  for (let s = 1; s <= seeds; s++) {
    const res = runSeason(generatePopulation(s, pop), strategy, s, params, pop);
    gaps.push(mean(res.matches.map((m) => m.gap)));
    late.push(mean(res.matches.filter((m) => m.i > 120).map((m) => m.gap)));
    for (const e of res.errorByPlayed ?? []) if (e.played % 5 === 0 && e.played <= 60) (err[e.played] ??= []).push(e.err);
  }
  return {
    gapAll: mean(gaps), gapLate: mean(late),
    errorByPlayed: Object.entries(err).map(([k, v]) => ({ played: Number(k), err: mean(v) })),
  };
}

const out: any = { fineSweep: [], tuned: {}, noisyQuestionnaire: {} };

for (const kBase of [1, 1.5, 2, 2.5]) for (const sigmaDecay of [0.85, 0.9]) {
  const r = evalStrategy('dynamic', { ...DEFAULT_PARAMS, kBase, sigmaDecay }, POPULATION);
  const at = (k: number) => r.errorByPlayed.find((e) => e.played === k)?.err;
  out.fineSweep.push({ kBase, sigmaDecay, err15: at(15), err40: at(40), err60: at(60), gapLate: r.gapLate });
}

const tuned = { ...DEFAULT_PARAMS, kBase: 2, sigmaDecay: 0.9 };
out.tuned = evalStrategy('dynamic', tuned, POPULATION);

// Questionnaire much less reliable: more unexplained level and more varied self-overrating
const noisy = { ...POPULATION, unexplainedSd: 10, overratingSd: 1.0 };
for (const [name, st, params] of [['static', 'static', DEFAULT_PARAMS], ['specElo', 'dynamic', DEFAULT_PARAMS], ['tunedElo', 'dynamic', tuned], ['batch', 'batch', DEFAULT_PARAMS], ['random', 'random', DEFAULT_PARAMS]] as const) {
  out.noisyQuestionnaire[name] = evalStrategy(st, params, noisy);
}
console.log(JSON.stringify(out, null, 2));
