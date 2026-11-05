// Shared pieces of the "Floodlights" look: dark turf, chalk lines, bib yellow, lit scoreboard numbers.
// See DESIGN.md for the rules behind them.

import Link from "next/link";
import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight, ChevronLeft, type LucideIcon } from "lucide-react";

// ---------- Class names (for elements that need their own tag: <a>, <button>, <input>) ----------

const BUTTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 px-5 font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45";

export const button = {
  /** The one primary action on a screen: bib yellow. */
  primary: `${BUTTON_BASE} rounded-md border-2 border-bib bg-bib font-display text-2xl font-black uppercase tracking-wide text-night hover:border-bib-deep hover:bg-bib-deep`,
  /** Secondary actions: chalk outline on a dark panel. */
  secondary: `${BUTTON_BASE} rounded-md border-2 border-line bg-panel text-chalk hover:bg-raised`,
  /** Small inline actions inside lists. */
  small:
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border-2 border-line bg-panel px-3 text-sm font-semibold text-chalk transition-colors duration-150 hover:bg-raised disabled:opacity-45",
  /** Destructive text action. */
  danger: "text-sm font-semibold text-foul underline decoration-2 hover:text-foul-deep disabled:opacity-45",
  /** Quiet text action. */
  quiet: "text-sm font-semibold text-chalk-soft underline decoration-1 hover:text-chalk disabled:opacity-45",
};

export const input =
  "min-h-12 w-full rounded-md border-2 border-line bg-panel px-4 text-base text-chalk placeholder:text-chalk-faint focus:outline-none focus-visible:outline-3 focus-visible:outline-bib";

/** Toggle-style choice button (radio-like), pressed = chalk fill. */
export function choice(selected: boolean) {
  return `min-h-12 w-full rounded-md border-2 border-line px-4 py-2 text-left font-medium transition-colors duration-150 ${
    selected ? "bg-chalk text-turf" : "bg-panel text-chalk hover:bg-raised"
  }`;
}

// ---------- Layout ----------

/** Shared page width: one column on the phone, a wide frame from 1024px so the PC isn't a narrow strip. */
export const FRAME = "mx-auto w-full max-w-2xl px-4 sm:px-6 lg:max-w-6xl lg:px-8";

/** Page body. Reading pages keep a 672px column (left-aligned on a PC); `wide` pages use the whole frame. */
export function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className={`${FRAME} flex-1 py-6`}>
      <div className={wide ? "" : "lg:max-w-2xl"}>{children}</div>
    </main>
  );
}

/** The top of the page: the group's name, like the sign over the sports centre. */
export function Masthead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="border-b border-rule">
      <div className={`${FRAME} flex items-baseline justify-between gap-4 pb-3 pt-5`}>
        <span className="truncate font-display text-[1.75rem] font-black lg:text-[2rem] uppercase leading-[1.15]">{title}</span>
        {right && <span className="shrink-0 text-sm font-semibold text-chalk-soft">{right}</span>}
      </div>
    </header>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-chalk-soft hover:text-chalk">
      <ChevronLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

/** Page headline: tall heavy caps. */
export function Headline({ children, as: Tag = "h1" }: { children: React.ReactNode; as?: "h1" | "h2" }) {
  return (
    <Tag className="text-balance font-display text-[2.75rem] font-black uppercase leading-[0.92]">
      {children}
    </Tag>
  );
}

/** The line under a headline: when, where, how many. */
export function Dateline({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-base font-medium text-chalk-soft">{children}</p>;
}

/** Section heading: caps on a chalk line. */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-10 flex items-end justify-between gap-4 border-t border-line pt-2">
      <h2 className="font-display text-xl font-black uppercase tracking-wider">{children}</h2>
      {action}
    </div>
  );
}

/** A dark boxed panel on the turf. */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md border-2 border-line bg-panel ${className}`}>{children}</div>;
}

/** Empty states teach what happens next. */
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border-2 border-dashed border-chalk-soft px-5 py-6">
      <p className="font-display text-xl font-black uppercase">{title}</p>
      {children && <div className="mt-1 text-chalk-soft">{children}</div>}
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm font-semibold text-foul">
      {children}
    </p>
  );
}

// ---------- Marks ----------

/** A mark next to a name: heavy tall numerals. `led` lights it like the scoreboard (big numbers only). */
export function Mark({ value, size = "md", led = false }: { value: number | string; size?: "sm" | "md" | "lg"; led?: boolean }) {
  const cls = { sm: "text-xl", md: "text-3xl", lg: "text-6xl" }[size];
  const face = led ? "led font-black" : "font-display font-black";
  return <span className={`tabular leading-none ${face} ${cls}`}>{value}</span>;
}

const FORM_ICONS: Record<number, LucideIcon> = {
  1: ArrowDown,
  2: ArrowDownRight,
  3: ArrowRight,
  4: ArrowUpRight,
  5: ArrowUp,
};

/** Form of the day, 1..5, as an arrow (down = bad day, up = on fire). */
export function FormIcon({ form, className = "size-5" }: { form: number; className?: string }) {
  const Icon = FORM_ICONS[form] ?? ArrowRight;
  return <Icon className={className} strokeWidth={2.75} aria-label={`Form ${form} of 5`} />;
}

/** Win chance as one bar split at the exact percentage: bib yellow for A, bib orange for B. */
export function WinBar({ probA, labelA = "A", labelB = "B" }: { probA: number; labelA?: string; labelB?: string }) {
  const a = Math.round(probA * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg font-black uppercase tracking-wide text-bib">
          {labelA} <Mark value={`${a}%`} size="md" led />
        </span>
        <span className="font-display text-lg font-black uppercase tracking-wide text-bib-orange">
          <Mark value={`${100 - a}%`} size="md" led /> {labelB}
        </span>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-night" role="img" aria-label={`Chance of winning: ${labelA} ${a}%, ${labelB} ${100 - a}%`}>
        <div className="bg-bib" style={{ width: `${probA * 100}%` }} />
        <div className="flex-1 bg-bib-orange" />
      </div>
    </div>
  );
}

/** "Seven in, three spots left": the numbers as words, the way a headline says them. */
export function inWords(n: number): string {
  const words = ["Nobody", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen"];
  return words[n] ?? String(n);
}
