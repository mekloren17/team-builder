---
name: Team Builder
description: The group's own pink sports daily, where every match gets its page and every player a mark.
colors:
  paper: "#f7dde2"
  paper-deep: "#efc6ce"
  sheet: "#ffffff"
  ink: "#1a1414"
  ink-soft: "#5e3f46"
  ink-faint: "#8a6a71"
  rule: "#1a141433"
  red: "#c8102e"
  red-deep: "#a00c24"
  ok: "#1d6b3a"
typography:
  masthead:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  display:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "0.025em"
  mark-lg:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  mark-md:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  mark-sm:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
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
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
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
  none: "0px"
spacing:
  hairline: "1px"
  rule: "2px"
  masthead-rule: "3px"
  tab-rule: "4px"
  gutter: "16px"
  gutter-wide: "24px"
  section: "40px"
  control: "48px"
  stamp: "56px"
  row: "64px"
  column: "672px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.sheet}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "{colors.red-deep}"
  button-stamp:
    backgroundColor: "{colors.red}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.none}"
    height: "{spacing.stamp}"
    width: "100%"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "{spacing.control}"
  button-secondary-hover:
    backgroundColor: "{colors.paper-deep}"
  button-small:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "40px"
  button-danger:
    textColor: "{colors.red}"
    typography: "{typography.small}"
  button-quiet:
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "{spacing.control}"
  choice:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "{spacing.control}"
  choice-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  panel:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  tab-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    height: "{spacing.row}"
  tab-bar-wide:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    height: "44px"
---

# Design System: Team Builder

## Overview

**Creative North Star: "Le pagelle"**

The app is the group's own pink sports daily. Every match gets its own page with a condensed headline and a dateline, and every player gets a mark printed beside their name, the way the Monday ratings run in the Italian sports papers. The ground is pink newsprint; the content sits in white boxes ruled in ink; one red does the shouting. It is read on a phone, often outdoors, so the system is high-contrast, large-type and large-target by default.

Density is that of a newspaper column: one narrow column (672px max) centred on wide screens, full-bleed with a 16px gutter on the phone. Hierarchy comes from type weight and ink rules, never from shadows, tints or rounded cards. The one authored motion is the stamp: signing up for a match lands like a rubber stamp on the page.

The world deliberately refuses the category default of a sports app: white rounded cards on grey, a green accent, a grey tab bar. Player cards (`src/components/player-card.tsx`) are an out-of-system exception and keep their own pre-existing design; see Components.

**Key Characteristics:**
- Pink newsprint ground, white boxed panels, ink rules (1px hairline, 2px rule, 3px masthead rule).
- One red for the primary action, the current tab and live state.
- Barlow for text; Barlow Condensed in heavy uppercase for headlines, section titles, tab labels and every mark.
- Square corners everywhere in the system.
- Flat: no shadows; depth is ink rules and the paper/sheet contrast.
- Numbers as marks: heavy condensed tabular numerals; win chance as one ruled bar split at the exact percentage.

## Colors

A warm two-tone print palette: pink paper and near-black ink, with one newspaper red.

### Primary
- **Pagella Red** (`red`): the primary action (the "I'm in" stamp, primary buttons), the current tab's 4px marker, the "You're in" stamp, focus outlines, text selection, caret and native form accents. Also carries destructive text actions and error text.
- **Pressed Red** (`red-deep`): hover state of red buttons and red text actions only.

### Secondary
- **Pitch Ledger Green** (`ok`): the "You're in" confirmation on the fixture board. Used for that confirmation only; it is not an accent.

### Neutral
- **Pink Newsprint** (`paper`): the page ground, the masthead, the wide-screen tab row, text on ink (selected choices, inactive tab labels at 70%), and the hover tint of fixture rows. Also the browser `theme-color`.
- **Pressed Pink** (`paper-deep`): hover fill on white controls and the highlight row for "me" in the ratings table.
- **Sheet White** (`sheet`): every boxed panel, input, secondary button and unselected choice.
- **Ink** (`ink`): all body text, every border and rule, selected choices, the phone tab bar, the "You" chip.
- **Faded Ink** (`ink-soft`): datelines, secondary lines, quiet actions, inactive wide-screen tabs, the dashed border of empty states, the scrollbar thumb.
- **Pale Ink** (`ink-faint`): input placeholders, on white only.
- **Hairline** (`rule`, ink at 20%): 1px dividers between rows inside a panel (fixture rows, ratings rows, form-choice cells).

### Named Rules
**The One Red Rule.** Red marks what to press, where you are, and what is live. It never fills a panel, a heading or a decorative band. If a screen has two red buttons, one of them is wrong.

**The Paper and Sheet Rule.** Content that can be read or acted on sits on a white sheet with a 2px ink border; the pink paper is the space between. Never put a white surface on paper without its ink rule.

## Typography

**Display Font:** Barlow Condensed (weights 600, 700, 800 via next/font, variable `--font-barlow-condensed`), falling back to Barlow, then system-ui.
**Body Font:** Barlow (weights 400, 500, 600, 700 via next/font, variable `--font-barlow`), falling back to system-ui.

**Character:** A sports-desk pairing from one family: the condensed cut set in 800 uppercase is the paper's headline voice and its numerals; the regular cut is the reporting underneath. Same skeleton, so the two never fight.

### Hierarchy
- **Masthead** (800, 1.75rem, line-height 1, tight tracking, uppercase): the group name at the top of every group page, sitting on a 3px ink rule.
- **Display** (800, 2.5rem, line-height 0.95, tight tracking, uppercase, balanced wrap): the page headline (`Headline`), written as words: "Four in, six spots left", "The ratings".
- **Title** (800, 1.25rem, wide tracking, uppercase): section titles on a 2px ink rule (`SectionTitle`), empty-state titles, team names, the primary button label.
- **Mark** (800, tabular numerals, line-height 1; 3.75rem / 1.875rem / 1.25rem): every number that judges: overall, win %, strength, sign-up count (`Mark`, fixtures count at 1.5rem).
- **Body** (400 to 600, 1rem, line-height 1.45): names (600), datelines (500, `ink-soft`), reporting copy.
- **Label** (700, 0.875rem, wide tracking, uppercase, condensed): tab labels and table headers.
- **Small** (600, 0.875rem; 0.75rem for meta lines): row meta, inline actions, errors.

### Named Rules
**The Condensed Caps Rule.** Barlow Condensed appears only in heavy uppercase (headlines, section titles, labels) or as numerals. Running text is always Barlow, never condensed.

**The Mark Rule.** Any number a player is judged by is a `Mark`: condensed 800, tabular, set flush right in tables. Never a pill, a badge or a coloured chip.

## Layout

One column, max 672px, centred (`Page`), with a 16px side gutter on the phone and 24px from 640px up; page body pads 24px top and bottom. The masthead repeats the same column inside a full-width paper band.

Vertical rhythm is set by section breaks: each `SectionTitle` opens with 40px above, a 2px ink rule, 8px to the title, 12px below. Headlines are followed by their dateline at 8px.

Touch targets: 48px minimum for buttons, inputs and choices; 40px for small inline actions and back links; 64px for list rows, form-of-the-day cells and phone tabs; 56px for the "I'm in" stamp.

Navigation responds at 768px: below it, the tab bar is fixed to the bottom in ink with safe-area padding; from 768px up, it becomes a static row under the masthead on paper with a 2px ink bottom rule. Fixture rows use a fixed three-column grid (when, count, chevron); the form-of-the-day picker is a five-column grid inside one ink box.

## Elevation & Depth

The system is flat. There are no box-shadows anywhere in it. Depth is printed: the paper/sheet contrast separates content from ground, 2px ink borders box it, 1px hairlines divide inside a box, and 3px/4px rules mark the masthead and the current tab. State is shown by fill (paper-deep on hover, ink when selected), not by lift.

### Named Rules
**The Printed Depth Rule.** If something needs to stand out, give it an ink rule or an ink fill. Never a shadow, a blur or a glow.

## Shapes

Square corners throughout (0px). Borders are the form language: 2px solid ink for panels, controls and the win bar; 2px dashed `ink-soft` for empty states; 1px `rule` hairlines between rows and cells; a 3px ink rule under the masthead; a 4px red bar on the current tab (top edge on the phone, bottom edge on wide screens).

The only tilt is the stamp: the unsigned "I'm in" button sits rotated -1deg and straightens on press. Circles appear only on the pitch in the line-up (centre circle, player photo tokens), which is a drawn pitch, not a panel.

## Components

### Buttons
Blunt and printed: rectangles with a 2px ink border, no radius, 150ms colour transitions, 45% opacity when disabled.
- **Primary** (`button.primary`): red fill, white condensed 800 uppercase label at 1.25rem, 48px tall, 20px side padding; hover to `red-deep`. One per screen.
- **Stamp** (the "I'm in" sign-up): primary at 56px, full width, 1.5rem label, rotated -1deg; on press it rotates to 0 and scales to 0.98.
- **Secondary** (`button.secondary`): white with ink border and ink 600 label; hover fills `paper-deep`.
- **Small** (`button.small`): the secondary look at 40px and 0.875rem, for actions inside lists.
- **Danger / Quiet** (`button.danger`, `button.quiet`): underlined text actions in red (2px underline) or `ink-soft` (1px underline), offset 3px.

### Choices
- **Style** (`choice(selected)`): full-width white rows with a 2px ink border, 48px tall, left-aligned 500 text; hover `paper-deep`.
- **State:** selected inverts to ink fill with paper text. No checkmarks, no colour.
- **Form of the day:** five cells in one ink box divided by hairlines, each a `FormIcon` arrow (down for a bad day, up for on fire) over its label; the selected cell is ink.

### Cards / Containers
- **Panel** (`Panel`): white sheet, 2px ink border, square corners, no shadow. Internal padding is set by content (16px for the win bar, 16px x 8px for rows).
- **Empty** (`Empty`): 2px dashed `ink-soft` box, 20px x 24px padding, condensed title, `ink-soft` body that says what happens next.

### Inputs / Fields
- **Style** (`input`): white, 2px ink border, 48px tall, 16px side padding, 1rem text, `ink-faint` placeholder, red caret.
- **Focus:** the browser outline is replaced by a 3px red outline on `:focus-visible` (offset 2px globally).
- **Error:** `ErrorText`, 0.875rem 600 red, announced as an alert.

### Navigation
- **Masthead** (`Masthead`): group name in masthead type on paper, optional `ink-soft` link right, 3px ink rule below.
- **Tab bar** (`TabBar`): on the phone, a fixed ink bar of 64px cells, icon over a condensed bold uppercase label; inactive labels paper at 70%, current tab white with a 4px red top bar. From 768px, a row of 44px tabs on paper, `ink-soft` inactive, ink current with a 4px red bottom bar.
- **Back link** (`BackLink`): chevron plus 0.875rem 600 `ink-soft` text, ink on hover.

### Headline and Dateline (signature)
`Headline` in display type, followed by `Dateline` (1rem, 500, `ink-soft`): when, where, how many. Counts in headlines are spelled as words (`inWords`).

### The ratings table (signature)
The pagelle: a white ink-boxed table with condensed uppercase headers on a 2px ink rule, rows split by hairlines, rank in `ink-soft` tabular, name in 600 with a meta line, and the `Mark` flush right at 1.875rem. The viewer's own row fills `paper-deep` and carries an ink "You" chip.

### Fixture board (signature)
`Fixtures`: one ink-boxed list, 64px rows, date and format on the left, the sign-up count as a condensed mark ("7/10") with "in" or a green "You're in" under it, chevron right; hover tints the row paper.

### Win bar (signature)
`WinBar`: both percentages as small marks over a 12px bar boxed in 2px ink, filled ink up to team A's exact percentage and white after it.

### Line-up
`Lineup`: the win bar in a panel, condensed team headers with strength as a mark, and a drawn green pitch (ink-bordered) with white 30% markings. Player tokens are photo circles ringed in their card tier colour, an ink tag with overall and form arrow, and a short name.

### Motion
One authored moment: `stamp-in` (200ms, `cubic-bezier(0.16, 1, 0.3, 1)`, from scale 1.35 rotated -4deg and transparent to rest) plays when "You're in" appears. Disabled under `prefers-reduced-motion`. Everything else is a 150ms colour transition.

### Out-of-system exception: Player cards
`PlayerCard` (`src/components/player-card.tsx`) predates this world and is deliberately left as it is: tall tiles with rounded corners, bronze/silver/gold diagonal gradients, a stripe across the middle and a drop shadow. It is placed inside the system (Home, Players) but does not belong to it. Do not borrow its radius, gradients or shadow for new components, and do not restyle it to the system without an explicit decision.

## Do's and Don'ts

### Do:
- **Do** box readable content in a white sheet with a 2px ink border on the pink paper.
- **Do** keep red to the primary action, the current tab, live state, focus and errors; hover red to `red-deep`.
- **Do** set every judged number as a condensed 800 tabular mark.
- **Do** open sections with an ink rule and a condensed uppercase title (`SectionTitle`).
- **Do** write headline counts as words ("Seven in, three spots left") with the facts in the dateline.
- **Do** show selection by inverting to ink fill with paper text.
- **Do** keep targets at 48px or more (64px for rows and tabs) and the column at 672px.

### Don't:
- **Don't** add shadows, blurs or glows to system components; depth is ink rules and fills.
- **Don't** round corners on panels, buttons, inputs, choices or tables.
- **Don't** use red as a fill for anything other than the primary action, or as a decorative band.
- **Don't** set running text in Barlow Condensed, or condensed text in lowercase.
- **Don't** introduce a green accent, a grey tab bar or white rounded cards on grey: the category default this world replaces.
- **Don't** copy the player card's gradients, radius or shadow into new components.
