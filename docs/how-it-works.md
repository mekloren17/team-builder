# How the engine works

The engine lives in [`src/lib/engine/engine.ts`](../src/lib/engine/engine.ts): pure TypeScript functions with no I/O, covered by tests in [`engine.test.ts`](../src/lib/engine/engine.test.ts). The web app reads data from Supabase, calls the engine, and saves the results. The same module also runs inside the offline simulator in [`sim/`](../sim).

## 1. Starting overall from the questionnaire

New players have no match history, so their first rating comes from a short questionnaire: `initialOverall(profile)`.

```
B = (0.45·E + 0.25·F + 0.30·A) · k_age      rounded, clamped to 40–92
```

| Term | Meaning | Values |
| --- | --- | --- |
| **E**, experience | highest level reached, adjusted by years played | never 30 · amateur 50 · youth academy 65 · semi-pro 80 · elite 92; then −10 for 0–2 years, −3 for 3–5, 0 for 6–10, +3 for 10+ |
| **F**, frequency | how often the player plays now | <1/month 35 · 1–3/month 55 · weekly 70 · 2+/week 85 |
| **A**, attributes | mean of six self-rated skills (1–5), each with a behaviour-anchored description | 30 + 15·(mean − 1) |
| **k_age** | age factor | ≤30 1.00 · 31–35 0.97 · 36–40 0.93 · 41–45 0.88 · >45 0.82 |

Goalkeepers answer six keeper-specific skills instead of the outfield ones. The card attributes move with the overall: `attr_i = OVR + 6·(a_i − mean)`, clamped to 30–99.

## 2. Match-day strength and win probability

- **Form of the day** (1–5, asked at sign-up for each match): `μ_eff = μ + 2·(form − 3)`, for that match only.
- **Team strength:** mean of the players' `μ_eff`.
- **Win probability:** `P(A) = 1 / (1 + 10^(−(s_A − s_B)/15))`.
- **Odd number of players:** one team gets an extra player, worth `extraPlayer` = 5 strength points (about 67% win chance at equal average level). This is an assumption to calibrate on real matches.

## 3. Team balancing

`balanceTeams(players, options)` checks **every** possible split: 126 for 5-a-side, 1,716 for 7-a-side, about 15 ms, using 32-bit bitmasks. It returns the **three best proposals that differ from each other** (each moves at least two players), each with its win probability. The cost of a split is:

- the difference in average strength (main term);
- +10 if there are two or more keepers and one team has none;
- +1.5 for each team with no defender or no attacker among its preferences;
- +0.2 for each pair of team-mates who were together in the previous match (variety);
- hard constraints set by an admin: `together` / `apart`.

`assignPositions(team, format)` then picks the formation (1-2-2 or 1-1-2-1 for 5-a-side, 1-3-2-1 or 1-2-3-1 for 7-a-side) that leaves the fewest players out of position.

## 4. Choosing the rating method with a simulation

Results in small-sided football are noisy: one player is a fifth or a seventh of the team, and goals carry a lot of luck. Before building the rating system, I wrote a simulator ([`sim/simulate.ts`](../sim/simulate.ts)) to compare methods. It creates groups of players with a hidden "true" level. The app only sees their questionnaire (which tends to overrate) and match scores, and goals follow the true level of the day plus Poisson noise.

**Setup:** 30 simulated groups of 50 players, 200 matches each (about 46 matches per player).

### How balanced are the teams?

Average gap in true level between the two teams, matches 121–200 (lower is better):

| Method | Gap | Favourite wins |
| --- | --- | --- |
| Random teams | 5.90 | 71% |
| Questionnaire only (never updated) | 2.82 | 61% |
| Team Elo, K=4 (original spec) | 2.82 | 61% |
| Team Elo, K=2 | 2.45 | 59% |
| **Full-history re-estimation (chosen)** | **2.43** | **59%** |
| True level (theoretical limit) | 0.10 | 50% |

### How close do ratings get to the true level?

Mean distance between rating and true level, by matches played:

| Matches played | 0 | 15 | 40 | 60 |
| --- | --- | --- | --- | --- |
| Team Elo, K=4 | 4.43 | 4.94 | 4.62 | 4.55 |
| Team Elo, K=2 | 4.43 | 4.19 | 3.67 | 3.42 |
| Full-history re-estimation | 4.43 | 4.19 | 3.75 | 3.34 |

### Findings

1. **Most of the value comes from balancing with the questionnaire:** it halves the gap compared with random teams.
2. **Learning from results is slow**, because one score says little about any single player.
3. **The Elo update in the original spec (K=4) adds almost as much noise as it removes.**
4. **The best Elo step size depends on how reliable the questionnaire is**, which is unknown in advance. In a second scenario with a much less reliable questionnaire (starting error 8.4 instead of 4.4), K=4 beats K=2:

   | Gap, matches 121–200, unreliable questionnaire | |
   | --- | --- |
   | Questionnaire only | 4.92 |
   | Team Elo, K=4 | 3.80 |
   | Team Elo, K=2 | 4.07 |
   | Full-history re-estimation | 3.89 |

5. **Decision: full-history re-estimation** (`estimateRatings(prior, history)`): a ridge regression on goal difference, with each player's questionnaire overall as the prior. It is close to the best method in both scenarios because it weighs questionnaire and results on its own, and a corrected result just means re-running it. It costs about 1 ms per group (a 50×50 system).
6. Even with perfect teams, about 16% of matches end with a margin of 5+ goals (27% with random teams): that is luck, not a balancing failure.

Run it yourself with `npm run sim` (about 5 minutes) and `npm run sim:extra` (about 3 minutes). Results are saved in [`sim/results.json`](../sim/results.json) and [`sim/extra.json`](../sim/extra.json).

## 5. Data model and security

Seven Postgres tables (`profiles`, `groups`, `players`, `matches`, `match_players`, `team_proposals`, `pair_constraints`), defined in [`supabase/migrations/`](../supabase/migrations).

- **Row level security on every table.** Players can read only the groups they belong to, and only their own account profile (where the email is stored).
- **No direct writes from the client.** Every change goes through `security definer` Postgres functions (`create_group`, `join_group`, `save_my_profile`, `save_teams`, …). They check who is calling and their role (owner, admin, player) before touching anything, so a client cannot change ratings, roles or teams by itself.
- **Invites** use random 12-character codes; knowing the code is what grants access to a group.
- **Photos** are stored in a bucket under random file names. Users can upload only to their own folder, and only owners or admins can upload guest photos.
- The Supabase URL and publishable key in the browser are public by design: all access control lives in the database.
