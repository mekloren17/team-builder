import type { Pos } from "@/lib/engine/engine";
import { formIcon } from "@/lib/match";
import { tier, type Tier } from "@/lib/player";

export interface LineupPlayer {
  id: string;
  name: string;
  overall: number;
  photoUrl: string | null;
  position: Pos | null;
  form: number;
}

const TIER_RING: Record<Tier, string> = {
  bronze: "ring-[#a86a3f]",
  silver: "ring-[#b9c1cc]",
  gold: "ring-[#d9a93c]",
};

// Lines from the goal towards the centre of the pitch.
const LINES: Pos[] = ["GK", "DEF", "MID", "ATT"];

/** Both teams on one pitch: team A attacks downwards from the top, team B upwards from the bottom. */
export function Lineup({
  teamA,
  teamB,
  strengthA,
  strengthB,
  winProbA,
}: {
  teamA: LineupPlayer[];
  teamB: LineupPlayer[];
  strengthA: number;
  strengthB: number;
  winProbA: number;
}) {
  return (
    <div className="space-y-3">
      <TeamHeader name="Team A" strength={strengthA} prob={winProbA} count={teamA.length} />
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-700 via-emerald-600 to-emerald-700 px-2 py-4 text-white shadow-inner">
        {/* pitch markings */}
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/30" />
        <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-white/30" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />

        <div className="relative flex flex-col gap-3">
          {LINES.map((pos) => (
            <Line key={`A-${pos}`} players={teamA.filter((p) => (p.position ?? "MID") === pos)} />
          ))}
          <div className="h-6" />
          {[...LINES].reverse().map((pos) => (
            <Line key={`B-${pos}`} players={teamB.filter((p) => (p.position ?? "MID") === pos)} />
          ))}
        </div>
      </div>
      <TeamHeader name="Team B" strength={strengthB} prob={1 - winProbA} count={teamB.length} />
    </div>
  );
}

function TeamHeader({ name, strength, prob, count }: { name: string; strength: number; prob: number; count: number }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <span className="text-lg font-bold">
        {name} <span className="text-sm font-normal text-zinc-500">· {count} players</span>
      </span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        Strength <strong className="tabular-nums">{strength.toFixed(1)}</strong> · Win{" "}
        <strong className="tabular-nums">{Math.round(prob * 100)}%</strong>
      </span>
    </div>
  );
}

function Line({ players }: { players: LineupPlayer[] }) {
  if (players.length === 0) return null;
  return (
    <div className="flex justify-center gap-2">
      {players.map((p) => (
        <Token key={p.id} player={p} />
      ))}
    </div>
  );
}

function Token({ player }: { player: LineupPlayer }) {
  const initials = player.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <div className="flex w-16 flex-col items-center text-center">
      <div className={`relative size-12 overflow-hidden rounded-full bg-black/30 ring-2 ${TIER_RING[tier(player.overall)]}`}>
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photoUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex size-full items-center justify-center text-sm font-bold">{initials}</span>
        )}
      </div>
      <div className="-mt-2 rounded-full bg-black/70 px-1.5 text-[11px] font-bold tabular-nums">
        {player.overall} <span title="Form">{formIcon(player.form)}</span>
      </div>
      <div className="mt-0.5 w-full truncate text-[11px] font-semibold drop-shadow">{player.name}</div>
    </div>
  );
}
