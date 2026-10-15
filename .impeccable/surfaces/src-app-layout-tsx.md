---
version: 1
slug: "src-app-layout-tsx"
primary_target: "src/app/layout.tsx"
related_targets: []
---

## Scope

Whole app shell and every screen (home, sign-in, group, matches, match, teams, questionnaire, group settings, privacy). Mode: Operate. Player cards are out of scope and keep their current design.

## Audience and job

Friends in one football group, on the phone (and admins on the computer): sign up for the next match with their form, check their card, see the teams. Success: the next match and my card are readable within a second, outdoors.

## Direction contract

THESIS: The group's own pink sports daily: every match gets its page and every player a mark. Refuses the category default of white cards, a green accent and a grey tab bar.

OWN-WORLD: Pink newsprint ground (#f7dde2) with white boxed panels ruled in ink (#1a1414); one red (#c8102e) for the primary action, the current tab and live state only. Barlow for text, Barlow Condensed in heavy caps for headlines and for every mark (overall, win %, score). Hairline and 2px ink rules instead of shadows; square corners.

STORY: The player sees which match is next and how many are in, says I'm in with today's form, sees their mark. Admins find their tools one step lower, never in the players' way.

FIRST VIEWPORT: Masthead (group name, ink rule). Condensed headline for the next match ("Seven in, three spots left"), dateline under it, the red I'm in stamp with the five form choices, then the player's mark box. Bottom tab bar in ink: Home, Matches, Players, Group.

FORM: Le pagelle, position 1 on the ordered list (picked by the user over the assigned table-football direction). seed:69be96ab14b210f2. Signature move: the pagelle table, players listed like the Monday ratings with their mark in heavy condensed numerals; win chance shown as a ruled bar split at the exact percentage.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
