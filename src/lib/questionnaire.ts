// Questionnaire wording. Each attribute level is anchored to a behaviour, so that
// "4" means the same thing for everyone.

import type { Freq, Level, Pos, Years } from "@/lib/engine/engine";
import type { Foot } from "@/lib/player";

export const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "never", label: "Never played for a club" },
  { value: "amateur", label: "Amateur (tournaments, CSI, UISP)" },
  { value: "youth", label: "Youth academy" },
  { value: "semipro", label: "Semi-pro (Promozione, Prima to Terza Categoria)" },
  { value: "elite", label: "Eccellenza or higher" },
];

export const YEARS_OPTIONS: { value: Years; label: string }[] = [
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6-10", label: "6–10 years" },
  { value: "10+", label: "More than 10 years" },
];

export const FREQ_OPTIONS: { value: Freq; label: string }[] = [
  { value: "lt1m", label: "Less than once a month" },
  { value: "1-3m", label: "1–3 times a month" },
  { value: "1w", label: "Once a week" },
  { value: "2w", label: "Twice a week or more" },
];

export const POSITION_OPTIONS: { value: Pos; label: string }[] = [
  { value: "GK", label: "Goalkeeper" },
  { value: "DEF", label: "Defender" },
  { value: "MID", label: "Midfielder" },
  { value: "ATT", label: "Attacker" },
];

export const FOOT_OPTIONS: { value: Foot; label: string }[] = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
  { value: "both", label: "Both" },
];

/** One description per level (1..5), in the order of ATTRIBUTE_NAMES. */
export const ATTRIBUTE_LEVELS: string[][] = [
  // Pace
  [
    "I'm usually the slowest on the pitch.",
    "Slower than most.",
    "About average speed.",
    "Rarely does anyone outrun me.",
    "One of the fastest wherever I play.",
  ],
  // Shooting
  [
    "I rarely shoot, and rarely on target.",
    "I score now and then, mostly tap-ins.",
    "I hit the target more often than not.",
    "I score regularly, from close and from distance.",
    "I'm the one who finishes the chances.",
  ],
  // Passing
  [
    "I mostly try to get rid of the ball.",
    "Short, simple passes, sometimes misplaced.",
    "I find a free teammate most of the time.",
    "I see and play the pass others don't.",
    "I run the game with my passing.",
  ],
  // Dribbling
  [
    "I lose the ball when someone presses me.",
    "I keep it if nobody is close.",
    "I beat a player now and then.",
    "I often beat my man one-on-one.",
    "It's very hard to take the ball off me.",
  ],
  // Defending
  [
    "I don't really defend.",
    "I track back, but rarely win the ball.",
    "I win a fair share of my duels.",
    "Attackers struggle to get past me.",
    "I shut down the best attacker on the pitch.",
  ],
  // Physical
  [
    "I'm out of breath after a few minutes.",
    "I need regular breaks.",
    "I last a full game at a steady pace.",
    "I run the whole game and win most physical duels.",
    "Tireless and strong: I never stop.",
  ],
];

export const GK_LEVELS: string[] = [
  "I go in goal only if I have to.",
  "I stop the easy ones.",
  "A reliable keeper for a friendly game.",
  "I make saves that change the result.",
  "A real goalkeeper.",
];
