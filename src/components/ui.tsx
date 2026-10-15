// Shared pieces of the "pagelle" look: pink paper, ink rules, condensed marks, one red.
// See DESIGN.md for the rules behind them.

import Link from "next/link";
import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight, ChevronLeft, type LucideIcon } from "lucide-react";

// ---------- Class names (for elements that need their own tag: <a>, <button>, <input>) ----------

const BUTTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 px-5 font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45";

export const button = {
  /** The one primary action on a screen: the red stamp. */
  primary: `${BUTTON_BASE} border-2 border-ink bg-red font-display text-xl font-extrabold uppercase tracking-wide text-white hover:bg-red-deep`,
  /** Secondary actions: ink outline on white. */
  secondary: `${BUTTON_BASE} border-2 border-ink bg-sheet text-ink hover:bg-paper-deep`,
  /** Small inline actions inside lists. */
  small:
    "inline-flex min-h-10 items-center justify-center gap-1.5 border-2 border-ink bg-sheet px-3 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-paper-deep disabled:opacity-45",
  /** Destructive text action. */
  danger: "text-sm font-semibold text-red underline decoration-2 hover:text-red-deep disabled:opacity-45",
  /** Quiet text action. */
  quiet: "text-sm font-semibold text-ink-soft underline decoration-1 hover:text-ink disabled:opacity-45",
};

export const input =
  "min-h-12 w-full border-2 border-ink bg-sheet px-4 text-base text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-3 focus-visible:outline-red";

/** Toggle-style choice button (radio-like), pressed = ink. */
export function choice(selected: boolean) {
  return `min-h-12 w-full border-2 border-ink px-4 py-2 text-left font-medium transition-colors duration-150 ${
    selected ? "bg-ink text-paper" : "bg-sheet text-ink hover:bg-paper-deep"
  }`;
}

// ---------- Layout ----------

/** Page body: one column, readable on a phone, centred on a desktop. */
export function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">{children}</main>;
}

/** The top of the paper: name of the publication and an ink rule. */
export function Masthead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-2xl items-baseline justify-between gap-4 px-4 pb-2 pt-4 sm:px-6">
        <span className="truncate font-display text-[1.75rem] font-extrabold uppercase leading-none tracking-tight">{title}</span>
        {right && <span className="shrink-0 text-sm font-semibold text-ink-soft">{right}</span>}
      </div>
    </header>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
      <ChevronLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

/** Newspaper headline: condensed heavy caps. */
export function Headline({ children, as: Tag = "h1" }: { children: React.ReactNode; as?: "h1" | "h2" }) {
  return (
    <Tag className="text-balance font-display text-[2.5rem] font-extrabold uppercase leading-[0.95] tracking-tight">
      {children}
    </Tag>
  );
}

/** The line under a headline: when, where, how many. */
export function Dateline({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-base font-medium text-ink-soft">{children}</p>;
}

/** Section heading: condensed caps on an ink rule. */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-10 flex items-end justify-between gap-4 border-t-2 border-ink pt-2">
      <h2 className="font-display text-xl font-extrabold uppercase tracking-wide">{children}</h2>
      {action}
    </div>
  );
}

/** A white boxed panel ruled in ink. */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-2 border-ink bg-sheet ${className}`}>{children}</div>;
}

/** Empty states teach what happens next. */
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-ink-soft px-5 py-6">
      <p className="font-display text-xl font-extrabold uppercase">{title}</p>
      {children && <div className="mt-1 text-ink-soft">{children}</div>}
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm font-semibold text-red">
      {children}
    </p>
  );
}

// ---------- Marks ----------

/** A mark as printed next to a name: heavy condensed numerals. */
export function Mark({ value, size = "md" }: { value: number | string; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "text-xl", md: "text-3xl", lg: "text-6xl" }[size];
  return <span className={`tabular font-display font-extrabold leading-none ${cls}`}>{value}</span>;
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

/** Win chance as one ruled bar split at the exact percentage. */
export function WinBar({ probA, labelA = "A", labelB = "B" }: { probA: number; labelA?: string; labelB?: string }) {
  const a = Math.round(probA * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">
          {labelA} <Mark value={`${a}%`} size="sm" />
        </span>
        <span className="font-semibold">
          <Mark value={`${100 - a}%`} size="sm" /> {labelB}
        </span>
      </div>
      <div className="mt-1 flex h-3 border-2 border-ink" role="img" aria-label={`Chance of winning: ${labelA} ${a}%, ${labelB} ${100 - a}%`}>
        <div className="bg-ink" style={{ width: `${probA * 100}%` }} />
        <div className="flex-1 bg-sheet" />
      </div>
    </div>
  );
}

/** "Seven in, three spots left": the numbers as words, the way a headline says them. */
export function inWords(n: number): string {
  const words = ["Nobody", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen"];
  return words[n] ?? String(n);
}
