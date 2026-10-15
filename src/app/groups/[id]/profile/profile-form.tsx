"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ageFromBirthYear, initialOverall, type Freq, type Level, type Pos, type Years } from "@/lib/engine/engine";
import { PlayerCard } from "@/components/player-card";
import { ATTRIBUTE_NAMES, mainPosition, type Foot, type PlayerRow } from "@/lib/player";
import {
  ATTRIBUTE_LEVELS,
  FOOT_OPTIONS,
  FREQ_OPTIONS,
  GK_LEVELS,
  LEVEL_OPTIONS,
  POSITION_OPTIONS,
  YEARS_OPTIONS,
} from "@/lib/questionnaire";
import { saveProfile } from "../../actions";

const STEPS = ["About you", "Experience", "Positions", "Skills"] as const;
const THIS_YEAR = new Date().getFullYear();

export function ProfileForm({ groupId, initial }: { groupId: string; initial: PlayerRow }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [birthYear, setBirthYear] = useState<string>(initial.birth_year?.toString() ?? "");
  const [foot, setFoot] = useState<Foot | null>(initial.foot);
  const [level, setLevel] = useState<Level | null>(initial.max_level);
  const [years, setYears] = useState<Years | null>(initial.years_played);
  const [freq, setFreq] = useState<Freq | null>(initial.frequency);
  const [positions, setPositions] = useState<Pos[]>(initial.positions);
  const [gkRotation, setGkRotation] = useState(initial.gk_rotation);
  const [gkRating, setGkRating] = useState<number | null>(initial.gk_rating);
  const [attributes, setAttributes] = useState<(number | null)[]>(initial.attributes ?? [null, null, null, null, null, null]);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const year = Number(birthYear);
  const validYear = Number.isInteger(year) && year >= 1930 && year <= THIS_YEAR - 10;
  const isGk = positions.includes("GK");
  const stepValid = [
    displayName.trim().length > 0 && validYear && foot !== null,
    level !== null && years !== null && freq !== null,
    positions.length > 0 && (!isGk || gkRating !== null),
    attributes.every((a) => a !== null),
  ];

  // Live preview: neutral 3s for the skills not answered yet, until the questionnaire is complete.
  const previewAttrs = attributes.map((a) => a ?? 3);
  const overall =
    validYear && level && years && freq
      ? initialOverall({ age: ageFromBirthYear(year), level, years, freq, attrs: previewAttrs, positions, gkRotation })
      : null;

  function togglePosition(p: Pos) {
    setPositions((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  }

  function submit() {
    setError(null);
    startSaving(async () => {
      const result = await saveProfile(groupId, {
        displayName: displayName.trim(),
        birthYear: year,
        level: level!,
        years: years!,
        freq: freq!,
        positions,
        gkRotation,
        foot: foot!,
        attributes: attributes as number[],
        gkRating: isGk ? gkRating : null,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/groups/${groupId}`} className="text-sm text-zinc-500">
          ← Back
        </Link>
        <span className="text-sm text-zinc-500">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>

      <div className="sticky top-0 z-10 -mx-6 flex justify-center bg-background/90 py-3 backdrop-blur">
        <PlayerCard
          name={displayName}
          overall={overall}
          position={mainPosition(positions)}
          attributes={overall !== null ? previewAttrs : null}
          foot={foot}
          size="sm"
        />
      </div>

      <h1 className="text-2xl font-bold tracking-tight">{STEPS[step]}</h1>

      {step === 0 && (
        <div className="space-y-5">
          <Field label="Name on your card">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="h-12 w-full rounded-xl border border-zinc-300 bg-transparent px-4 dark:border-zinc-700"
            />
          </Field>
          <Field label="Year of birth">
            <input
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1995"
              className="h-12 w-full rounded-xl border border-zinc-300 bg-transparent px-4 dark:border-zinc-700"
            />
          </Field>
          <Field label="Stronger foot">
            <Choices options={FOOT_OPTIONS} value={foot} onChange={setFoot} columns={3} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <Field label="Highest level you've played at">
            <Choices options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
          </Field>
          <Field label="How many years have you played?">
            <Choices options={YEARS_OPTIONS} value={years} onChange={setYears} columns={2} />
          </Field>
          <Field label="How often do you play now?">
            <Choices options={FREQ_OPTIONS} value={freq} onChange={setFreq} columns={2} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Field label="Where do you like to play? (one or more)">
            <div className="grid grid-cols-2 gap-2">
              {POSITION_OPTIONS.map((o) => (
                <OptionButton key={o.value} selected={positions.includes(o.value)} onClick={() => togglePosition(o.value)}>
                  {o.label}
                </OptionButton>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={gkRotation} onChange={(e) => setGkRotation(e.target.checked)} className="size-5" />
            <span>I&apos;m fine taking turns in goal</span>
          </label>
          {isGk && (
            <Field label="Goalkeeping">
              <Levels descriptions={GK_LEVELS} value={gkRating} onChange={setGkRating} />
            </Field>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <p className="text-zinc-600 dark:text-zinc-400">Be honest: the teams are only as fair as these answers.</p>
          {ATTRIBUTE_NAMES.map((name, i) => (
            <Field key={name} label={name}>
              <Levels
                descriptions={ATTRIBUTE_LEVELS[i]}
                value={attributes[i]}
                onChange={(v) => setAttributes((as) => as.map((a, j) => (j === i ? v : a)))}
              />
            </Field>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pb-8">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="h-12 flex-1 rounded-full border border-zinc-300 font-medium dark:border-zinc-700"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!stepValid[step]}
            onClick={() => setStep(step + 1)}
            className="h-12 flex-1 rounded-full bg-foreground font-medium text-background disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={!stepValid.every(Boolean) || saving}
            onClick={submit}
            className="h-12 flex-1 rounded-full bg-foreground font-medium text-background disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save my card"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="font-medium">{label}</div>
      {children}
    </div>
  );
}

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-12 w-full rounded-xl border px-4 py-2 text-left ${
        selected ? "border-foreground bg-foreground text-background" : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function Choices<T extends string>({
  options,
  value,
  onChange,
  columns = 1,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" }[columns];
  return (
    <div className={`grid gap-2 ${cols}`}>
      {options.map((o) => (
        <OptionButton key={o.value} selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </OptionButton>
      ))}
    </div>
  );
}

/** Levels 1..5, each with its behaviour description. */
function Levels({ descriptions, value, onChange }: { descriptions: string[]; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      {descriptions.map((d, i) => (
        <OptionButton key={i} selected={value === i + 1} onClick={() => onChange(i + 1)}>
          <span className="mr-3 font-bold tabular-nums">{i + 1}</span>
          {d}
        </OptionButton>
      ))}
    </div>
  );
}
