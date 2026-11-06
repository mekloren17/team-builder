---
name: Team Builder
description: The sports centre at 21:00, where the group's cards shine under the floodlights.
colors:
  turf: "#0d1a12"
  night: "#050806"
  panel: "#0b140f"
  raised: "#1a2a1f"
  chalk: "#f2f5ef"
  chalk-soft: "#a9b5ac"
  chalk-faint: "#7f8c82"
  line: "#56665b"
  rule: "#ffffff1f"
  bib: "#e5ff3a"
  bib-deep: "#cbe61f"
  bib-orange: "#ff7a2e"
  led: "#ffb000"
  foul: "#ff6b5e"
  foul-deep: "#ff8f85"
  ok: "#6ee39a"
typography:
  masthead:
    fontFamily: "Big Shoulders, Barlow, system-ui, sans-serif"
    fontSize: "1.75rem (2rem from 1024px)"
    fontWeight: 900
    lineHeight: 1.15
  display:
    fontFamily: "Big Shoulders, Barlow, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 900
    lineHeight: 0.92
  title:
    fontFamily: "Big Shoulders, Barlow, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1.4
    letterSpacing: "0.05em"
  mark:
    fontFamily: "Big Shoulders, Barlow, system-ui, sans-serif"
    fontSize: "3.75rem / 1.875rem / 1.25rem"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
  led:
    fontFamily: "Doto, ui-monospace, monospace"
    fontSize: "1.875rem and up"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  body-strong:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.45
  label:
    fontFamily: "Big Shoulders, Barlow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.025em"
  small:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
rounded:
  control: "6px"
  tag: "2px"
  bar: "9999px"
spacing:
  hairline: "1px"
  rule: "2px"
  tab-rule: "4px"
  gutter: "16px"
  gutter-wide: "24px"
  gutter-pc: "32px"
  section: "40px"
  control: "48px"
  row: "64px"
  column: "672px"
  frame: "1152px"
components:
  button-primary:
    backgroundColor: "{colors.bib}"
    textColor: "{colors.night}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "{colors.bib-deep}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.chalk}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "{spacing.control}"
  button-secondary-hover:
    backgroundColor: "{colors.raised}"
  button-small:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.chalk}"
    typography: "{typography.small}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  button-danger:
    textColor: "{colors.foul}"
    typography: "{typography.small}"
  button-quiet:
    textColor: "{colors.chalk-soft}"
    typography: "{typography.small}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.chalk}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "{spacing.control}"
  choice:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "{spacing.control}"
  choice-selected:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.turf}"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.control}"
  scoreboard:
    backgroundColor: "{colors.night}"
    textColor: "{colors.led}"
    typography: "{typography.led}"
    rounded: "{rounded.control}"
  tab-bar:
    backgroundColor: "{colors.night}"
    textColor: "{colors.chalk-soft}"
    typography: "{typography.label}"
    height: "{spacing.row}"
  tab-bar-wide:
    backgroundColor: "transparent"
    textColor: "{colors.chalk-soft}"
    height: "44px"
---

# Design System: Team Builder

## Overview

**Creative North Star: "Floodlights"**

The app looks like the sports centre on a Thursday night: dark artificial turf with mowing stripes, a floodlight glow at the top of the page, chalk-white lines, and a scoreboard whose dot digits light up as people sign up. The two teams are the two bibs everyone has worn: fluorescent yellow and orange.

The player cards are the stars. They keep their own design (rounded tiles, metallic gradients, shadow), and this environment exists to make them shine: glossy metal reads best on a dark ground.

It is a website first, used on phones from a WhatsApp link and on PCs, especially by admins. On a phone it is one column with a bottom tab bar; from 1024px the page frame widens to 1152px, navigation sits under the masthead, and pages that benefit (the group home) use two columns.

Chosen on 05/11/2026 after the design review in `docs/design-directions.html`, replacing the earlier "Le pagelle" pink sports-paper style.

**Key Characteristics:**
- Dark turf ground with stripes and a floodlight glow (set on `body`, fixed).
- Dark panels with a 2px `line` border and 6px corners.
- One bib yellow for the primary action, the current tab, focus and team A; bib orange only for team B.
- Big Shoulders in heavy uppercase for headlines, labels and marks; Doto lit in amber for big scoreboard numbers; Barlow for text (and inside the cards).

## Colors

### Primary
- **Bib Yellow** (`bib`): the primary action ("I'm in", "Use these teams"), the current tab's 4px bar, the "You're in" tag, focus outlines, text selection, caret, and team A wherever teams appear (win bar, team names, pitch tags). Text on it is `night`.
- **Pressed Bib** (`bib-deep`): hover of bib buttons only.
- **Bib Orange** (`bib-orange`): team B, and nothing else.

### Secondary
- **Scoreboard Amber** (`led`): lit numbers only (sign-up count, win percentages), always with the `.led` glow class.
- **Foul Red** (`foul`, hover `foul-deep`): error text and destructive text actions. Never a fill.
- **Pitch Green** (`ok`): the "You're in" confirmation on the fixture board.

### Neutral
- **Turf** (`turf`): the page ground and the browser `theme-color`; text on chalk fills.
- **Night** (`night`): the scoreboard, the phone tab bar, overlays, text on bib.
- **Panel** (`panel`): every boxed panel, input, secondary button and unselected choice.
- **Raised** (`raised`): hover fills on panels and the "me" row in tables.
- **Chalk** (`chalk`): body text, selected choices (as a fill), the "You" chip.
- **Faded Chalk** (`chalk-soft`) and **Pale Chalk** (`chalk-faint`): secondary text; placeholders.
- **Line** (`line`): 2px borders of panels and controls.
- **Hairline** (`rule`, white at 12%): 1px dividers inside panels, the masthead rule.

### Named Rules
**The One Bib Rule.** Bib yellow marks what to press, where you are, and team A. If a screen has two yellow buttons, one of them is wrong.

**The Two Bibs Rule.** Team A is always yellow and team B always orange, on every screen.

## Typography

**Display:** Big Shoulders (900, via next/font, `--font-big-shoulders`), tall and narrow like sports-centre signage. **Scoreboard:** Doto (900, `--font-doto`), a dot-matrix face, only for big lit numbers. **Body:** Barlow (400 to 700, `--font-barlow`); the player cards use it too.

### Hierarchy
- **Masthead** (900, 1.75rem, 2rem from 1024px, uppercase): the group name.
- **Display** (900, 2.75rem, line-height 0.92, uppercase, balanced): the page headline, counts written as words ("Seven in, three spots left").
- **Title** (900, 1.25rem, wide tracking, uppercase): section titles on a 1px `line` rule, team names, the primary button label (1.5rem).
- **Mark** (900, tabular): every number a player is judged by; `led` for scoreboard numbers.
- **Body / Label / Small** as before: Barlow for running text, Big Shoulders bold uppercase for tabs and table headers.

### Named Rules
**The Scoreboard Rule.** Doto is only for numbers of 1.875rem or more (it is hard to read smaller). Ratings in tables stay Big Shoulders.

## Layout

The shared frame (`FRAME` in `ui.tsx`) is 672px on phones and tablets and 1152px from 1024px, with gutters of 16px, 24px from 640px and 32px from 1024px. `Page` keeps reading pages (forms, lists) in a 672px column, left-aligned within the frame on a PC; `Page wide` uses the whole frame.

The group home on a PC: next match and "Coming up" on the left, "Your card" in a 18rem column on the right. On the phone the order is match, card, coming up.

Navigation responds at 768px: below, the tab bar is fixed to the bottom in `night`; from 768px it is a row under the masthead on the turf.

Touch targets: 48px for buttons, inputs and choices; 40px for small actions; 64px for rows and phone tabs.

## Elevation & Depth

Panels are flat: depth comes from the dark panel on the striped turf and the 2px `line` border. The only shadows in the app are the player cards' own and the scoreboard glow.

## Shapes

Panels, controls, tables and the pitch have 6px corners (`rounded-md`); tags 2px; the win bar is a full pill. Circles only for photo tokens on the pitch.

## Components

- **Buttons:** primary in bib with `night` text and a heavy uppercase label; secondary and small are panels with a `line` border; danger and quiet are underlined text.
- **Choices:** panel rows; selected fills with chalk and turf text. The form-of-the-day picker is five cells in one box.
- **Panel / Empty:** dark panel with `line` border; empty states have a dashed `chalk-soft` border.
- **Scoreboard (signature):** on the group home, a `night` box with "Players in / of N" on the left and the count in lit amber digits (`07`) on the right.
- **Win bar (signature):** team names in their bib colour, percentages as lit marks, one pill bar split yellow/orange at the exact percentage.
- **Line-up:** a darker green striped pitch with chalk markings; player tokens are photo circles ringed in their card tier, with an overall tag in their team's bib colour.
- **Ratings table and fixture board:** boxed panels, hairline rows, `raised` hover, the viewer's row in `raised` with a chalk "You" chip.
- **Motion:** `stamp-in` (220ms) lights up the "You're in" tag like a scoreboard; off under `prefers-reduced-motion`. Everything else is a 150ms colour transition.

### Player cards
`PlayerCard` (`src/components/player-card.tsx`) keeps its design: rounded tiles, bronze/silver/gold gradients, a stripe and a shadow. Do not restyle it; do not copy its gradients into other components.

## Do's and Don'ts

### Do:
- **Do** put content on dark panels with a `line` border on the turf.
- **Do** keep bib yellow for the primary action, current tab, focus and team A; orange only for team B.
- **Do** use `Page wide` and two columns on a PC where the screen has more than one thing to show.
- **Do** keep text chalk-white and large: dark screens suffer in sunlight.

### Don't:
- **Don't** use fluorescent yellow as text on a light surface, or as a large decorative fill.
- **Don't** use Doto for small numbers or for words.
- **Don't** add new shadows or glows besides the cards and the scoreboard.
- **Don't** change the player cards.
