# Team Builder

A web app that estimates each player's football level and builds balanced teams for 5-a-side and 7-a-side matches.

Work in progress.

## Stack

Next.js (App Router, TypeScript), Tailwind CSS, Supabase, Vercel.

## Commands

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # engine tests
npm run build
```

The rating and balancing engine lives in `src/lib/engine/` as pure functions with its own tests. The `sim/` folder holds the simulator used to choose the rating method.
