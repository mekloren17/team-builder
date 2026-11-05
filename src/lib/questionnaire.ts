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
  { value: "ATT", label: "Striker" },
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

/** Keeper skills, one description per level (1..5), in the order of GK_ATTRIBUTE_NAMES. */
export const GK_ATTRIBUTE_LEVELS: string[][] = [
  // Reflexes
  [
    "Most shots go past me.",
    "I stop the ones hit straight at me.",
    "I save the shots I can see coming.",
    "I pull off saves people talk about afterwards.",
    "Close-range rockets don't get past me.",
  ],
  // Positioning
  [
    "I often end up in the wrong place.",
    "I'm in position when the play is slow.",
    "I'm usually where the shot is going.",
    "I narrow the angle without thinking.",
    "Attackers run out of space to shoot.",
  ],
  // Handling
  [
    "The ball often bounces off me.",
    "I hold the easy ones and parry the rest.",
    "I catch most shots cleanly.",
    "I rarely give away a rebound.",
    "Wet ball, hard shot: still in my hands.",
  ],
  // Coming out (1 v 1)
  [
    "I stay on my line, always.",
    "I come out, but often too late.",
    "I win a fair share of one-on-ones.",
    "I close attackers down fast and make myself big.",
    "One-on-one, I'm the favourite.",
  ],
  // Distribution
  [
    "I just kick it away.",
    "My throws reach the nearest teammate.",
    "I start attacks with a good throw or kick.",
    "I find the free player across the pitch.",
    "My throws are assists waiting to happen.",
  ],
  // Playing with feet
  [
    "With the ball at my feet I panic.",
    "I can pass it out if nobody presses me.",
    "I stay calm on the ball under some pressure.",
    "I play like an extra outfield player.",
    "I could play outfield and nobody would notice.",
  ],
];
