# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Players**: a group of about 50 friends (10–14 per match) who play 5-a-side and 7-a-side football. They open the app from a WhatsApp link, mostly on the phone, to sign up for the next match with their form of the day, check their player card and see the teams.
- **Admins and owner** (Lorenzo first): organise matches, add guests, generate and adjust the teams. They use both the phone and the computer.
- Users are not technical. Many will open the app only a few times a month.

## Product Purpose

Make teams fair. Each player gets an overall estimated from a questionnaire and then from match results; the app splits the players who signed up into balanced teams and shows them as a line-up of cards. Success: matches that stay close, teams generated in a minute, and friends who actually sign up through the app instead of the WhatsApp poll.

## Positioning

A private tool for one group of friends (multi-group by design), not a public league or social network. The mechanism a generic team picker cannot copy: ratings learned from this group's own match history, plus every possible split checked for balance, with the win chance shown.

## Operating Context

- Invite links shared on WhatsApp; sign-in with Google.
- The moment that matters most: the days before a match (sign up, form of the day) and the hour before kick-off (teams, line-up, sharing it in the chat). Sometimes read outdoors, on the way to or at the pitch.
- Ratings change only after a confirmed result (step 5 of the plan, not built yet).

## Capabilities and Constraints

- Built: groups, invite links, questionnaire with live card preview, card photos, guests, admin roles, matches with "I'm in" and form 1–5, together/apart constraints, three team proposals plus more on demand, manual moves with live win chance, line-up on a pitch.
- Not built yet: results and rating updates, shareable line-up image, installable app (PWA). Email sign-in is hidden until a custom SMTP is set up.
- App language: English. Owner's working language: Italian.
- Stack: Next.js (App Router) + Tailwind CSS + Supabase, hosted on Vercel.

## Brand Commitments

- Name: "Team Builder" (provisional).
- No "FUT", no EA/FIFA logos, graphics or card designs: the player cards have an original design, and they stay as they are for now.
- Voice: friendly and playful, like a message in the group chat; never corporate. Copy stays in Lorenzo's voice: he reviews wording changes.

## Evidence on Hand

- Real group data in Supabase (players, cards, guests, test matches). No testimonials, stats or logos exist; do not invent any.

## Product Principles

1. The next match and my own card come first: everything else is one tap away.
2. Fair over fancy: the numbers (overall, win chance) must always be readable and honest.
3. Friendly, never corporate: it should feel like the group, not like an admin panel.
4. Readable anywhere: large enough type and strong contrast for a phone in daylight.
5. Admin power stays out of the players' way.

## Accessibility & Inclusion

Readable outdoors on a phone: generous type sizes, strong contrast, large touch targets.
