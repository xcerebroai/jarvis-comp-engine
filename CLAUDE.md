@AGENTS.md

# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo. The line above
imports `AGENTS.md`, which carries framework-specific rules for this version
of Next.js — heed it.

## What this is

**Jarvis Comp Engine** — a private real estate comping and offer-analysis app
for single-family home deals. It helps a real estate investor:

1. Analyze single-family deals
2. Calculate a **conservative** ARV (After-Repair Value)
3. Estimate repairs
4. Grade comparable sales
5. Recommend offers across four strategies: **wholesale**, **fix & flip**,
   **creative finance**, and **subject-to**

Input comes from pasted property info (Zillow, Redfin, Realtor, county records,
seller notes, MLS notes, repair notes, inspection notes). It is a private,
internal tool — not a consumer product.

## Non-negotiable rules

- **No illegal or ToS-breaking scraping.** Never write code that automatically
  crawls or hits the private APIs of Zillow/Redfin/Realtor/etc. Manual paste
  first; licensed API adapters later. See `docs/legal/DATA_SOURCING.md` — treat
  it as binding.
- **Be conservative by default.** ARV leans low, repairs round up, offers keep
  a real profit floor. When in doubt, protect the buyer. Defaults live in
  `src/config/`.
- **Keep domain logic pure.** Everything in `src/lib/domain/**` must be pure
  functions (no I/O, no fetch, no `Date.now()` baked into logic) so it stays
  unit-testable and deterministic.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- ESLint
- Import alias: `@/*` → `src/*`

## Project structure

```
src/
  app/                     # Next.js routes, layouts, pages
  components/              # React UI components
  config/                  # tunable rules & safety margins (offerRules.ts)
  lib/
    domain/                # PURE business logic — no I/O
      arv/                 # conservative ARV estimation
      repairs/             # repair cost estimation
      comps/               # comp grading (A–F)
      offers/              # per-strategy offer recommendations
    ingestion/             # the ONLY place external data enters
      adapters/            # manual-paste now; licensed API adapters later
      parsers/             # normalize pasted Zillow/Redfin/MLS/county/notes text
    types/                 # shared domain types (single source of truth)
docs/
  legal/                   # data sourcing & compliance policy
```

### The two layers, and why they're split

- **Ingestion** turns messy external input into normalized `Subject`/`Comp`
  objects. It is the compliance boundary (manual vs. licensed).
- **Domain** takes those normalized objects and does math. It never knows or
  cares where the data came from.

Data flow: `paste → adapter → parser → normalized types → domain → offers → UI`.

## Commands

```bash
npm run dev     # local dev server
npm run build   # production build
npm run lint    # eslint
npm start       # run production build
```

## Conventions

- Add new data sources as `IngestionAdapter`s in `src/lib/ingestion/adapters`.
  A licensed automated adapter (`automated: true`) requires a documented
  license in `docs/legal/DATA_SOURCING.md` before it merges.
- Extend shared shapes in `src/lib/types` rather than defining ad-hoc types.
- Tunable numbers (ARV %, fees, cost assumptions, safety margins) belong in
  `src/config`, never hard-coded in domain functions.
- Prefer small pure functions with explicit inputs/outputs; they're easy to
  test and easy for the next session to reason about.

## Status

Skeleton stage: types, config, and module signatures exist; the estimation and
offer math are stubbed with `TODO`s and return placeholder values.
