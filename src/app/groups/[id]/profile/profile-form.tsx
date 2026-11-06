"use client";

import { useState, useTransition } from "react";
import { ageFromBirthYear, initialOverall, type Freq, type Level, type Pos, type Years } from "@/lib/engine/engine";
import { PhotoEditor } from "@/components/photo-editor";
import { PlayerCard } from "@/components/player-card";
import { BackLink, button, choice, ErrorText, Headline, input } from "@/components/ui";
import {
  ATTRIBUTE_NAMES,
  ATTRIBUTE_SHORT,
  GK_ATTRIBUTE_NAMES,
  GK_ATTRIBUTE_SHORT,
  mainPosition,
  type Foot,
  type PlayerRow,
} from "@/lib/player";
import {
  ATTRIBUTE_LEVELS,
  FOOT_OPTIONS,
  FREQ_OPTIONS,
  GK_ATTRIBUTE_LEVELS,
  LEVEL_OPTIONS,
  POSITION_OPTIONS,
  YEARS_OPTIONS,
} from "@/lib/questionnaire";
import { saveProfile, setMyPhoto } from "../../actions";

const STEPS = ["About you", "Experience", "Positions", "Skills"] as const;
const THIS_YEAR = new Date().getFullYear();
const EMPTY_ANSWERS: (number | null)[] = [null, null, null, null, null, null];

export function ProfileForm({ groupId, initial }: { groupId: string; initial: PlayerRow }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [photoUrl, setPhotoUrl] = useState(initial.photo_url);
  const [birthYear, setBirthYear] = useState<string>(initial.birth_year?.toString() ?? "");
  const [foot, setFoot] = useState<Foot | null>(initial.foot);
  const [level, setLevel] = useState<Level | null>(initial.max_level);
  const [years, setYears] = useState<Years | null>(initial.years_played);
  const [freq, setFreq] = useState<Freq | null>(initial.frequency);
  const [positions, setPositions] = useState<Pos[]>(initial.positions);
  const [gkRotation, setGkRotation] = useState(initial.gk_rotation);
  const [attributes, setAttributes] = useState<(number | null)[]>(initial.attributes ?? EMPTY_ANSWERS);
  const [gkAttributes, setGkAttributes] = useState<(number | null)[]>(initial.gk_attributes ?? EMPTY_ANSWERS);
  // Asked when someone plays more than one position; GK as main position makes you the keeper.
  const [mainPos, setMainPos] = useState<Pos | null>(initial.main_position);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const year = Number(birthYear);
  const validYear = Number.isInteger(year) && year >= 1930 && year <= THIS_YEAR - 10;
  // one position is the main one by itself; with several, the one picked (if still among them)
  // the chosen main position; a profile saved before this question with a single position keeps that one
  const main: Pos | null = mainPos && positions.includes(mainPos) ? mainPos : positions.length === 1 ? positions[0] : null;
  const keeper = main === "GK";
  // the skill step asks the keeper questions to a keeper, the outfield ones to everybody else
  const answers = keeper ? gkAttributes : attributes;
  const setAnswers = keeper ? setGkAttributes : setAttributes;
  const complete = (xs: (number | null)[]) => xs.every((a) => a !== null);
  const stepValid = [
    displayName.trim().length > 0 && validYear && foot !== null,
    level !== null && years !== null && freq !== null,
    main !== null,
    complete(answers),
  ];

  // Live preview: neutral 3s for the skills not answered yet, until the questionnaire is complete.
  const previewAnswers = answers.map((a) => a ?? 3);
  const overall =
    validYear && level && years && freq
      ? initialOverall({
          age: ageFromBirthYear(year),
          level,
          years,
          freq,
          attrs: keeper ? [] : previewAnswers,
          gkAttrs: keeper ? previewAnswers : undefined,
          keeper,
          positions,
          gkRotation,
        })
      : null;

  function togglePosition(p: Pos) {
    setPositions((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  }

  /** The main position is always one of the positions played: the main one first. */
  function chooseMain(p: Pos) {
    setMainPos(p);
    setPositions((ps) => [p, ...ps.filter((x) => x !== p)]);
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
        mainPosition: main!,
        // the other role's answers are kept only if complete (for a later switch)
        attributes: complete(attributes) ? (attributes as number[]) : null,
        gkAttributes: complete(gkAttributes) ? (gkAttributes as number[]) : null,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackLink href={`/groups/${groupId}`}>Home</BackLink>
        <span className="text-sm font-semibold text-chalk-soft">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1.5 ${i <= step ? "bg-chalk" : "bg-raised"}`} />
        ))}
      </div>

      <div className="sticky top-0 z-10 -mx-4 flex justify-center border-b-2 border-line bg-turf py-3 sm:-mx-6">
        <PlayerCard
          name={displayName}
          overall={overall}
          position={mainPosition(positions, main)}
          attributes={overall !== null ? previewAnswers : null}
          labels={keeper ? GK_ATTRIBUTE_SHORT : ATTRIBUTE_SHORT}
          foot={foot}
          photoUrl={photoUrl}
          size="sm"
        />
      </div>

      <Headline>{STEPS[step]}</Headline>

      {step === 0 && (
        <div className="space-y-5">
          {initial.user_id && (
            <Field label="Photo (saved right away)">
              <PhotoEditor
                target={{ kind: "me", userId: initial.user_id }}
                currentUrl={photoUrl}
                save={setMyPhoto}
                onSaved={setPhotoUrl}
              />
            </Field>
          )}
          <Field label="Name on your card">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className={input}
            />
          </Field>
          <Field label="Year of birth">
            <input
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1995"
              className={input}
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
          <Field label="Your main position (it goes on your card)">
            <div className="grid grid-cols-2 gap-2">
              {POSITION_OPTIONS.map((o) => (
                <OptionButton key={o.value} selected={main === o.value} onClick={() => chooseMain(o.value)}>
                  {o.label}
                </OptionButton>
              ))}
            </div>
          </Field>
          {keeper && <p className="text-chalk-soft">You&apos;re our keeper: the next step asks about goalkeeping.</p>}
          {main && (
            <Field label="Where else can you play? (optional)">
              <div className="grid grid-cols-2 gap-2">
                {POSITION_OPTIONS.filter((o) => o.value !== main).map((o) => (
                  <OptionButton key={o.value} selected={positions.includes(o.value)} onClick={() => togglePosition(o.value)}>
                    {o.label}
                  </OptionButton>
                ))}
              </div>
            </Field>
          )}
          <label className="flex min-h-12 items-center gap-3 font-medium">
            <input type="checkbox" checked={gkRotation} onChange={(e) => setGkRotation(e.target.checked)} className="size-6" />
            <span>I&apos;m fine taking turns in goal</span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <p className="text-chalk-soft">
            Be honest: the teams are only as fair as these answers. They set your mark and the numbers on your card.
          </p>
          {(keeper ? GK_ATTRIBUTE_NAMES : ATTRIBUTE_NAMES).map((name, i) => (
            <Field key={name} label={name}>
              <Levels
                descriptions={(keeper ? GK_ATTRIBUTE_LEVELS : ATTRIBUTE_LEVELS)[i]}
                value={answers[i]}
                onChange={(v) => setAnswers((as) => as.map((a, j) => (j === i ? v : a)))}
              />
            </Field>
          ))}
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      <div className="flex gap-3 pb-8">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className={`${button.secondary} flex-1`}
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!stepValid[step]}
            onClick={() => setStep(step + 1)}
            className={`${button.primary} flex-1`}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={!stepValid.every(Boolean) || saving}
            onClick={submit}
            className={`${button.primary} flex-1`}
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
      <div className="font-semibold">{label}</div>
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
      className={choice(selected)}
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
    <div className="space-y-1.5">
      {descriptions.map((d, i) => (
        <OptionButton key={i} selected={value === i + 1} onClick={() => onChange(i + 1)}>
          <span className="tabular mr-3 font-display text-xl font-extrabold">{i + 1}</span>
          {d}
        </OptionButton>
      ))}
    </div>
  );
}
