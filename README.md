# Jarvis Comp Engine

An **autopilot real estate acquisition analyst** for single-family investors.

**Main workflow:** enter a property address and repair info → get a conservative
ARV, a repair estimate, graded comps, and offer options across four strategies.

```
Address + repairs  ─▶  conservative ARV + repairs + graded comps + offers
```

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
- **Repair estimator** — itemized or headline rehab level, rounds up, flags
  vague scope.
- **Comp grading** with qualified/rejected reasoning.
- **Four offer strategies** priced off the conservative ARV with a profit floor.
- **Risk, confidence, and a plain-English deal memo** with copy-to-clipboard.
- **Provider status system** — mock vs. real data is always obvious, with a
  per-analysis source audit.
- **Manual comps fallback** when no comps provider is configured.
- **Saved analysis history** (localStorage).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Vitest for unit tests
- ESLint
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

# Optional (future) — a provider is "configured" once its key is set, but no
# real call runs until its base URL is also set:
ATTOM_BASE_URL=
MLS_BASE_URL=
RENT_PROVIDER_BASE_URL=
COUNTY_PROVIDER_BASE_URL=
```

Never commit real keys. Use `.env.local` (git-ignored).

## Mock mode vs. real provider mode

The resolver supports three explicit modes:

| Mode | Config | Behavior |
| --- | --- | --- |
| **Mock** (default) | `JARVIS_USE_MOCK_PROVIDER=true` | Deterministic simulated data, no network calls, loud "Mock Data" warnings everywhere. |
| **Real** | `JARVIS_USE_MOCK_PROVIDER=false` + ≥1 provider configured | Uses configured licensed providers. Unconfigured slots stay inert (never a silent mock fallback); missing optional data degrades with warnings. |
| **Invalid** | `JARVIS_USE_MOCK_PROVIDER=false` + nothing configured | Clean error: *"No real data provider is configured…"* |

The licensed adapters are currently **stubs** — they refuse to call an unknown
endpoint and require verifying request/response mappings against each provider's
official documentation before enabling.

## Running tests

```bash
npm test            # vitest run (one-shot)
npm run test:watch  # watch mode
npm run lint        # eslint
npx tsc --noEmit    # typecheck
npm run build       # production build
```

## Provider setup docs

See [`docs/providers/PROVIDER_SETUP.md`](docs/providers/PROVIDER_SETUP.md) for
provider modes, environment variables, what each provider supplies, and how to
implement a real adapter safely.

## Data sourcing policy

Data sourcing is governed by
[`docs/legal/DATA_SOURCING.md`](docs/legal/DATA_SOURCING.md). In short: **manual
paste first; licensed APIs later; never scraping.** No code may crawl or hit the
private APIs of Zillow/Redfin/Realtor/Trulia/Opendoor/MLS.

## Roadmap

- [ ] Implement licensed provider adapters (ATTOM, MLS/RESO, rent, county) behind
      their `isConfigured()` gates, verified against official docs.
- [ ] Richer manual-comp entry and editing.
- [ ] Export deal memo to PDF.
- [ ] Market-specific tuning of `src/config`.
- [ ] Persisted analysis history beyond localStorage.

Not planned: any scraping of restricted sites, or treating an external AVM as the
final valuation.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md). Work on
a branch and open a PR — no direct commits to `main`.

## License

**License not yet selected. All rights reserved until a license is explicitly
added.** See [`LICENSE`](LICENSE).
