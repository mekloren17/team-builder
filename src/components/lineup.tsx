import type { Pos } from "@/lib/engine/engine";
import { FormIcon, Mark, WinBar } from "@/components/ui";
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
      <div className="border-2 border-ink bg-sheet p-4">
        <WinBar probA={winProbA} labelA="Team A" labelB="Team B" />
      </div>
      <TeamHeader name="Team A" strength={strengthA} count={teamA.length} />
      <div className="relative overflow-hidden border-2 border-ink bg-[#2f7d4f] px-2 py-4 text-white">
        {/* pitch markings */}
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/30" />
        <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-white/30" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />

        {/* each half has the same four rows (empty ones included), so the halfway line falls between the teams */}
        <div className="relative grid grid-rows-[repeat(8,minmax(5.5rem,auto))]">
          {LINES.map((pos) => (
            <Line key={`A-${pos}`} players={teamA.filter((p) => (p.position ?? "MID") === pos)} />
          ))}
          {[...LINES].reverse().map((pos) => (
            <Line key={`B-${pos}`} players={teamB.filter((p) => (p.position ?? "MID") === pos)} />
          ))}
        </div>
      </div>
      <TeamHeader name="Team B" strength={strengthB} count={teamB.length} />
    </div>
  );
}

function TeamHeader({ name, strength, count }: { name: string; strength: number; count: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-display text-xl font-extrabold uppercase">
        {name} <span className="font-sans text-sm font-semibold normal-case text-ink-soft">· {count} players</span>
      </span>
      <span className="text-sm font-semibold text-ink-soft">
        Strength <Mark value={strength.toFixed(1)} size="sm" />
      </span>
    </div>
  );
}

function Line({ players }: { players: LineupPlayer[] }) {
  return (
    <div className="flex items-center justify-center gap-2">
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
      <div className="mt-1 flex items-center gap-0.5 bg-ink px-1.5 font-display text-sm font-extrabold leading-5 tabular-nums">
        {player.overall}
        <FormIcon form={player.form} className="size-3.5" />
      </div>
      <div className="mt-0.5 w-full truncate text-xs font-semibold">{player.name}</div>
    </div>
  );
}
