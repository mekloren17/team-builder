# Team Builder

**Fair teams for weekly 5-a-side and 7-a-side football.** Players sign up for the next match, the app estimates each player's level, checks every possible split and proposes the most balanced teams, with the chance of winning shown for each side.

[![CI](https://github.com/mekloren17/team-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/mekloren17/team-builder/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)

**Live app:** [team-builder-phi-six.vercel.app](https://team-builder-phi-six.vercel.app). Groups are private, so you need an invite link to see one.

<!-- SCREENSHOTS -->

## The problem

In a group of about 50 friends, 10–14 show up for each match. Teams used to be picked by hand in the group chat: slow, often lopsided, and a source of arguments. Team Builder replaces the WhatsApp poll with a sign-up page and splits whoever is in into two even teams in seconds.

## What it does

- **Groups and invite links:** one account can join several groups, with a separate rating in each.
- **Player cards:** a two-minute questionnaire gives each player a starting overall and a card (pace, shooting, passing, dribbling, defending, physical; keeper skills for goalkeepers), previewed live while answering.
- **Match sign-ups:** "I'm in" plus a form-of-the-day score (1–5) that counts for that match only.
- **Team proposals:** the three best splits that differ from each other, more on demand, together/apart constraints, and manual moves with the win chance updated live.
- **Line-up:** both teams on a pitch, with the formation that leaves the fewest players out of position.
- **Roles and guests:** owner, admins and players, plus guests without an account.

## How it works

The core is a **pure TypeScript engine** ([`src/lib/engine/engine.ts`](src/lib/engine/engine.ts)) with no I/O, covered by unit tests:

1. **Starting overall:** a weighted score of experience, playing frequency and self-rated skills, adjusted for age.
2. **Balancing:** an exhaustive search over every split (1,716 for 7-a-side, about 15 ms). The main cost is the strength gap, with penalties for teams without a keeper, defender or attacker, and a small nudge towards new team-mates each week.
3. **Rating method chosen with data:** before building the ratings, I wrote a **Monte Carlo simulator** (30 groups × 200 matches, with a hidden true level for each player) to compare team Elo with different step sizes against full-history re-estimation (a ridge regression on goal difference). Full-history re-estimation came out best or near-best in every scenario:

| Method | Average gap between teams (lower is better) | Favourite wins |
| --- | --- | --- |
| Random teams | 5.90 | 71% |
| Questionnaire only | 2.82 | 61% |
| Team Elo, K=4 | 2.82 | 61% |
| **Full-history re-estimation** | **2.43** | **59%** |

Formulas, the full simulation results and the security model are in **[docs/how-it-works.md](docs/how-it-works.md)**.

## Architecture

```
Browser ──► Next.js 16 on Vercel (App Router, server components, server actions)
               │  imports
               ├──► src/lib/engine   pure functions: overall, balancing, ratings, positions
               │
               └──► Supabase         Postgres + Auth (Google sign-in) + Storage (photos)
                                     row level security on every table;
                                     all writes go through role-checking SQL functions
```

| Area | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Server rendering and server actions in one codebase |
| Styling | Tailwind CSS 4, own design system ([DESIGN.md](DESIGN.md)) | Readable outdoors on a phone: high contrast, large touch targets |
| Data and auth | Supabase (Postgres, RLS, Google OAuth) | Access control enforced in the database, not only in the UI |
| Hosting | Vercel, deployed on every push to `main` | |
| Quality | Node test runner for the engine, ESLint, GitHub Actions CI | |

## Project structure

```
src/
  app/                  pages and server actions (groups, matches, teams, profile, login)
  components/           player card, line-up, photo editor, shared UI
  lib/engine/           rating and balancing engine + tests
  lib/supabase/         server and browser clients
supabase/migrations/    database schema, RLS policies and SQL functions
sim/                    Monte Carlo simulator used to choose the rating method
docs/                   technical write-up and design exploration
```

## Run it locally

Requires Node 22.6 or later and a Supabase project.

```bash
npm install
cp .env.example .env.local     # add your Supabase URL and publishable key
npm run dev                    # http://localhost:3000
```

Apply the SQL files in `supabase/migrations/` to your project in order, and enable Google sign-in in Supabase Auth.

| Command | What it does |
| --- | --- |
| `npm test` | engine unit tests (about 0.3 s) |
| `npm run lint` | ESLint |
| `npm run build` | production build with type checking |
| `npm run sim` | full rating simulation (about 5 min) |

## Status and roadmap

Online and being tested with a real group of friends.

- [x] Groups, invites, questionnaire and player cards
- [x] Match sign-ups, team proposals, constraints and line-up
- [ ] Match results confirmed by the other team, and rating updates
- [ ] Shareable line-up image and installable app (PWA)
- [ ] Recalibrating the engine's parameters with real match data

## How it was built

I designed the product, the rating approach and the simulation study, made the decisions and tested the app with the group. The code was written with an AI coding assistant (Claude Code), which I directed step by step.

---

Lorenzo · [GitHub](https://github.com/mekloren17)
