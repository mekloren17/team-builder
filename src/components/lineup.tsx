import type { Pos } from "@/lib/engine/engine";
import { FormIcon, Mark, WinBar } from "@/components/ui";
import { shortName, tier, type Tier } from "@/lib/player";

export interface LineupPlayer {
  id: string;
  name: string;
  overall: number;
  photoUrl: string | null;
  position: Pos | null;
  form: number;
  guest: boolean;
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
      <div className="rounded-md border-2 border-line bg-panel p-4">
        <WinBar probA={winProbA} labelA="Team A" labelB="Team B" />
      </div>
      <TeamHeader name="Team A" strength={strengthA} count={teamA.length} team="A" />
      <div className="relative overflow-hidden rounded-md border-2 border-line bg-[#163a24] bg-[repeating-linear-gradient(180deg,#1a4029_0_48px,#143520_48px_96px)] px-2 py-4 text-chalk">
        {/* pitch markings */}
        <div className="pointer-events-none absolute inset-3 border-2 border-white/30" />
        <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-white/30" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />

        {/* two halves of equal height (1fr each), so the halfway line always falls between the teams */}
        <div className="relative grid grid-rows-2 gap-4">
          <Half players={teamA} lines={LINES} team="A" />
          <Half players={teamB} lines={[...LINES].reverse()} team="B" />
        </div>
      </div>
      <TeamHeader name="Team B" strength={strengthB} count={teamB.length} team="B" />
    </div>
  );
}

const BIB = { A: { text: "text-bib", tag: "bg-bib" }, B: { text: "text-bib-orange", tag: "bg-bib-orange" } } as const;

function TeamHeader({ name, strength, count, team }: { name: string; strength: number; count: number; team: "A" | "B" }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`font-display text-xl font-black uppercase ${BIB[team].text}`}>
        {name} <span className="font-sans text-sm font-semibold normal-case text-chalk-soft">· {count} players</span>
      </span>
      <span className="text-sm font-semibold text-chalk-soft">
        Strength <Mark value={strength.toFixed(1)} size="sm" />
      </span>
    </div>
  );
}

/** One team's half: its lines from goal to centre (or centre to goal), empty lines skipped. */
function Half({ players, lines, team }: { players: LineupPlayer[]; lines: Pos[]; team: "A" | "B" }) {
  return (
    <div className="flex min-h-40 flex-col justify-evenly gap-2">
      {lines.map((pos) => {
        const onLine = players.filter((p) => (p.position ?? "MID") === pos);
        return onLine.length > 0 ? <Line key={pos} players={onLine} team={team} /> : null;
      })}
    </div>
  );
}

function Line({ players, team }: { players: LineupPlayer[]; team: "A" | "B" }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {players.map((p) => (
        <Token key={p.id} player={p} team={team} />
      ))}
    </div>
  );
}

/** A player on the pitch: photo ringed in their card tier, overall on a tag in their team's bib colour. */
function Token({ player, team }: { player: LineupPlayer; team: "A" | "B" }) {
  const initials = player.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <div className="flex w-20 flex-col items-center text-center">
      <div className={`relative size-12 overflow-hidden rounded-full bg-black/30 ring-2 ${TIER_RING[tier(player.overall)]}`}>
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photoUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex size-full items-center justify-center text-sm font-bold">{initials}</span>
        )}
      </div>
      <div className={`mt-1 flex items-center gap-0.5 rounded-sm ${BIB[team].tag} px-1.5 font-display text-sm font-black leading-5 tabular-nums text-night`}>
        {player.overall}
        <FormIcon form={player.form} className="size-3.5" />
      </div>
      <div className="mt-0.5 line-clamp-2 w-full text-xs font-semibold leading-tight">{pitchName(player)}</div>
    </div>
  );
}

function pitchName(p: LineupPlayer): string {
  return shortName(p.name, p.guest);
}
