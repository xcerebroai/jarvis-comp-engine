# Jarvis Comp Engine

An **autopilot real estate acquisition analyst** for single-family investors.

**Main workflow:** enter a property address and repair info → get a conservative
ARV, a repair estimate, graded comps, and offer options across four strategies.

```
Address + repairs  ─▶  conservative ARV + repairs + graded comps + offers
```

## Live Demo

**https://xcerebroai.github.io/jarvis-comp-engine/**

- The GitHub Pages version is a **static public demo** — it runs entirely in
  your browser.
- It performs **mock analysis only**; every number is simulated and clearly
  marked "testing only."
- **Real property data requires licensed providers and a backend/server
  deployment** (GitHub Pages is static hosting and cannot run the API route or
  hold secrets).
- **No scraping is performed**, in the demo or anywhere else.

## Supported strategies

- **Wholesale**
- **Fix and flip**
- **Subject-to**
- **Creative finance**

## Disclaimers

- This is **not a Zestimate clone**.
- This is **not financial, legal, tax, or investment advice**.
- **Mock data mode is for testing only** — its numbers are simulated.
- **Real offers require verified data and investor due diligence.**
- The app **does not scrape** Zillow, Redfin, Realtor, Trulia, Opendoor, or MLS
  websites, and uses no browser automation against restricted sites.
- **Automated data requires legal/licensed provider access.**

## Features

- Address + repair intake that runs the full analysis on one click.
- **Conservative ARV engine** — leans below comp median; external AVMs are
  supporting context only and never set the final number.
- **Repair estimator**, **comp grading**, **four offer strategies**, **risk,
  confidence, and a plain-English deal memo** with copy-to-clipboard.
- **Provider status system** — mock vs. real data is always obvious, with a
  per-analysis source audit.
- **Manual comps fallback** and **saved analysis history** (localStorage).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- TypeScript · Tailwind CSS v4 · Vitest · ESLint
- Import alias `@/*` → `src/*`

## Local setup

```bash
git clone https://github.com/xcerebroai/jarvis-comp-engine.git
cd jarvis-comp-engine
npm install
cp .env.example .env.local   # optional — mock mode works with no keys
npm run dev                  # http://localhost:3000
```

Provider configuration status is visible at `/settings/providers`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in only what you have. `.env.example`
ships with **blank** placeholders and must stay that way.

```bash
JARVIS_USE_MOCK_PROVIDER=true   # true = mock (default); false = real providers
ATTOM_API_KEY=                  # subject facts + AVM
MLS_API_KEY=                    # comparable sales (MLS/RESO)
RENT_PROVIDER_API_KEY=          # rent estimates
COUNTY_PROVIDER_API_KEY=        # county / public records
# Optional future base URLs — no real call runs until a provider's base URL is set:
ATTOM_BASE_URL=
MLS_BASE_URL=
RENT_PROVIDER_BASE_URL=
COUNTY_PROVIDER_BASE_URL=
# GitHub Pages static export (client-only demo, mock mode):
NEXT_PUBLIC_GITHUB_PAGES=true
```

Never commit real keys, and **never put an API key in a `NEXT_PUBLIC_` variable**
(those are inlined into the browser bundle).

## Mock mode vs. real provider mode

| Mode | Config | Behavior |
| --- | --- | --- |
| **Mock** (default) | `JARVIS_USE_MOCK_PROVIDER=true` | Deterministic simulated data, no network calls, loud "Mock Data" warnings. |
| **Real** | `JARVIS_USE_MOCK_PROVIDER=false` + ≥1 provider configured | Uses configured licensed providers; unconfigured slots stay inert (never a silent mock fallback). |
| **Invalid** | `JARVIS_USE_MOCK_PROVIDER=false` + nothing configured | Clean error: *"No real data provider is configured…"* |
| **GitHub Pages demo** | `NEXT_PUBLIC_GITHUB_PAGES=true` (static export) | No server/API route — the browser runs the same pure pipeline against the mock provider only. |

## Running tests & builds

```bash
npm test            # vitest run
npm run lint        # eslint
npx tsc --noEmit    # typecheck
npm run build       # production build (server)
NEXT_PUBLIC_GITHUB_PAGES=true JARVIS_USE_MOCK_PROVIDER=true npm run build  # static export → out/
```

## Docs

- Provider setup & modes: [`docs/providers/PROVIDER_SETUP.md`](docs/providers/PROVIDER_SETUP.md)
- Data sourcing policy: [`docs/legal/DATA_SOURCING.md`](docs/legal/DATA_SOURCING.md)

## Roadmap

- [ ] Implement licensed provider adapters (ATTOM, MLS/RESO, rent, county),
      verified against official docs, behind their `isConfigured()` gates.
- [ ] Richer manual-comp entry, PDF deal-memo export, market-specific tuning.

Not planned: any scraping of restricted sites, or treating an external AVM as the
final valuation.

## License

**License not yet selected. All rights reserved until a license is explicitly
added.**
