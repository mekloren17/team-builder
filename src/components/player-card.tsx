import { cardAttributes, type Pos } from "@/lib/engine/engine";
import { ATTRIBUTE_SHORT, tier, type Foot, type Tier } from "@/lib/player";

export interface PlayerCardProps {
  name: string;
  overall: number | null; // null: questionnaire not filled in yet
  position: Pos | null;
  attributes: number[] | null; // self-assessment 1..5, turned into card values around the overall
  foot?: Foot | null;
  provisional?: boolean;
  guest?: boolean;
  size?: "sm" | "lg";
}

const TIER_STYLE: Record<Tier, string> = {
  bronze: "from-[#c98a5a] via-[#a86a3f] to-[#6e4024] text-[#fff4ea]",
  silver: "from-[#e4e8ee] via-[#b9c1cc] to-[#7d8796] text-[#141a22]",
  gold: "from-[#f6dd8a] via-[#d9a93c] to-[#8f6514] text-[#2a1c02]",
};

const FOOT_LABEL: Record<Foot, string> = { right: "R", left: "L", both: "R/L" };

/** Original card design: a tall rounded tile with a diagonal tier gradient and a stripe across the middle. */
export function PlayerCard({ name, overall, position, attributes, foot, provisional, guest, size = "lg" }: PlayerCardProps) {
  const lg = size === "lg";
  const style = overall === null ? "from-zinc-300 via-zinc-200 to-zinc-400 text-zinc-700" : TIER_STYLE[tier(overall)];
  const values = overall !== null && attributes ? cardAttributes(overall, attributes) : null;

  return (
    <div
      className={`relative flex shrink-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br shadow-lg ${style} ${
        lg ? "w-56 p-4" : "w-36 p-3"
      }`}
    >
      {/* diagonal stripe */}
      <div className="pointer-events-none absolute -left-8 top-1/3 h-10 w-[160%] -rotate-12 bg-white/15" />

      <div className="relative flex items-start justify-between">
        <div className="leading-none">
          <div className={`font-black tabular-nums ${lg ? "text-5xl" : "text-3xl"}`}>{overall ?? "–"}</div>
          <div className={`mt-1 font-bold tracking-widest ${lg ? "text-sm" : "text-xs"}`}>{position ?? ""}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {provisional && overall !== null && (
            <span className={`rounded-full bg-black/20 px-2 py-0.5 font-semibold uppercase ${lg ? "text-[10px]" : "text-[8px]"}`}>
              Provisional
            </span>
          )}
          {guest && (
            <span className={`rounded-full bg-black/20 px-2 py-0.5 font-semibold uppercase ${lg ? "text-[10px]" : "text-[8px]"}`}>
              Guest
            </span>
          )}
        </div>
      </div>

      <div className={`relative truncate text-center font-bold uppercase tracking-wide ${lg ? "mt-6 text-lg" : "mt-3 text-sm"}`}>
        {name || "Your name"}
      </div>

      <div className={`relative border-t border-current/25 ${lg ? "mt-3 pt-3" : "mt-2 pt-2"}`}>
        {values ? (
          <div className={`grid grid-cols-2 gap-x-4 ${lg ? "gap-y-1 text-sm" : "gap-y-0.5 text-[11px]"}`}>
            {ATTRIBUTE_SHORT.map((label, i) => (
              <div key={label} className="flex justify-between">
                <span className="font-black tabular-nums">{values[i]}</span>
                <span className="font-medium opacity-80">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-center opacity-70 ${lg ? "text-sm" : "text-[11px]"}`}>{guest ? "Level estimated by an admin" : "Profile not filled in yet"}</p>
        )}
      </div>

      {foot && (
        <div className={`relative mt-2 text-center font-semibold opacity-80 ${lg ? "text-xs" : "text-[10px]"}`}>
          Foot {FOOT_LABEL[foot]}
        </div>
      )}
    </div>
  );
}
